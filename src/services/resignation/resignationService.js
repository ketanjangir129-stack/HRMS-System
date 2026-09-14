import {
  ref,
  get,
  set,
  push,
  update,
} from "firebase/database";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage } from "../../firebase/firebase";

import {
  RESIGNATION_STATUS,
} from "../../utils/resignation/resignationConstants";

import {
  getEmptyEquipment,
  toDateKey,
} from "../../utils/resignation/resignationUtils";

import {
  notifyResignationRaised,
  notifyManagerApproved,
  notifyResignationRejected,
  notifyEquipmentRequested,
  notifyEquipmentSubmitted,
  notifyFnFReady,
  notifyFnFUnderReview,
  notifyFinanceApprovalPending,
  notifyExitCompleted,
} from "../notifications/resignationNotificationService";

import {
  sendEquipmentSubmissionEmail,
  sendNocEmail,
} from "../email/resignationEmailService";

/*
|--------------------------------------------------------------------------
| Where A Resignation Lives
|--------------------------------------------------------------------------
|   companies/{companyCode}/resignations/{resignationId}
|
| Flat, unlike the leave tree beside it, and deliberately so. Leave requests
| are bucketed by year and month because a company raises thousands of them
| and nothing ever wants all of them at once. Resignations are the opposite:
| a company of five hundred people produces a few dozen a year, and every
| screen in this module - the queue, the history, an employee's own status -
| starts by asking for the whole list and narrowing it in memory.
|
| Bucketing them would buy nothing and would cost what it costs leave: a
| record that can only be found if you already know which month it was filed
| in. A resignation is looked up by id from an email link and from three
| different routes, so being able to address it directly matters more here
| than it does there.
|
| One node holds the whole journey - the request, both approvals, the
| equipment declaration, the settlement and the exit. They are stages of one
| thing, they are always read together, and splitting them across branches
| would make "what is the state of this exit" a four way join.
|--------------------------------------------------------------------------
*/

const resignationsPath = (companyCode) =>
  `companies/${companyCode}/resignations`;

const resignationPath = (companyCode, resignationId) =>
  `${resignationsPath(companyCode)}/${resignationId}`;

/*
| Built from a push key, so two people resigning in the same millisecond
| cannot collide, and so the ids sort by the time they were created.
*/

const generateResignationId = (companyCode) => {

  const key = push(ref(db, resignationsPath(companyCode))).key;

  return `RES_${key}`;

};

/*
|--------------------------------------------------------------------------
| The Guarded Write
|--------------------------------------------------------------------------
| Every transition in this file goes through here.
|
| It re-reads the record and checks it is still in the state the caller
| believed before it writes anything. That is what stops the same resignation
| being approved twice by two people with the screen open, and what stops a
| stale tab rejecting something that has already moved on to the settlement.
|
| A plain read-then-update rather than a transaction, for exactly the reason
| `leaveService` gives: nothing subscribes to this tree, so a transaction
| runs its first callback against an empty local cache, and refusing that
| null would abort every write before it reached the server.
|
| The caller is handed `{ success, message }` on a refusal rather than an
| exception, because "somebody got there first" is a normal outcome of two
| people doing their job, not a failure.
|--------------------------------------------------------------------------
*/

const transition = async (
  companyCode,
  resignationId,
  expectedStatuses,
  buildUpdates
) => {

  if (!companyCode || !resignationId) {
    return {
      success: false,
      message: "This resignation could not be identified.",
    };
  }

  const recordRef = ref(db, resignationPath(companyCode, resignationId));

  const snapshot = await get(recordRef);

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "This resignation no longer exists.",
    };
  }

  const current = snapshot.val();

  if (!expectedStatuses.includes(current.status)) {
    return {
      success: false,
      message: `This resignation has already moved on — it is now "${current.status}".`,
      resignation: current,
    };
  }

  const updates = buildUpdates(current);

  await update(recordRef, updates);

  return {
    success: true,
    resignation: { ...current, ...updates, resignationId },
  };

};

/*
| One entry in the trail every record carries. The stamp is the same shape
| wherever it is written, so the detail screen can render "who, when, and
| what they said" without knowing which step it is looking at.
*/

