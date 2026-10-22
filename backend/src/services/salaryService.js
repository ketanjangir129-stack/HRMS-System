const db = require("../config/firebase");
const {
  getPolicy,
  calculateStatutoryDeductions,
} = require("./statutorycomplianceService");

/*
|--------------------------------------------------------------------------
| Salary Service — create
|--------------------------------------------------------------------------
| Backend port of the frontend create path (`SalaryService.createSalary` /
| `addSalary`). The frontend remains untouched; this is the API the frontend
| will be wired to once tested.
|
| Storage: companies/{companyCode}/salaries/{employeeId}
|   { employeeId, earnings, deductions, grossSalary, totalDeduction,
|     netSalary, effectiveFrom, status, createdAt, updatedAt }
|
| PF, ESI, Professional Tax and Income Tax are priced server-side from the
| stored Statutory Compliance policy — never trusted from the client.
| `loan` and `other` are the only client-supplied deductions.
|--------------------------------------------------------------------------
*/

const EARNING_KEYS = [
  "basic",
  "hra",
  "da",
  "conveyance",
  "medical",
  "specialAllowance",
  "bonus",
];

const MANUAL_DEDUCTION_KEYS = ["loan", "other"];

function fail(message, statusCode = 400, code = "BAD_REQUEST") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function validationFail(message, errors) {
  const error = new Error(message);
  error.statusCode = 422;
  error.code = "VALIDATION_FAILED";
  error.errors = errors;
  throw error;
}

function companyRoot(companyCode) {
  if (!companyCode || typeof companyCode !== "string") {
    fail("A valid company code is required.", 400);
  }
  return `companies/${companyCode}`;
}

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeId = (value) => String(value ?? "").trim();

const salaryRef = (companyCode, employeeId) =>
  db.ref(`${companyRoot(companyCode)}/salaries/${normalizeId(employeeId)}`);

// Employee may be keyed by raw id or uppercase id — accept either, same as
// the reads the salary screens already rely on.
const findEmployee = async (companyCode, employeeId) => {
  const id = normalizeId(employeeId);

  if (!id) return null;

  const direct = await db
    .ref(`${companyRoot(companyCode)}/employees/${id}`)
    .once("value");

  if (direct.exists()) return { key: id, ...direct.val() };

  const upper = await db
    .ref(`${companyRoot(companyCode)}/employees/${id.toUpperCase()}`)
    .once("value");

  if (upper.exists()) return { key: id.toUpperCase(), ...upper.val() };

  const all = await db.ref(`${companyRoot(companyCode)}/employees`).once("value");
  const employees = all.val() || {};

  const match = Object.entries(employees).find(
    ([, record]) =>
      String(record?.employmentInfo?.employeeId ?? "").trim().toLowerCase() ===
      id.toLowerCase()
  );

  return match ? { key: match[0], ...match[1] } : null;
};

const validatePayload = (payload) => {
  const errors = {};
  const body = payload || {};

  const employeeId = normalizeId(body.employeeId);

  if (!employeeId) {
    errors.employeeId = "Employee ID is required.";
  }

  const earnings = body.earnings || {};
  const earningErrors = {};

  for (const key of EARNING_KEYS) {
    const raw = earnings[key];

    if (raw === "" || raw === null || raw === undefined) continue;

    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount < 0) {
      earningErrors[key] = `${key} must be a non-negative number.`;
    }
  }

  if (Object.keys(earningErrors).length) {
    errors.earnings = earningErrors;
  }

  const deductions = body.deductions || {};
  const deductionErrors = {};

  for (const key of MANUAL_DEDUCTION_KEYS) {
    const raw = deductions[key];

    if (raw === "" || raw === null || undefined === raw) continue;

    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount < 0) {
      deductionErrors[key] = `${key} must be a non-negative number.`;
    }
  }

  if (Object.keys(deductionErrors).length) {
    errors.deductions = deductionErrors;
  }

  if (body.effectiveFrom !== undefined && body.effectiveFrom !== null) {
    const date = String(body.effectiveFrom).trim();

    if (!date) {
      errors.effectiveFrom = "Effective date is required.";
    }
  }

  if (Object.keys(errors).length) {
    const [first] =
      Object.values(errors).flatMap((value) =>
        typeof value === "object" ? Object.values(value) : [value]
      ) || [];

    validationFail(first || "Invalid salary details.", errors);
  }

  return { employeeId, earnings, deductions };
};

