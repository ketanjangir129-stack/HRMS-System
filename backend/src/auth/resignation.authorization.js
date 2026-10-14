const repository = require("../modules/resignation/resignation.repository");
const employeeService = require("../services/employeeService")
const departmentService = require("../services/departmentService")


const verifyCompanyAccess = ({
  companyCode,
  user,
}) => {
  const tokenCompanyCode =
    String(user?.companyCode || "").toUpperCase();

  const requestedCompanyCode =
    String(companyCode || "").toUpperCase();

  if (
    !tokenCompanyCode ||
    tokenCompanyCode !== requestedCompanyCode
  ) {
    const error = new Error(
      "You are not authorized to access this company."
    );

    error.statusCode = 403;

    throw error;
  }

  return true;
};

const getResignationOrThrow = async ({
  companyCode,
  resignationId,
}) => {
  const resignation = await repository.findById(
    companyCode,
    resignationId
  );

  if (!resignation) {
    const error = new Error("Resignation not found");
    error.statusCode = 404;
    throw error;
  }

  return resignation;
};

const getEmployeeId = (user) => {
  return user?.employeeId
    ? String(user.employeeId).toUpperCase()
    : null;
};

const getRole = (user) => {
  return String(user?.role || "").toLowerCase();
};


/**
 * Employee can only access their own resignation.
 */
const verifyEmployeeOwner = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const loggedInEmployeeId =
    getEmployeeId(user);

  const resignationEmployeeId =
    resignation.employeeId
      ? String(
          resignation.employeeId
        ).toUpperCase()
      : null;

  if (
    !loggedInEmployeeId ||
    loggedInEmployeeId !==
      resignationEmployeeId
  ) {
    const error = new Error(
      "You are not authorized to access this resignation."
    );

    error.statusCode = 403;

    throw error;
  }

  return resignation;
};


/**
 * HR authorization.
 */
const verifyHR = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const role = getRole(user);

  const allowedRoles = [
    "hr",
    "hr_admin",
  ];

  if (!allowedRoles.includes(role)) {
    const error = new Error(
      "Only HR users can perform this action."
    );

    error.statusCode = 403;

    throw error;
  }

  return resignation;
};


/**
 * Finance authorization.
 *
 * There is no finance role — roles stay owner / hr / manager / employee.
 * Whoever sits in the Finance department as a Finance Executive or Finance
 * Manager may act. The department/designation live on the viewer's employee
 * record (the JWT only carries employeeId + role), so they are read from the
 * DB on every check rather than trusted from the token.
 */
const FINANCE_DEPARTMENT_KEY = "finance";

const FINANCE_DESIGNATIONS = new Set([
  "finance executive",
  "finance manager",
]);

const normalizeNameKey = (value) =>
  String(value ?? "").trim().toLowerCase();

const getViewerEmployee = async (companyCode, user) => {
  const rawId = String(user?.employeeId || "").trim();

  if (!rawId) return null;

  const upperId = rawId.toUpperCase();

  // Employee keys are stored upper-cased; fall back to the raw id for older
  // records written before that convention.
  const viewer =
    await employeeService.getEmployeeById(companyCode, upperId);

  if (viewer) return viewer;

  if (upperId !== rawId) {
    return employeeService.getEmployeeById(companyCode, rawId);
  }

  return null;
};

const isFinanceMember = (employee) => {
  if (!employee) return false;

  const department =
    employee?.employmentInfo?.department || employee?.department || "";

  const designation =
    employee?.employmentInfo?.designation || employee?.designation || "";

  if (normalizeNameKey(department) !== FINANCE_DEPARTMENT_KEY) {
    return false;
  }

  return FINANCE_DESIGNATIONS.has(normalizeNameKey(designation));
};

/*
| A resignation filed by a manager is approved on behalf of the manager by
| the owner alone — no department manager may approve or reject it at the
| manager step. Once the owner approves, the exit follows the regular flow
| (HR approval onwards) unchanged. The resigner role is read off their
| current employee record, not trusted from the request. Anything filed by a
| non-manager returns applies:false and the caller falls through to the
| regular checks unchanged.
*/
const verifyOwnerDecidesManagerResignation = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const resigner = await getViewerEmployee(companyCode, {
    employeeId: resignation?.employeeId,
  });

  const resignerRole = String(
    resigner?.account?.role || resigner?.role || ""
  )
    .trim()
    .toLowerCase();

  if (resignerRole !== "manager") {
    return { resignation, applies: false };
  }

  if (getRole(user) === "owner") {
    return { resignation, applies: true };
  }

  const error = new Error(
    "Only the owner can decide a manager's resignation."
  );

  error.statusCode = 403;

  throw error;
};

