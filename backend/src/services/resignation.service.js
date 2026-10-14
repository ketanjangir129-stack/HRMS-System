const repository = require("../modules/resignation/resignation.repository");

const {
  RESIGNATION_STATUS,
  RESIGNATION_ACTION,
  normalizeStatus,
} = require("../modules/resignation/resignation.constants");

const employeeService = require("../services/employeeService");

const departmentService = require("../services/departmentService");

const {
  validateCreateResignation,
  validateRejection,
  validateLastWorkingDay,
  validateFnf,
} = require("../modules/resignation/resignation.validation");

/* =========================================================
   HELPERS
========================================================= */

const createActorSnapshot = (actor) => ({
  employeeId: actor?.employeeId || null,
  name:
    actor?.name ||
    actor?.employeeName ||
    actor?.employeeId ||
    null,
  role: actor?.role || null,
});

/*
| The JWT only carries employeeId + role, so an actor built from it has no
| name and every stamp would snapshot the employee ID as the "name". Resolve
| the real display name off the employee record before anything is written.
| Owner has no employee record and keeps the "Owner" label.
*/
const resolveEmployeeDisplayName = (employee) =>
  String(
    employee?.personalInfo?.fullName ||
    employee?.name ||
    employee?.personalInfo?.name ||
    ""
  ).trim();

const withActorDisplayName = async (companyCode, actor) => {
  if (!actor || typeof actor !== "object") return actor;

  const employeeId = String(actor.employeeId || "").trim();

  if (!employeeId) {
    if (
      !String(actor.name || "").trim() &&
      String(actor.role || "").trim().toLowerCase() === "owner"
    ) {
      return { ...actor, name: "Owner" };
    }

    return actor;
  }

  const currentName = String(actor.name || "").trim();

  if (
    currentName &&
    currentName.toUpperCase() !== employeeId.toUpperCase()
  ) {
    return actor;
  }

  let employee = null;

  try {
    employee = await employeeService.getEmployeeById(
      companyCode,
      employeeId.toUpperCase()
    );
  } catch (lookupError) {
    employee = null;
  }

  if (!employee && employeeId.toUpperCase() !== employeeId) {
    try {
      employee = await employeeService.getEmployeeById(
        companyCode,
        employeeId
      );
    } catch (lookupError) {
      employee = null;
    }
  }

  const displayName = resolveEmployeeDisplayName(employee);

  if (!displayName) return actor;

  return { ...actor, name: displayName };
};

const normalizeEmployeeId = (employeeId) =>
  String(employeeId || "")
    .trim()
    .toUpperCase();

const createError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const createHistoryId = () => {
  const key = repository.db.ref().push().key;

  if (!key) {
    throw createError(
      "Unable to generate history ID.",
      500,
      "HISTORY_ID_GENERATION_FAILED"
    );
  }

  return `EVENT_${key}`;
};

const buildHistory = ({
  historyId,
  action,
  fromStatus,
  toStatus,
  actor,
  remarks = "",
  metadata = {},
  performedAt,
}) => ({
  historyId,
  action,
  fromStatus: fromStatus || null,
  toStatus: toStatus || null,
  performedBy:
    actor?.employeeId ||
    actor?.uid ||
    "",
  performedByName:
    actor?.name ||
    actor?.employeeName ||
    actor?.employeeId ||
    "",
  performedAt,
  remarks: remarks || "",
  metadata: metadata || {},
});

/* =========================================================
   CREATE RESIGNATION
========================================================= */