const stamp = (actor, remarks = "") => ({
  by: actor?.employeeId || actor?.name || "",
  byName: actor?.name || actor?.employeeId || "",
  at: Date.now(),
  remarks: remarks || "",
});

/*
| Notifications and emails are told after the write has landed, and a failure
| in either is logged rather than thrown.
|
| The same rule `leaveService` follows: the approval is the thing that
| mattered, it has already succeeded, and a mail server having a bad
| afternoon must not read to the user as their decision having failed. It
| also cannot be taken back - so it is never sent before the write it is
| announcing.
*/

const announce = async (label, work) => {

  try {

    return await work();

  } catch (error) {

    console.error(`${label} failed:`, error);

    return null;

  }

};

/*
|--------------------------------------------------------------------------
| The Optional Attachment
|--------------------------------------------------------------------------
| Stored under the resignation rather than under the employee, so it goes
| when the record goes and cannot outlive what it was evidence for.
|
| The original extension is kept: the file is opened by whoever reviews it,
| and a PDF served as a name with no suffix is one the browser will not
| preview.
|--------------------------------------------------------------------------
*/

export const uploadResignationDocument = async (
  companyCode,
  resignationId,
  file
) => {

  const extension =
    (file?.name?.split(".").pop() || "pdf").toLowerCase();

  const fileRef = storageRef(
    storage,
    `companies/${companyCode}/resignations/${resignationId}/document.${extension}`
  );

  await uploadBytes(fileRef, file, { contentType: file.type });

  return await getDownloadURL(fileRef);

};

/*
|--------------------------------------------------------------------------
| Raise A Resignation
|--------------------------------------------------------------------------
| The employee snapshot is written onto the record rather than only the id -
| see `toEmployeeSnapshot` for why a record about somebody who has left
| cannot rely on the directory still describing them.
|
| The document is uploaded after the record exists, because the upload path
| contains the id. If the upload then fails the resignation still stands with
| no attachment, which is the right way round: the attachment is optional and
| losing a filed resignation because a file did not upload would not be.
|--------------------------------------------------------------------------
*/

export const createResignation = async (
  companyCode,
  { employee, reasonCategory, reason, lastWorkingDay, noticePeriodDays, document }
) => {

  try {

    if (!companyCode || !employee?.employeeId) {
      return {
        success: false,
        message: "An employee is required to raise a resignation.",
      };
    }

    /*
    | Refused here as well as on the profile button. Two tabs, or a stale
    | one, could otherwise file a second resignation while the first is
    | still moving, and an employee with two live exits is a state no screen
    | in this module knows how to show.
    */
    const existing = await getEmployeeResignations(
      companyCode,
      employee.employeeId
    );

    const active = existing.find(
      (item) =>
        item.status !== RESIGNATION_STATUS.EXITED &&
        item.status !== RESIGNATION_STATUS.MANAGER_REJECTED &&
        item.status !== RESIGNATION_STATUS.HR_REJECTED
    );

    if (active) {
      return {
        success: false,
        message: "You already have a resignation in progress.",
        resignation: active,
      };
    }

    const resignationId = generateResignationId(companyCode);

    const raisedAt = Date.now();

    const record = {

      resignationId,

      /* The employee, snapshotted. */
      ...employee,

      reasonCategory: reasonCategory || "",
      reason: reason || "",

      /* What the employee asked for. HR may move it on approval. */
      requestedLastWorkingDay: lastWorkingDay,

      /* What was agreed. Empty until HR approves, and it is this one the
         settlement is priced against. */
      lastWorkingDay: "",

      noticePeriodDays: Number(noticePeriodDays) || 0,

      documentUrl: "",

      status: RESIGNATION_STATUS.MANAGER_PENDING,

      raisedAt,
      raisedOn: toDateKey(new Date(raisedAt)),

      /* Every stage's stamp, filled in as the record moves. */
      managerReview: null,
      hrReview: null,
      equipment: null,
      equipmentSubmittedAt: null,
      fnf: null,
      fnfReview: null,
      financeApproval: null,
      exitedAt: null,
      nocIssuedAt: null,

    };

    await set(
      ref(db, resignationPath(companyCode, resignationId)),
      record
    );

    if (document) {

      const documentUrl = await announce(
        "Resignation document upload",
        () => uploadResignationDocument(companyCode, resignationId, document)
      );

      if (documentUrl) {

        await update(
          ref(db, resignationPath(companyCode, resignationId)),
          { documentUrl }
        );

        record.documentUrl = documentUrl;

      }

    }

    await announce(
      "Resignation notification",
      () => notifyResignationRaised(companyCode, record)
    );

    return {
      success: true,
      resignationId,
      resignation: record,
    };

  } catch (error) {

    console.error("Create Resignation Error:", error);

    throw error;

  }

};