const createSalary = async (companyCode, payload, { updatedBy = null } = {}) => {
  const { employeeId, earnings } = validatePayload(payload);
  const manualDeductions = payload?.deductions || {};

  const employee = await findEmployee(companyCode, employeeId);

  if (!employee) {
    fail("Employee not found.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const existing = await salaryRef(companyCode, employeeId).once("value");

  if (existing.exists()) {
    fail("Salary already assigned.", 409, "SALARY_EXISTS");
  }

  const policy = await getPolicy(companyCode);

  const statutory = calculateStatutoryDeductions({
    earnings,
    policy,
  });

  const cleanEarnings = EARNING_KEYS.reduce((clean, key) => {
    clean[key] = toAmount(earnings[key]);
    return clean;
  }, {});

  const deductions = {
    pf: statutory.pf ?? 0,
    esi: statutory.esi ?? 0,
    professionalTax: statutory.professionalTax ?? 0,
    incomeTax: statutory.incomeTax ?? 0,
    loan: toAmount(manualDeductions.loan),
    other: toAmount(manualDeductions.other),
  };

  const grossSalary = Object.values(cleanEarnings).reduce(
    (total, value) => total + value,
    0
  );

  const totalDeduction = Object.values(deductions).reduce(
    (total, value) => total + value,
    0
  );

  const netSalary = grossSalary - totalDeduction;

  if (grossSalary <= 0) {
    validationFail("Add at least one earning to assign a salary.", {
      earnings: "Add at least one earning to assign a salary.",
    });
  }

  const now = Date.now();

  const salary = {
    employeeId,
    earnings: cleanEarnings,
    deductions,
    grossSalary,
    totalDeduction,
    netSalary,
    effectiveFrom: payload?.effectiveFrom ?? null,
    status: payload?.status ?? "Active",
    createdAt: now,
    updatedAt: now,
    ...(updatedBy ? { createdBy: updatedBy } : {}),
  };

  await salaryRef(companyCode, employeeId).set(salary);

  return { employeeId, salary };
};

const getSalaryById = async (companyCode, employeeId) => {
  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const snapshot = await salaryRef(companyCode, id).once("value");

  if (!snapshot.exists()) {
    fail("Salary not found.", 404, "SALARY_NOT_FOUND");
  }

  return { employeeId: id, ...snapshot.val() };
};

const getAllSalaries = async (companyCode) => {
  const snapshot = await db
    .ref(`${companyRoot(companyCode)}/salaries`)
    .once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() || {};
  return Object.entries(data).map(([employeeId, salary]) => ({
    employeeId,
    ...salary,
  }));
};

const updateSalary = async (
  companyCode,
  employeeId,
  payload,
  { updatedBy = null } = {}
) => {
  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const ref = salaryRef(companyCode, id);
  const snapshot = await ref.once("value");

  if (!snapshot.exists()) {
    fail("Salary not found.", 404, "SALARY_NOT_FOUND");
  }

  const existing = snapshot.val() || {};

  // Same validation/pricing as create — statutory deductions are
  // recalculated server-side from the current policy.
  const { earnings } = validatePayload({ ...(payload || {}), employeeId: id });
  const manualDeductions = payload?.deductions || {};

  const policy = await getPolicy(companyCode);

  const statutory = calculateStatutoryDeductions({
    earnings,
    policy,
  });

  const cleanEarnings = EARNING_KEYS.reduce((clean, key) => {
    clean[key] = toAmount(earnings[key]);
    return clean;
  }, {});

  const deductions = {
    pf: statutory.pf ?? 0,
    esi: statutory.esi ?? 0,
    professionalTax: statutory.professionalTax ?? 0,
    incomeTax: statutory.incomeTax ?? 0,
    loan: toAmount(manualDeductions.loan),
    other: toAmount(manualDeductions.other),
  };

  const grossSalary = Object.values(cleanEarnings).reduce(
    (total, value) => total + value,
    0
  );

  const totalDeduction = Object.values(deductions).reduce(
    (total, value) => total + value,
    0
  );

  const netSalary = grossSalary - totalDeduction;

  if (grossSalary <= 0) {
    validationFail("Add at least one earning to assign a salary.", {
      earnings: "Add at least one earning to assign a salary.",
    });
  }

  const now = Date.now();

  // Archive the pre-update structure before replacing it — same history
  // layout the frontend used (`salaryHistory/{employeeId}/{timestamp}`).
  await db
    .ref(`${companyRoot(companyCode)}/salaryHistory/${id}/${now}`)
    .set({
      ...existing,
      employeeId: id,
      updatedBy,
      updatedAt: now,
    });

  const salary = {
    employeeId: id,
    earnings: cleanEarnings,
    deductions,
    grossSalary,
    totalDeduction,
    netSalary,
    effectiveFrom: payload?.effectiveFrom ?? existing.effectiveFrom ?? null,
    status: payload?.status ?? existing.status ?? "Active",
    createdAt: existing.createdAt ?? now,
    ...(existing.createdBy ? { createdBy: existing.createdBy } : {}),
    updatedAt: now,
    ...(updatedBy ? { updatedBy } : {}),
  };

  await ref.set(salary);

  return { employeeId: id, salary };
};

const MAX_IMPORT_ROWS = 1000;

const importSalaries = async (
  companyCode,
  rows,
  { updateExisting = false, updatedBy = null } = {}
) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    fail("At least one salary row is required.", 400);
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    fail(`A maximum of ${MAX_IMPORT_ROWS} rows can be imported at once.`, 400);
  }

  const results = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    const id = normalizeId(row.employeeId);

    if (!id) {
      results.push({
        rowIndex: index,
        employeeId: null,
        outcome: "failed",
        message: "Employee ID is required.",
      });
      continue;
    }

    try {
      const existing = await salaryRef(companyCode, id).once("value");

      if (existing.exists() && !updateExisting) {
        results.push({
          rowIndex: index,
          employeeId: id,
          outcome: "skipped",
          message: "Already has a salary structure.",
        });
        continue;
      }

      if (existing.exists()) {
        await updateSalary(companyCode, id, row, { updatedBy });
        results.push({
          rowIndex: index,
          employeeId: id,
          outcome: "updated",
          message: "Salary updated.",
        });
      } else {
        await createSalary(companyCode, { ...row, employeeId: id }, { updatedBy });
        results.push({
          rowIndex: index,
          employeeId: id,
          outcome: "created",
          message: "Salary assigned.",
        });
      }
    } catch (error) {
      // A structure that appeared between the check and the write is a
      // skip, not a failure — same as the pre-check verdict.
      if (error.code === "SALARY_EXISTS" && !updateExisting) {
        results.push({
          rowIndex: index,
          employeeId: id,
          outcome: "skipped",
          message: "Already has a salary structure.",
        });
        continue;
      }

      console.error(`Salary import row ${index} failed:`, error);
      results.push({
        rowIndex: index,
        employeeId: id,
        outcome: "failed",
        message: error.message || "Could not save this salary.",
      });
    }
  }

  const summary = results.reduce(
    (counts, result) => {
      counts.total += 1;
      counts[result.outcome] = (counts[result.outcome] || 0) + 1;
      return counts;
    },
    { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 }
  );

  return { results, summary };
};