const createResignation = async ({
  companyCode,
  employeeId,
  employee: employeeInput,
  reasonCategory,
  reason,
  lastWorkingDay,
  noticePeriodDays,
  actor,
}) => {
  const normalizedEmployeeId =
    normalizeEmployeeId(employeeId);

  validateCreateResignation({
    reasonCategory,
    reason,
    lastWorkingDay,
    noticePeriodDays,
  });

  if (!normalizedEmployeeId) {
    throw createError(
      "Employee ID is required.",
      400,
      "EMPLOYEE_ID_REQUIRED"
    );
  }

  /* -----------------------------------------
     Get employee
  ----------------------------------------- */

  const employee =
    await employeeService.getEmployeeById(
      companyCode,
      normalizedEmployeeId
    );

  if (!employee) {
    throw createError(
      "Employee not found.",
      404,
      "EMPLOYEE_NOT_FOUND"
    );
  }

  /* -----------------------------------------
     Check active resignation
  ----------------------------------------- */

  const existingResignations =
    await repository.findAll(companyCode);

  const activeResignation =
    existingResignations.find(
      (item) =>
        normalizeEmployeeId(item?.employeeId) ===
          normalizedEmployeeId &&
        ![
          RESIGNATION_STATUS.EXITED,
          RESIGNATION_STATUS.MANAGER_REJECTED,
          RESIGNATION_STATUS.HR_REJECTED,
        ].includes(item?.status)
    );

  if (activeResignation) {
    throw createError(
      "Employee already has an active resignation.",
      409,
      "ACTIVE_RESIGNATION_EXISTS"
    );
  }

  /* -----------------------------------------
     Generate resignation ID
  ----------------------------------------- */

  const resignationId =
    repository.generateResignationId(
      companyCode
    );

  const now = Date.now();

  /* -----------------------------------------
     Employee snapshot
  ----------------------------------------- */

  const employeeSnapshot = {
    employeeId: normalizedEmployeeId,

    name:
      employeeInput?.name ||
      employee?.personalInfo?.fullName ||
      employee?.name ||
      employee?.personalInfo?.name ||
      "",

    email:
      employeeInput?.email ||
      employee?.personalInfo?.email ||
      employee?.email ||
      "",

    personalEmail:
      employeeInput?.personalEmail ||
      employee?.personalInfo?.personalEmail ||
      employee?.personalEmail ||
      "",

    mobile:
      employeeInput?.mobile ||
      employee?.personalInfo?.mobile ||
      employee?.mobile ||
      "",

    // Department comes from the directory, not the client: manager scope is
    // decided by it. getEmployeeById resolves employmentInfo.departmentId
    // into employmentInfo.department (see utils/departmentRefs).
    department:
      employee?.employmentInfo?.department ||
      employeeInput?.department ||
      "",

    departmentId:
      employee?.employmentInfo?.departmentId ||
      employeeInput?.departmentId ||
      "",

    designation:
      employee?.employmentInfo?.designation ||
      employeeInput?.designation ||
      "",

    joiningDate:
      employeeInput?.joiningDate ||
      employee?.employmentInfo?.joiningDate ||
      "",
  };

  /* -----------------------------------------
     Initial history
  ----------------------------------------- */

  const historyId = createHistoryId();

  const history = buildHistory({
    historyId,
    action: RESIGNATION_ACTION.CREATED,
    fromStatus: null,
    toStatus: RESIGNATION_STATUS.MANAGER_PENDING,
    actor,
    performedAt: now,
  });

  /* -----------------------------------------
     Resignation object
  ----------------------------------------- */

  const resignation = {
    resignationId,

    employeeId: normalizedEmployeeId,

    employeeSnapshot,

    // Flat copies the frontend list/detail screens read directly.
    name: employeeSnapshot.name,
    department: employeeSnapshot.department,
    departmentId: employeeSnapshot.departmentId,
    designation: employeeSnapshot.designation,
    mobile: employeeSnapshot.mobile,
    email: employeeSnapshot.email,
    personalEmail: employeeSnapshot.personalEmail,
    joiningDate: employeeSnapshot.joiningDate,

    reasonCategory,
    reason,

    requestedLastWorkingDay: lastWorkingDay,

    lastWorkingDay: null,

    noticePeriodDays:
      Number(noticePeriodDays),

    documentUrl: null,

    status:
      RESIGNATION_STATUS.MANAGER_PENDING,

    managerReview: null,
    hrReview: null,

    equipment: null,
    equipmentRemarks: "",
    equipmentSubmittedAt: null,
    equipmentSubmittedBy: null,

    fnf: null,
    fnfLastSavedAt: null,
    fnfLastSavedBy: null,
    fnfSubmittedAt: null,
    fnfSubmittedBy: null,

    fnfReview: null,
    fnfReturn: null,

    financeApproval: null,

    exitedAt: null,

    nocIssuedAt: null,
    nocSentTo: null,

    createdAt: now,
    updatedAt: now,

    // Aliases the frontend sorts/displays by.
    raisedOn: now,
    raisedAt: now,

    createdBy:
      createActorSnapshot(actor),

    history: {
      [historyId]: history,
    },
  };

  await repository.create(
    companyCode,
    resignationId,
    resignation
  );

  return resignation;
};