/*
|--------------------------------------------------------------------------
| Reading
|--------------------------------------------------------------------------
| The whole list, as an array. Callers narrow it themselves through
| `filterVisibleResignations`, which is the same pure check the service
| guards use - so what a queue shows and what a write allows can never
| disagree.
|--------------------------------------------------------------------------
*/

export const getResignations = async (companyCode) => {

  try {

    if (!companyCode) return [];

    const snapshot = await get(ref(db, resignationsPath(companyCode)));

    if (!snapshot.exists()) return [];

    return Object.entries(snapshot.val()).map(
      ([resignationId, record]) => ({ resignationId, ...record })
    );

  } catch (error) {

    console.error("Get Resignations Error:", error);

    throw error;

  }

};

export const getResignationById = async (companyCode, resignationId) => {

  if (!companyCode || !resignationId) return null;

  const snapshot = await get(
    ref(db, resignationPath(companyCode, resignationId))
  );

  if (!snapshot.exists()) return null;

  return { resignationId, ...snapshot.val() };

};

export const getEmployeeResignations = async (companyCode, employeeId) => {

  const id = String(employeeId ?? "").trim().toUpperCase();

  if (!id) return [];

  const all = await getResignations(companyCode);

  return all.filter(
    (record) =>
      String(record?.employeeId ?? "").trim().toUpperCase() === id
  );

};

/*
|--------------------------------------------------------------------------
| Step One — The Manager
|--------------------------------------------------------------------------
*/

export const approveByManager = async (
  companyCode,
  resignationId,
  actor,
  remarks = ""
) => {

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.MANAGER_PENDING],
    () => ({
      status: RESIGNATION_STATUS.HR_PENDING,
      managerReview: { ...stamp(actor, remarks), decision: "Approved" },
    })
  );

  if (result.success) {
    await announce(
      "Manager approval notification",
      () => notifyManagerApproved(companyCode, result.resignation, actor)
    );
  }

  return result;

};

export const rejectByManager = async (
  companyCode,
  resignationId,
  actor,
  reason
) => {

  if (!String(reason || "").trim()) {
    return {
      success: false,
      message: "A reason is required to reject a resignation.",
    };
  }

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.MANAGER_PENDING],
    () => ({
      status: RESIGNATION_STATUS.MANAGER_REJECTED,
      managerReview: { ...stamp(actor, reason), decision: "Rejected" },
      rejectionReason: reason,
    })
  );

  if (result.success) {
    await announce(
      "Resignation rejection notification",
      () =>
        notifyResignationRejected(
          companyCode,
          result.resignation,
          actor,
          "manager",
          reason
        )
    );
  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Step Two — HR
|--------------------------------------------------------------------------
| Approving settles the last working day. The employee asked for one and HR
| confirms or moves it, and it is this agreed date - not the requested one -
| that the settlement is priced against and the certificate printed with.
|
| Approval is also what sends the equipment form. The two are one action
| because a record sitting in EQUIPMENT_PENDING that nobody was emailed about
| is an exit that silently stops moving.
|--------------------------------------------------------------------------
*/

export const approveByHr = async (
  companyCode,
  resignationId,
  actor,
  { lastWorkingDay, remarks = "" }
) => {

  if (!lastWorkingDay) {
    return {
      success: false,
      message: "Confirm the last working day before approving.",
    };
  }

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.HR_PENDING],
    () => ({
      status: RESIGNATION_STATUS.EQUIPMENT_PENDING,
      lastWorkingDay,
      hrReview: { ...stamp(actor, remarks), decision: "Approved" },
      equipment: getEmptyEquipment(),
    })
  );

  if (!result.success) return result;

  /*
  | The email carries the outcome back to the caller, because this is the one
  | send in the module the user is waiting on: HR has just told an employee
  | to return their laptop, and whether that message actually left is
  | something the screen has to be able to say.
  */
  const email = await announce(
    "Equipment submission email",
    () => sendEquipmentSubmissionEmail(companyCode, result.resignation)
  );

  await announce(
    "Equipment request notification",
    () => notifyEquipmentRequested(companyCode, result.resignation, actor)
  );

  return { ...result, email };

};