const verifyFinance = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const role = getRole(user);

  // Owner always passes; legacy finance roles keep working if any exist.
  if (role === "owner") return resignation;

  if (["finance", "finance_admin"].includes(role)) {
    return resignation;
  }

  const viewer = await getViewerEmployee(companyCode, user);

  if (isFinanceMember(viewer)) return resignation;

  const error = new Error(
    "Only members of the Finance department (Finance Executive / Finance Manager) can perform this action."
  );

  error.statusCode = 403;

  throw error;
};


/**
 * Owner authorization.
 *
 * Owner is your company-level administrator.
 */
const verifyOwner = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const role = getRole(user);

  if (role !== "owner") {
    const error = new Error(
      "Only the owner can perform this action."
    );

    error.statusCode = 403;

    throw error;
  }

  return resignation;
};
const verifyManager = async ({
  companyCode,
  resignationId,
  user,
}) => {
  const resignation =
    await getResignationOrThrow({
      companyCode,
      resignationId,
    });

  const loggedInEmployeeId =
    String(user?.employeeId || "")
      .trim()
      .toUpperCase();

  if (!loggedInEmployeeId) {
    const error = new Error(
      "Authenticated employee not found."
    );

    error.statusCode = 403;
    throw error;
  }

  // Get employee who submitted resignation
  const employee =
    await employeeService.getEmployeeById(
      companyCode,
      resignation.employeeId
    );

  if (!employee) {
    const error = new Error(
      "Resignation employee not found."
    );

    error.statusCode = 404;
    throw error;
  }

  // Get department ID from employee (fall back to resolving by
  // department name — older records may only carry the name).
  let departmentId =
    employee?.employmentInfo?.departmentId ||
    resignation?.departmentId ||
    null;

  let department = null;

  if (departmentId) {
    // Get department
    department =
      await departmentService.getDepartmentById(
        companyCode,
        departmentId
      );
  }

  if (!department) {
    const employeeDepartmentName =
      employee?.employmentInfo
        ?.department ||
      employee?.department ||
      resignation?.department ||
      resignation?.employeeSnapshot
        ?.department ||
      "";

    const departmentKey = String(
      employeeDepartmentName || ""
    )
      .trim()
      .toLowerCase();

    if (departmentKey) {
      const departments =
        (await departmentService.getDepartments(
          companyCode
        )) || {};

      const match = Object.entries(
        departments
      ).find(
        ([, item]) =>
          String(item?.name || "")
            .trim()
            .toLowerCase() === departmentKey
      );

      if (match) {
        departmentId = match[0];
        department = {
          departmentId,
          ...match[1],
        };
      }
    }
  }

  if (!department) {
    const error = new Error(
      departmentId
        ? "Employee department not found."
        : "Employee department is not assigned."
    );

    error.statusCode = departmentId
      ? 404
      : 400;
    throw error;
  }

  // Get department manager
  const assignedManagerId =
    String(
      department?.manager?.employeeId || ""
    )
      .trim()
      .toUpperCase();

  if (!assignedManagerId) {
    const error = new Error(
      "No manager is assigned to this department."
    );

    error.statusCode = 403;
    throw error;
  }

  // Verify logged-in employee is the department manager
  if (
    loggedInEmployeeId !==
    assignedManagerId
  ) {
    const error = new Error(
      "You are not the assigned manager for this employee."
    );

    error.statusCode = 403;
    throw error;
  }

  return resignation;
};

module.exports = {
  verifyCompanyAccess,
  getResignationOrThrow,
  verifyEmployeeOwner,
  verifyHR,
  verifyFinance,
  verifyOwner,
  verifyManager,
  getViewerEmployee,
  isFinanceMember,
  verifyOwnerDecidesManagerResignation,
  FINANCE_DEPARTMENT_KEY,
  FINANCE_DESIGNATIONS,
};