/* =========================================================
   GET EMPLOYEE RESIGNATIONS
========================================================= */

const getEmployeeResignations = async ({
  companyCode,
  employeeId,
}) => {
  const normalizedEmployeeId =
    normalizeEmployeeId(employeeId);

  const resignations =
    await repository.findAll(companyCode);

  return resignations
    .filter(
      (item) =>
        normalizeEmployeeId(item?.employeeId) ===
        normalizedEmployeeId
    )
    .sort(
      (a, b) =>
        Number(b?.createdAt || 0) -
        Number(a?.createdAt || 0)
    );
};

/* =========================================================
   GET RESIGNATIONS FOR VIEWER (role-aware list)
   HR/owner see all; managers see their departments + own;
   everyone else sees own.
========================================================= */

const toDepartmentKey = (name) =>
  String(name ?? "").trim().toLowerCase();

/*
 * Fill `department` from the record's departmentId, so the name is the
 * department's current one. Records raised before the department name was
 * stored correctly carry "" here, and the frontend scopes managers by name.
 */
const withCurrentDepartment = (resignation, departments) => {
  const current =
    departments?.[resignation?.departmentId]?.name;

  if (!current || current === resignation.department) {
    return resignation;
  }

  return {
    ...resignation,
    department: current,
    employeeSnapshot: resignation.employeeSnapshot
      ? { ...resignation.employeeSnapshot, department: current }
      : resignation.employeeSnapshot,
  };
};

const getResignationsForViewer = async ({
  companyCode,
  employeeId,
  role,
}) => {
  const normalizedRole =
    String(role || "").trim().toLowerCase();

  const [resignations, departments] = await Promise.all([
    repository.findAll(companyCode),
    departmentService.getDepartments(companyCode),
  ]);

  const sorted = resignations
    .map((item) => withCurrentDepartment(item, departments))
    .sort(
      (a, b) =>
        Number(b?.createdAt || 0) -
        Number(a?.createdAt || 0)
    );

  if (
    ["hr", "hr_admin", "owner","finance"].includes(
      normalizedRole
    )
  ) {
    return sorted;
  }

  const normalizedEmployeeId =
    normalizeEmployeeId(employeeId);

  /*
  | Finance coverage without a finance role: whoever sits in the Finance
  | department as a Finance Executive / Finance Manager sees the settlements
  | waiting on finance, plus their own exits. The department/designation live
  | on the employee record, so the viewer is re-read here.
  |
  | This unions with — never replaces — the manager branch below. A Finance
  | Manager is both a manager and a finance member, and an early return here
  | would strip their managed departments down to finance-pending + own.
  */
  let isFinanceViewer = false;

  if (normalizedEmployeeId) {
    let viewer = null;

    try {
      viewer =
        await employeeService.getEmployeeById(
          companyCode,
          normalizedEmployeeId
        );
    } catch (viewerError) {
      viewer = null;
    }

    const department = String(
      viewer?.employmentInfo?.department || viewer?.department || ""
    )
      .trim()
      .toLowerCase();

    const designation = String(
      viewer?.employmentInfo?.designation || viewer?.designation || ""
    )
      .trim()
      .toLowerCase();

    isFinanceViewer =
      department === "finance" &&
      ["finance executive", "finance manager"].includes(designation);
  }

  if (normalizedRole === "manager") {
    const managed = Object.entries(departments || {}).filter(
      ([, department]) =>
        normalizeEmployeeId(
          department?.manager?.employeeId
        ) === normalizedEmployeeId
    );

    // Match on id first (survives renames), name for records without one.
    const managedIds = new Set(
      managed.map(([departmentId]) => departmentId)
    );

    const managedKeys = new Set(
      managed
        .map(([, department]) =>
          toDepartmentKey(department?.name)
        )
        .filter(Boolean)
    );

    return sorted.filter(
      (item) =>
        normalizeEmployeeId(
          item?.employeeId
        ) === normalizedEmployeeId ||
        (isFinanceViewer &&
          normalizeStatus(item?.status) ===
            RESIGNATION_STATUS.FINANCE_PENDING) ||
        managedIds.has(item?.departmentId) ||
        managedKeys.has(
          toDepartmentKey(item?.department)
        )
    );
  }

  if (isFinanceViewer) {
    return sorted.filter(
      (item) =>
        normalizeEmployeeId(item?.employeeId) ===
          normalizedEmployeeId ||
        normalizeStatus(item?.status) ===
          RESIGNATION_STATUS.FINANCE_PENDING
    );
  }

  return sorted.filter(
    (item) =>
      normalizeEmployeeId(item?.employeeId) ===
      normalizedEmployeeId
  );
};