export const rejectByHr = async (
  companyCode,
  resignationId,
  actor,
  reason
) => {

  if (!String(reason || "").trim()) {
    return {
      success: false,
      message: "A reason is required to reject a resignation.",
    };
  }

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.HR_PENDING],
    () => ({
      status: RESIGNATION_STATUS.HR_REJECTED,
      hrReview: { ...stamp(actor, reason), decision: "Rejected" },
      rejectionReason: reason,
    })
  );

  if (result.success) {
    await announce(
      "Resignation rejection notification",
      () =>
        notifyResignationRejected(
          companyCode,
          result.resignation,
          actor,
          "hr",
          reason
        )
    );
  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Step Three — The Equipment Declaration
|--------------------------------------------------------------------------
| Filed by the employee themselves. The whole map is replaced rather than
| merged: the form submits every item every time, and merging would leave a
| row from a previous attempt standing beside the answers that replaced it.
|--------------------------------------------------------------------------
*/

export const submitEquipment = async (
  companyCode,
  resignationId,
  actor,
  { items, remarks = "" }
) => {

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.EQUIPMENT_PENDING],
    () => ({
      status: RESIGNATION_STATUS.FNF_PENDING,
      equipment: items,
      equipmentRemarks: remarks,
      equipmentSubmittedAt: Date.now(),
      equipmentSubmittedBy: stamp(actor, remarks),
    })
  );

  if (result.success) {
    await announce(
      "Equipment submitted notification",
      () => notifyEquipmentSubmitted(companyCode, result.resignation)
    );
  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Step Four — The Settlement
|--------------------------------------------------------------------------
| Saved and submitted separately.
|
| `saveFnF` keeps a draft without moving the record, so HR can work out a
| settlement over an afternoon - chasing a loan balance, waiting on an asset
| valuation - without either losing the figures or pushing an unfinished
| worksheet to the reviewer.
|
| It is allowed while the record is under review as well as before it,
| because that is what a reviewer sending something back amounts to in
| practice: HR corrects a line and the review sees the corrected one.
|--------------------------------------------------------------------------
*/

export const saveFnF = async (
  companyCode,
  resignationId,
  actor,
  { values, notes = "", derivation = null }
) =>
  transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.FNF_PENDING, RESIGNATION_STATUS.FNF_REVIEW],
    (current) => ({
      fnf: {
        ...(current.fnf || {}),
        values,
        notes,
        derivation,
        updatedAt: Date.now(),
        updatedBy: stamp(actor).byName,
      },
    })
  );

export const submitFnFForReview = async (
  companyCode,
  resignationId,
  actor,
  { values, notes = "", derivation = null, totals }
) => {

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.FNF_PENDING],
    (current) => ({
      status: RESIGNATION_STATUS.FNF_REVIEW,
      fnf: {
        ...(current.fnf || {}),
        values,
        notes,
        derivation,
        totals,
        preparedBy: stamp(actor),
        updatedAt: Date.now(),
      },
    })
  );

  if (result.success) {
    await announce(
      "Settlement review notification",
      () => notifyFnFUnderReview(companyCode, result.resignation, actor)
    );
  }

  return result;

};

/*
| HR's check. The totals are re-stamped from what was actually on screen at
| the moment of review, so the figure finance approves is the figure somebody
| signed off and not a later edit that slipped in underneath it.
*/

export const reviewFnF = async (
  companyCode,
  resignationId,
  actor,
  { remarks = "", totals } = {}
) => {

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.FNF_REVIEW],
    (current) => ({
      status: RESIGNATION_STATUS.FINANCE_PENDING,
      fnf: {
        ...(current.fnf || {}),
        totals: totals || current.fnf?.totals || null,
      },
      fnfReview: { ...stamp(actor, remarks), decision: "Reviewed" },
    })
  );

  if (result.success) {
    await announce(
      "Finance approval notification",
      () => notifyFinanceApprovalPending(companyCode, result.resignation, actor)
    );
  }

  return result;

};

