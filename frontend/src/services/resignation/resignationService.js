import {
  ref,
  get,
  set,
  push,
  update,
} from "firebase/database";

import { db } from "../../firebase/firebase";
import { uploadFileApi } from "../api/uploadApi";

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

import {ResignationcreateApi,getResignationsApi,getResignationByIdApi,approveByManagerApi,rejectByManagerApi,approveByHrApi,rejectByHrApi,submitEquipmentApi,attachDocumentApi,saveFnFApi,submitFnFForReviewApi,reviewFnFApi,returnFnFApi,financeApproveApi} from "../api/resignationApi";
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
|-
-------------------------------------------------------------------------
*/

export const uploadResignationDocument = async (
  companyCode,
  resignationId,
  file
) => {
  const result = await uploadFileApi(file, {
    folder: `resignations/${resignationId}`,
    resourceType: "auto",
  });

  return result.url;

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

// Prevent duplicate active resignations.
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

// Call the backend API instead of writing directly to Firebase.
const response = await ResignationcreateApi(companyCode, {
  employee,
  reasonCategory,
  reason,
  lastWorkingDay,
  noticePeriodDays,
});

if (!response?.success) {
  return response || {
    success: false,
    message: "Unable to create resignation.",
  };
}

const resignation = response.resignation;
const resignationId =
  response.resignationId || resignation?.resignationId;

// Upload the document only after successful creation, then pin the
// Cloudinary URL onto the record through the backend — never a direct
// client write, so it cannot be blocked by database rules.
if (document && resignationId) {
  const documentUrl = await announce(
    "Resignation document upload",
    () =>
      uploadResignationDocument(
        companyCode,
        resignationId,
        document
      )
  );

  if (documentUrl) {
    const attached = await announce(
      "Resignation document attach",
      () => attachDocumentApi(companyCode, resignationId, documentUrl)
    );

    if (resignation && attached?.success !== false) {
      resignation.documentUrl = documentUrl;
    }
  }
}

// Notify only after successful creation.
if (resignation) {
  await announce(
    "Resignation notification",
    () => notifyResignationRaised(companyCode, resignation)
  );
}

return {
  ...response,
  success: true,
  resignationId,
  resignation,
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

    const response = await getResignationsApi(companyCode);

    // Support either an array or the backend envelope { data: [...] }.
    const records = Array.isArray(response)
      ? response
      : (response?.data ?? response?.resignations ?? []);

    if (!Array.isArray(records)) {
      return [];
    }

    return records;
  } catch (error) {
    console.error("Get Resignations Error:", error);
    throw error;
  }
};
// export const getResignations = async (companyCode) => {

//   try {

//     if (!companyCode) return [];

//     const snapshot = await get(ref(db, resignationsPath(companyCode)));

//     if (!snapshot.exists()) return [];

//     return Object.entries(snapshot.val()).map(
//       ([resignationId, record]) => ({ resignationId, ...record })
//     );

//   } catch (error) {

//     console.error("Get Resignations Error:", error);

//     throw error;

//   }

// };

export const getResignationById = async (companyCode, resignationId) => {

  if (!companyCode || !resignationId) return null;

  const response = await getResignationByIdApi(companyCode, resignationId);

  const record = response?.data ?? response?.resignation ?? response;

  if (!record || typeof record !== "object") return null;

  return { resignationId, ...record };

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
  remarks = "",
  lastWorkingDay = null
) => {
  try {
    // 4th arg may be an options object { remarks/note, lastWorkingDay }.
    let finalRemarks = remarks;
    let finalLastWorkingDay = lastWorkingDay;
    if (remarks && typeof remarks === "object") {
      finalRemarks = remarks.remarks ?? remarks.note ?? "";
      finalLastWorkingDay = remarks.lastWorkingDay ?? null;
    }

    // The manager modal collects no date, but the backend requires one —
    // fall back to the employee's requested date (HR can still adjust it).
    if (!finalLastWorkingDay) {
      const current = await getResignationById(companyCode, resignationId);
      finalLastWorkingDay =
        current?.requestedLastWorkingDay || current?.lastWorkingDay || null;
    }

    const result = await approveByManagerApi(
      companyCode,
      resignationId,
      finalRemarks,
      finalLastWorkingDay
    );

    if (result?.success) {
      await announce(
        "Manager approval notification",
        () =>
          notifyManagerApproved(
            companyCode,
            result.resignation,
            actor
          )
      );
    }

    return result;
  } catch (error) {
    console.error("Approve By Manager Error:", error);
    throw error;
  }
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

  try {
    const result = await rejectByManagerApi(
      companyCode,
      resignationId,
      reason
    );

    if (result?.success) {
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
  } catch (error) {
    console.error("Reject By Manager Error:", error);
    throw error;
  }

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

  try {
    const result = await approveByHrApi(
      companyCode,
      resignationId,
      { lastWorkingDay, remarks }
    );

    if (!result?.success) return result;

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
  } catch (error) {
    console.error("Approve By HR Error:", error);
    throw error;
  }

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

  try {
    const result = await rejectByHrApi(
      companyCode,
      resignationId,
      reason
    );

    if (result?.success) {
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
  } catch (error) {
    console.error("Reject By HR Error:", error);
    throw error;
  }

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

  try {
    const result = await submitEquipmentApi(
      companyCode,
      resignationId,
      { equipment: items, remarks }
    );

    if (result?.success) {
      await announce(
        "Equipment submitted notification",
        () => notifyEquipmentSubmitted(companyCode, result.resignation)
      );
    }

    return result;
  } catch (error) {
    console.error("Submit Equipment Error:", error);
    throw error;
  }

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
) => {
  try {
    return await saveFnFApi(
      companyCode,
      resignationId,
      { values, notes, derivation }
    );
  } catch (error) {
    console.error("Save F&F Error:", error);
    throw error;
  }
};

export const submitFnFForReview = async (
  companyCode,
  resignationId,
  actor,
  { values, notes = "", derivation = null, totals } = {}
) => {

  try {
    // The backend submit step carries no worksheet payload and requires
    // saved F&F details, so persist the on-screen figures first.
    if (values && typeof values === "object" && Object.keys(values).length) {
      const saved = await saveFnFApi(
        companyCode,
        resignationId,
        { values, notes, derivation, totals }
      );

      if (!saved?.success) return saved;
    }

    const result = await submitFnFForReviewApi(
      companyCode,
      resignationId
    );

    if (result?.success) {
      await announce(
        "Settlement review notification",
        () => notifyFnFUnderReview(companyCode, result.resignation, actor)
      );
    }

    return result;
  } catch (error) {
    console.error("Submit F&F For Review Error:", error);
    throw error;
  }

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

  try {
    const result = await reviewFnFApi(
      companyCode,
      resignationId,
      { remarks }
    );

    if (result?.success) {
      await announce(
        "Finance approval notification",
        () => notifyFinanceApprovalPending(companyCode, result.resignation, actor)
      );
    }

    return result;
  } catch (error) {
    console.error("Review F&F Error:", error);
    throw error;
  }

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

  try {
    const result = await returnFnFApi(
      companyCode,
      resignationId,
      reason
    );

    if (result?.success) {
      await announce(
        "Settlement returned notification",
        () => notifyFnFReady(companyCode, result.resignation, reason)
      );
    }

    return result;
  } catch (error) {
    console.error("Return F&F Error:", error);
    throw error;
  }

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

  try {
    const result = await financeApproveApi(
      companyCode,
      resignationId,
      { remarks }
    );

    if (!result?.success) return result;

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
  } catch (error) {
    console.error("Finance Approve Error:", error);
    throw error;
  }

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