/* =========================================================
   GET RESIGNATION BY ID
========================================================= */

const getResignationById = async ({
  companyCode,
  resignationId,
}) => {
  const resignation =
    await repository.findById(
      companyCode,
      resignationId
    );

  if (!resignation) {
    throw createError(
      "Resignation not found.",
      404,
      "RESIGNATION_NOT_FOUND"
    );
  }

  return withCurrentDepartment(
    resignation,
    await departmentService.getDepartments(companyCode)
  );
};

/* =========================================================
   ATOMIC STATE TRANSITION
========================================================= */

const transition = async ({
  companyCode,
  resignationId,
  expectedStatuses,
  action,
  actor,
  remarks = "",
  metadata = {},
  buildUpdates,
}) => {
  /* Resolve the actor's real name once — every stamp and history entry
     below snapshots this same actor. */
  actor = await withActorDisplayName(companyCode, actor);

  /* -----------------------------------------
     First check that resignation exists
  ----------------------------------------- */

  const existing =
    await repository.findById(
      companyCode,
      resignationId
    );

  if (!existing) {
    throw createError(
      "Resignation not found.",
      404,
      "RESIGNATION_NOT_FOUND"
    );
  }

  /* -----------------------------------------
     Validate current state before transaction
  ----------------------------------------- */

  if (
    !expectedStatuses.includes(
      existing.status
    )
  ) {
    throw createError(
      `Invalid resignation status. Current status is ${existing.status}.`,
      409,
      "INVALID_RESIGNATION_STATUS"
    );
  }

  /*
   * Generate these once.
   *
   * Firebase can execute the transaction
   * callback multiple times.
   */

  const historyId = createHistoryId();
  const transitionAt = Date.now();

  const ref = repository.db.ref(
    repository.getResignationPath(
      companyCode,
      resignationId
    )
  );

  /* -----------------------------------------
     Prime the local cache

     firebase-admin has no local cache for
     transactions unless a listener is attached.
     Without this, the transaction callback
     receives null first and aborts, causing
     RESIGNATION_TRANSACTION_FAILED.
  ----------------------------------------- */

  await new Promise((resolve, reject) => {
    ref.on("value", () => resolve(), reject);
  });

  /* -----------------------------------------
     Firebase transaction
  ----------------------------------------- */

  let result;
  try {
    result = await ref.transaction(
    (current) => {
      /*
       * Record disappeared between the
       * initial read and transaction.
       */

      if (!current) {
        return;
      }

      // Raw read: a legacy record may still carry a display label.
      const currentStatus =
        normalizeStatus(current.status);

      /*
       * Re-check status inside transaction.
       *
       * This is important for concurrency.
       */

      if (
        !expectedStatuses.includes(
          currentStatus
        )
      ) {
        return;
      }

      const updates = buildUpdates(
        current,
        {
          transitionAt,
        }
      );

      const nextStatus =
        updates.status ||
        currentStatus;

      const history = buildHistory({
        historyId,
        action,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actor,
        remarks,
        metadata,
        performedAt: transitionAt,
      });

      return {
        ...current,

        ...updates,

        status: nextStatus,

        updatedAt: transitionAt,

        history: {
          ...(current.history || {}),
          [historyId]: history,
        },
      };
    }
  );
  } finally {
    ref.off();
  }

  /* -----------------------------------------
     Transaction failed / aborted
  ----------------------------------------- */

  if (!result.committed) {
    const latest =
      await repository.findById(
        companyCode,
        resignationId
      );

    if (!latest) {
      throw createError(
        "Resignation not found.",
        404,
        "RESIGNATION_NOT_FOUND"
      );
    }

    if (
      !expectedStatuses.includes(
        latest.status
      )
    ) {
      throw createError(
        `Invalid resignation status. Current status is ${latest.status}.`,
        409,
        "INVALID_RESIGNATION_STATUS"
      );
    }

    throw createError(
      "Unable to complete resignation transition.",
      409,
      "RESIGNATION_TRANSACTION_FAILED"
    );
  }

  /* -----------------------------------------
     Return committed resignation
  ----------------------------------------- */

  return {
    resignationId,
    ...result.snapshot.val(),
  };
};