/*
| Sending a settlement back to be re-worked. Not a rejection - the exit is
| already agreed by this point and nothing here can un-agree it - so it
| returns the record to FNF_PENDING with the reason attached rather than
| closing it.
*/

export const returnFnF = async (
  companyCode,
  resignationId,
  actor,
  reason
) => {

  if (!String(reason || "").trim()) {
    return {
      success: false,
      message: "Say what needs correcting before sending it back.",
    };
  }

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.FNF_REVIEW, RESIGNATION_STATUS.FINANCE_PENDING],
    () => ({
      status: RESIGNATION_STATUS.FNF_PENDING,
      fnfReturn: { ...stamp(actor, reason), decision: "Returned" },
    })
  );

  if (result.success) {
    await announce(
      "Settlement returned notification",
      () => notifyFnFReady(companyCode, result.resignation, reason)
    );
  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Step Five — Finance, The Exit, And The Certificate
|--------------------------------------------------------------------------
| The last write in the journey does three things at once, and they belong
| together: the approval is what makes the exit real, and the exit is what
| the certificate certifies.
|
| The NOC goes to the personal address. That is the whole point of holding
| one on the record - by the time this runs the company mailbox is being
| closed, and a No Objection Certificate delivered to an account the employee
| can no longer open is a certificate nobody receives.
|
| The send is attempted after the write and its outcome is returned, so the
| screen can offer to send it again rather than leaving HR unsure whether it
| went. `nocIssuedAt` is only stamped when it actually left.
|--------------------------------------------------------------------------
*/

export const approveFinanceAndExit = async (
  companyCode,
  resignationId,
  actor,
  { remarks = "" } = {}
) => {

  const exitedAt = Date.now();

  const result = await transition(
    companyCode,
    resignationId,
    [RESIGNATION_STATUS.FINANCE_PENDING],
    () => ({
      status: RESIGNATION_STATUS.EXITED,
      financeApproval: { ...stamp(actor, remarks), decision: "Approved" },
      exitedAt,
    })
  );

  if (!result.success) return result;

  const email = await announce(
    "NOC email",
    () => sendNocEmail(companyCode, result.resignation)
  );

  if (email?.success) {

    await update(
      ref(db, resignationPath(companyCode, resignationId)),
      { nocIssuedAt: Date.now(), nocSentTo: email.to || "" }
    );

  }

  await announce(
    "Exit notification",
    () => notifyExitCompleted(companyCode, result.resignation, actor)
  );

  return { ...result, email };

};

/*
| Sending the certificate again, for the exit where the address was wrong or
| the first attempt failed. Only for a record that has actually exited -
| there is nothing to certify before that.
*/

export const resendNoc = async (companyCode, resignationId) => {

  const resignation = await getResignationById(companyCode, resignationId);

  if (!resignation) {
    return { success: false, message: "This resignation no longer exists." };
  }

  if (resignation.status !== RESIGNATION_STATUS.EXITED) {
    return {
      success: false,
      message: "The certificate is issued once the exit is approved.",
    };
  }

  const email = await sendNocEmail(companyCode, resignation);

  if (email?.success) {

    await update(
      ref(db, resignationPath(companyCode, resignationId)),
      { nocIssuedAt: Date.now(), nocSentTo: email.to || "" }
    );

  }

  return email || { success: false, message: "The certificate could not be sent." };

};

/*
| Sending the equipment form again. Same reasoning as the NOC resend: the
| first email can fail for reasons that have nothing to do with the exit, and
| without this the only way to nudge it is to reject the resignation and have
| the employee file it a second time.
*/

export const resendEquipmentEmail = async (companyCode, resignationId) => {

  const resignation = await getResignationById(companyCode, resignationId);

  if (!resignation) {
    return { success: false, message: "This resignation no longer exists." };
  }

  if (resignation.status !== RESIGNATION_STATUS.EQUIPMENT_PENDING) {
    return {
      success: false,
      message: "The equipment form has already been submitted.",
    };
  }

  return await sendEquipmentSubmissionEmail(companyCode, resignation);

};