// Export returns the same salary record shape as the list read — the Excel
// layout is built entirely on the frontend, so the file never changes.
const exportSalaries = async (companyCode, employeeIds = null) => {
  const salaries = await getAllSalaries(companyCode);

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return salaries;
  }

  const wanted = new Set(employeeIds.map((id) => normalizeId(id)));

  return salaries.filter((salary) => wanted.has(normalizeId(salary.employeeId)));
};

// A history record holds the salary before the change, so the structure a
// revision produced is the next newer record — or the live salary for the
// latest one. Same enrichment the revisions screen builds client-side.
const buildRevisions = (historyByEmployee, currentSalaries, employees) => {
  const revisions = [];

  Object.keys(historyByEmployee).forEach((employeeId) => {
    const records = Object.keys(historyByEmployee[employeeId])
      .map((id) => ({
        id,
        ...historyByEmployee[employeeId][id],
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const employee = employees?.[employeeId];

    records.forEach((record, index) => {
      const current =
        index === 0 ? currentSalaries[employeeId] : records[index - 1];

      revisions.push({
        id: `${employeeId}-${record.id}`,
        employeeId,
        employeeName: employee?.personalInfo?.name || employeeId,
        department: employee?.employmentInfo?.department || "—",
        designation: employee?.employmentInfo?.designation || "—",
        revisionNumber: records.length - index,
        updatedAt: record.updatedAt,
        updatedBy: record.updatedBy,
        previous: record,
        current: current || null,
      });
    });
  });

  return revisions.sort((a, b) => b.updatedAt - a.updatedAt);
};

const readRevisionsData = async (companyCode) => {
  const [historySnap, salariesSnap, employeesSnap] = await Promise.all([
    db.ref(`${companyRoot(companyCode)}/salaryHistory`).once("value"),
    db.ref(`${companyRoot(companyCode)}/salaries`).once("value"),
    db.ref(`${companyRoot(companyCode)}/employees`).once("value"),
  ]);

  const historyByEmployee = historySnap.val() || {};

  const salaries = salariesSnap.val() || {};
  const currentSalaries = {};
  Object.entries(salaries).forEach(([employeeId, salary]) => {
    currentSalaries[employeeId] = { employeeId, ...salary };
  });

  return {
    historyByEmployee,
    currentSalaries,
    employees: employeesSnap.val() || {},
  };
};

const getSalaryRevisions = async (companyCode) => {
  const { historyByEmployee, currentSalaries, employees } =
    await readRevisionsData(companyCode);

  if (Object.keys(historyByEmployee).length === 0) {
    return [];
  }

  return buildRevisions(historyByEmployee, currentSalaries, employees);
};

const getSalaryRevisionById = async (companyCode, employeeId) => {
  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const { historyByEmployee, currentSalaries, employees } =
    await readRevisionsData(companyCode);

  if (!historyByEmployee[id]) {
    return [];
  }

  return buildRevisions({ [id]: historyByEmployee[id] }, currentSalaries, employees);
};

module.exports = {
  createSalary,
  getSalaryById,
  getAllSalaries,
  updateSalary,
  importSalaries,
  exportSalaries,
  getSalaryRevisions,
  getSalaryRevisionById,
};