/* =========================================================
   MANAGER APPROVE
========================================================= */

const approveByManager = async ({
  companyCode,
  resignationId,
  actor,
  lastWorkingDay,
  remarks = "",
}) => {
  validateLastWorkingDay(
    lastWorkingDay
  );

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.MANAGER_PENDING,
    ],

    action:
      RESIGNATION_ACTION.MANAGER_APPROVED,

    actor,
    remarks,

    metadata: {
      lastWorkingDay,
    },

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.HR_PENDING,

      lastWorkingDay,

      managerReview: {
        decision: "APPROVED",
        remarks,

        reviewedBy:
          createActorSnapshot(actor),

        reviewedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   MANAGER REJECT
========================================================= */

const rejectByManager = async ({
  companyCode,
  resignationId,
  actor,
  reason,
}) => {
  validateRejection(reason);

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.MANAGER_PENDING,
    ],

    action:
      RESIGNATION_ACTION.MANAGER_REJECTED,

    actor,

    remarks: reason,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.MANAGER_REJECTED,

      managerReview: {
        decision: "REJECTED",
        reason,

        reviewedBy:
          createActorSnapshot(actor),

        reviewedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   HR APPROVE
========================================================= */

const approveByHr = async ({
  companyCode,
  resignationId,
  actor,
  lastWorkingDay,
  remarks = "",
}) => {
  validateLastWorkingDay(
    lastWorkingDay
  );

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.HR_PENDING,
    ],

    action:
      RESIGNATION_ACTION.HR_APPROVED,

    actor,
    remarks,

    metadata: {
      lastWorkingDay,
    },

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.EQUIPMENT_PENDING,

      lastWorkingDay,

      hrReview: {
        decision: "APPROVED",
        remarks,

        reviewedBy:
          createActorSnapshot(actor),

        reviewedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   HR REJECT
========================================================= */

const rejectByHr = async ({
  companyCode,
  resignationId,
  actor,
  reason,
}) => {
  validateRejection(reason);

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.HR_PENDING,
    ],

    action:
      RESIGNATION_ACTION.HR_REJECTED,

    actor,

    remarks: reason,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.HR_REJECTED,

      hrReview: {
        decision: "REJECTED",
        reason,

        reviewedBy:
          createActorSnapshot(actor),

        reviewedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   EQUIPMENT SUBMISSION
========================================================= */

const submitEquipment = async ({
  companyCode,
  resignationId,
  actor,
  equipment,
  remarks = "",
}) => {
  if (
    !equipment ||
    typeof equipment !== "object"
  ) {
    throw createError(
      "Equipment details are required.",
      400,
      "EQUIPMENT_REQUIRED"
    );
  }

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.EQUIPMENT_PENDING,
    ],

    action:
      RESIGNATION_ACTION.EQUIPMENT_SUBMITTED,

    actor,

    remarks,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.FNF_PENDING,

      equipment,

      equipmentRemarks: remarks,

      equipmentSubmittedAt:
        transitionAt,

      equipmentSubmittedBy:
        createActorSnapshot(actor),
    }),
  });
};

/* =========================================================
   ATTACH DOCUMENT
   =========================================================
   Stores the Cloudinary URL of the optional attachment uploaded at filing
   time. The upload itself goes through POST /api/upload/file — this only
   pins the resulting URL onto the record, server-side, so it never depends
   on a client Firebase write.
*/

const attachDocument = async ({
  companyCode,
  resignationId,
  documentUrl,
}) => {
  const url = String(documentUrl || "").trim();

  if (!url) {
    throw createError(
      "A document URL is required.",
      400,
      "DOCUMENT_URL_REQUIRED"
    );
  }

  if (!/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
    throw createError(
      "Only Cloudinary document URLs can be attached.",
      400,
      "INVALID_DOCUMENT_URL"
    );
  }

  const resignation =
    await getResignationById({
      companyCode,
      resignationId,
    });

  if (resignation.status !== RESIGNATION_STATUS.MANAGER_PENDING) {
    throw createError(
      "The document can only be attached while the resignation is awaiting manager review.",
      409,
      "INVALID_RESIGNATION_STATUS"
    );
  }

  await repository.update(
    companyCode,
    resignationId,
    {
      documentUrl: url,
      updatedAt: Date.now(),
    }
  );

  return getResignationById({
    companyCode,
    resignationId,
  });
};

/* =========================================================
   SAVE F&F DRAFT
========================================================= */

const saveFnF = async ({
  companyCode,
  resignationId,
  actor,
  fnf,
}) => {
  validateFnf(fnf);

  actor = await withActorDisplayName(companyCode, actor);

  const resignation =
    await getResignationById({
      companyCode,
      resignationId,
    });

  if (
    resignation.status !==
    RESIGNATION_STATUS.FNF_PENDING
  ) {
    throw createError(
      `F&F cannot be edited in ${resignation.status} status.`,
      409,
      "INVALID_FNF_STATUS"
    );
  }

  const now = Date.now();

  await repository.update(
    companyCode,
    resignationId,
    {
      fnf,
      updatedAt: now,
      fnfLastSavedAt: now,
      fnfLastSavedBy:
        createActorSnapshot(actor),
    }
  );

  return getResignationById({
    companyCode,
    resignationId,
  });
};
/* =========================================================
   SUBMIT F&F FOR HR REVIEW
========================================================= */

const submitFnFForReview = async ({
  companyCode,
  resignationId,
  actor,
}) => {
  const resignation =
    await getResignationById({
      companyCode,
      resignationId,
    });

  if (
    resignation.status !==
    RESIGNATION_STATUS.FNF_PENDING
  ) {
    throw createError(
      `F&F cannot be submitted from ${resignation.status} status.`,
      409,
      "INVALID_FNF_STATUS"
    );
  }

  if (
    !resignation.fnf ||
    typeof resignation.fnf !== "object" ||
    Array.isArray(resignation.fnf)
  ) {
    throw createError(
      "Please complete F&F details before submitting.",
      400,
      "FNF_DETAILS_REQUIRED"
    );
  }

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.FNF_PENDING,
    ],

    action:
      RESIGNATION_ACTION.FNF_SUBMITTED,

    actor,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.FNF_REVIEW,

      fnfSubmittedAt:
        transitionAt,

      fnfSubmittedBy:
        createActorSnapshot(actor),
    }),
  });
};

/* =========================================================
   HR REVIEWS F&F
========================================================= */

const reviewFnF = async ({
  companyCode,
  resignationId,
  actor,
  remarks = "",
}) => {
  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.FNF_REVIEW,
    ],

    action:
      RESIGNATION_ACTION.FNF_REVIEWED,

    actor,

    remarks,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.FINANCE_PENDING,

      fnfReview: {
        decision: "APPROVED",

        remarks,

        reviewedBy:
          createActorSnapshot(actor),

        reviewedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   RETURN F&F TO EMPLOYEE
========================================================= */

const returnFnF = async ({
  companyCode,
  resignationId,
  actor,
  reason,
}) => {
  validateRejection(reason);

  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.FNF_REVIEW,
    ],

    action:
      RESIGNATION_ACTION.FNF_RETURNED,

    actor,

    remarks: reason,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.FNF_PENDING,

      fnfReturn: {
        reason,

        returnedBy:
          createActorSnapshot(actor),

        returnedAt: transitionAt,
      },
    }),
  });
};

/* =========================================================
   FINANCE APPROVE + EXIT
========================================================= */

const approveFinanceAndExit = async ({
  companyCode,
  resignationId,
  actor,
  remarks = "",
}) => {
  return transition({
    companyCode,
    resignationId,

    expectedStatuses: [
      RESIGNATION_STATUS.FINANCE_PENDING,
    ],

    action:
      RESIGNATION_ACTION.FINANCE_APPROVED,

    actor,

    remarks,

    buildUpdates: (
      current,
      { transitionAt }
    ) => ({
      status:
        RESIGNATION_STATUS.EXITED,

      financeApproval: {
        decision: "APPROVED",

        remarks,

        approvedBy:
          createActorSnapshot(actor),

        approvedAt: transitionAt,
      },

      exitedAt: transitionAt,
    }),
  });
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createResignation,

  getEmployeeResignations,
  getResignationsForViewer,
  getResignationById,

  approveByManager,
  rejectByManager,

  approveByHr,
  rejectByHr,

  submitEquipment,

  attachDocument,

  saveFnF,
  submitFnFForReview,
  reviewFnF,
  returnFnF,

  approveFinanceAndExit,
};