const db = require("../config/firebase");
const { getAllSalaries } = require("./salaryService");
const { getEmployees } = require("./employeeService");

/*
|--------------------------------------------------------------------------
| Payroll Service
|--------------------------------------------------------------------------
| All payroll calculation lives here, on the backend. The frontend previously
| priced months itself against Firebase reads; that path is being retired, so
| every figure below is produced server-side from the same rules:
|
| - Salary structure as stored (earnings + deductions, repriced totals).
| - Attendance summary derived from the attendance tree + holiday calendar.
| - Loss of pay from absent + unpaid leave + half days (0.5 each).
| - Overtime paid at the employee's own hourly rate (multiplier 1).
| - Run lifecycle Pending -> Generated -> Approved -> Locked, forward only.
|
| Storage:
|   companies/{companyCode}/payroll/runs/{YYYY-MM}
|   companies/{companyCode}/payroll/records/{YYYY-MM}/{employeeId}
|
| What is stored is a snapshot, not references. Reads never recalculate —
| `generatePayroll` is the only thing that prices a month.
|--------------------------------------------------------------------------
*/

const PAYROLL_RUNS_NODE = "runs";
const PAYROLL_RECORDS_NODE = "records";

const PAYROLL_STATUS = {
  GENERATED: "Generated",
  PAID: "Paid",
};

const PAYROLL_RUN_STATUS = {
  GENERATED: "Generated",
  APPROVED: "Approved",
  LOCKED: "Locked",
};

const PAYROLL_PENDING = "Pending";

const HALF_DAY_LOP = 0.5;
const OVERTIME_RATE_MULTIPLIER = 1;

/*
| The default working day (09:30–18:30 = 540 minutes), deliberately not the
| company's configured one: an hourly rate that moved with office-hours
| settings would reprice overtime that was already paid.
*/
const DEFAULT_WORK_DAY_MINUTES = 540;
const HOURS_PER_DAY = DEFAULT_WORK_DAY_MINUTES / 60;

// `Date.getDay()` numbers; Sunday by default.
const WEEKLY_OFF_DAYS = [0];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PAYSLIP_MONTHS = 3;

const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  LEAVE: "Leave",
  HALF_DAY: "Half Day",
};

const PAYROLL_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(message, statusCode = 400, code = "BAD_REQUEST") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function companyRoot(companyCode) {
  if (!companyCode || typeof companyCode !== "string") {
    fail("A valid company code is required.", 400);
  }
  return `companies/${companyCode}`;
}

const normalizeId = (value) => String(value ?? "").trim();

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const roundHours = (value) => Math.round((Number(value) || 0) * 100) / 100;

const sum = (values = {}) =>
  Object.values(values).reduce((total, value) => total + (Number(value) || 0), 0);

/* Today as YYYY-MM-DD in Asia/Kolkata — matches the timezone daily punches
| are stored under. */
const getTodayKey = (timeZone = "Asia/Kolkata") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
};

const getMonthDateKeys = (year, month) => {
  const days = new Date(year, month, 0).getDate();
  const keys = [];

  for (let day = 1; day <= days; day += 1) {
    keys.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }

  return keys;
};

const getMonthName = (month) => MONTHS[month - 1] || null;

const parsePayrollMonth = (payrollMonth) => {
  const value = String(payrollMonth || "");

  if (!PAYROLL_MONTH_PATTERN.test(value)) return null;

  const [year, month] = value.split("-").map(Number);

  if (!year || month < 1 || month > 12) return null;

  return { year, month };
};

const isPayrollMonth = (payrollMonth) => Boolean(parsePayrollMonth(payrollMonth));

const requirePayrollMonth = (payrollMonth) => {
  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) {
    fail("Select a valid payroll month.", 400, "INVALID_PAYROLL_MONTH");
  }

  return parsed;
};

const shiftPayrollMonth = (payrollMonth, offset) => {
  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) return "";

  const cursor = new Date(parsed.year, parsed.month - 1 + offset, 1);

  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
};

const getRecentPayrollMonths = (payrollMonth, count = PAYSLIP_MONTHS) => {
  if (!isPayrollMonth(payrollMonth)) return [];

  const months = [];

  for (let index = 0; index < Math.max(0, count); index += 1) {
    const shifted = shiftPayrollMonth(payrollMonth, -index);
    if (shifted) months.push(shifted);
  }

  return months;
};

const getPayPeriod = (payrollMonth) => {
  const parsed = parsePayrollMonth(payrollMonth);

  if (!parsed) {
    return { fromDate: "", toDate: "", payDate: "" };
  }

  const dateKeys = getMonthDateKeys(parsed.year, parsed.month);
  const fromDate = dateKeys[0] || "";
  const toDate = dateKeys[dateKeys.length - 1] || "";

  return { fromDate, toDate, payDate: toDate };
};

/* "9h 15m" -> minutes. Anything else is 0. */
const parseWorkingMinutes = (value = "") => {
  const match = String(value).match(/(\d+)h\s*(\d+)m/);

  if (!match) return 0;

  return Number(match[1]) * 60 + Number(match[2]);
};

const formatWorkingMinutes = (minutes = 0) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const isWeeklyOff = (dateKey) => {
  if (!DATE_KEY_PATTERN.test(String(dateKey || ""))) return false;

  const [year, month, day] = String(dateKey).split("-").map(Number);

  return WEEKLY_OFF_DAYS.includes(new Date(year, month - 1, day).getDay());
};

const toHolidaySet = (holidays) => {
  if (!holidays) return new Set();
  if (holidays instanceof Set) return holidays;

  if (Array.isArray(holidays)) {
    return new Set(
      holidays
        .map((item) => (typeof item === "string" ? item : item?.date))
        .filter(Boolean)
    );
  }

  return new Set(Object.keys(holidays));
};

const isPaidLeave = (record, manualLeaveIsPaid) =>
  Boolean(record?.leaveRequestId) || manualLeaveIsPaid;

const overtimeMinutesOf = (workedMinutes) =>
  Math.max(0, workedMinutes - DEFAULT_WORK_DAY_MINUTES);

/*
| One employee's month reduced to the counts payroll is priced from. Every
| day of the calendar is classified; an elapsed working day with no record
| is an absence, and a working day that has not happened yet stays in the
| divisor (pendingDays) instead of pro-rating the month down.
*/
const buildMonthlyAttendanceSummary = ({
  employeeId,
  year,
  month,
  monthRecords = {},
  holidayDates = [],
  today = getTodayKey(),
  manualLeaveIsPaid = false,
}) => {
  const summary = {
    workingDays: 0,
    present: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    holiday: 0,
    weeklyOff: 0,
    overtimeHours: 0,
    pendingDays: 0,
  };

  const dateKeys = getMonthDateKeys(year, month);

  if (!employeeId || dateKeys.length === 0) {
    return { ...summary, totalDays: 0, workedHours: "0h 0m" };
  }

  const holidays = toHolidaySet(holidayDates);

  let workedMinutes = 0;
  let overtimeMinutes = 0;

  dateKeys.forEach((date) => {
    if (holidays.has(date)) {
      summary.holiday += 1;
      return;
    }

    if (isWeeklyOff(date)) {
      summary.weeklyOff += 1;
      return;
    }

    summary.workingDays += 1;

    if (date > today) {
      summary.pendingDays += 1;
      return;
    }

    const record = monthRecords?.[date]?.[employeeId];

    if (!record) {
      summary.absent += 1;
      return;
    }

    const minutes = parseWorkingMinutes(record.workingHours);

    workedMinutes += minutes;
    overtimeMinutes += overtimeMinutesOf(minutes);

    switch (record.status) {
      case ATTENDANCE_STATUS.PRESENT:
        summary.present += 1;
        break;
      case ATTENDANCE_STATUS.LATE:
        summary.late += 1;
        break;
      case ATTENDANCE_STATUS.HALF_DAY:
        summary.halfDay += 1;
        break;
      case ATTENDANCE_STATUS.LEAVE:
        if (isPaidLeave(record, manualLeaveIsPaid)) {
          summary.paidLeave += 1;
        } else {
          summary.unpaidLeave += 1;
        }
        break;
      case ATTENDANCE_STATUS.ABSENT:
        summary.absent += 1;
        break;
      default:
        if (record.punchIn) {
          summary.present += 1;
        } else {
          summary.absent += 1;
        }
        break;
    }
  });

  return {
    ...summary,
    overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
    totalDays: dateKeys.length,
    workedHours: formatWorkingMinutes(workedMinutes),
  };
};

const buildMonthlyAttendanceSummaries = ({
  employeeIds = [],
  year,
  month,
  monthRecords = {},
  holidayDates = [],
  today = getTodayKey(),
  manualLeaveIsPaid = false,
}) =>
  employeeIds.reduce((summaries, employeeId) => {
    summaries[employeeId] = buildMonthlyAttendanceSummary({
      employeeId,
      year,
      month,
      monthRecords,
      holidayDates,
      today,
      manualLeaveIsPaid,
    });

    return summaries;
  }, {});

/*
| Prices one employee's month. Totals are recomputed from the fields rather
| than trusted from the salary record. The divisor is the month's working
| days, never calendar days; charged LOP days are capped at the month.
*/
const calculateLossOfPayDays = (summary = {}) =>
  (Number(summary.absent) || 0) +
  (Number(summary.unpaidLeave) || 0) +
  (Number(summary.halfDay) || 0) * HALF_DAY_LOP;

const calculatePayroll = (
  salary,
  summary = {},
  { overtimeMultiplier = OVERTIME_RATE_MULTIPLIER } = {}
) => {
  const earnings = salary?.earnings || {};
  const deductions = salary?.deductions || {};

  const grossSalary = roundMoney(sum(earnings));
  const structureDeductions = roundMoney(sum(deductions));

  const workingDays = Number(summary.workingDays) || 0;
  const perDaySalary = workingDays ? roundMoney(grossSalary / workingDays) : 0;
  const perHourSalary = roundMoney(perDaySalary / HOURS_PER_DAY);

  const lopDays = calculateLossOfPayDays(summary);
  const chargedLopDays = Math.min(lopDays, workingDays);
  const payableDays = roundHours(workingDays - chargedLopDays);
  const lopDeduction = roundMoney(perDaySalary * chargedLopDays);

  const overtimeHours = roundHours(summary.overtimeHours);
  const overtimeRate = roundMoney(perHourSalary * overtimeMultiplier);
  const overtimePay = roundMoney(overtimeHours * overtimeRate);

  const totalEarnings = roundMoney(grossSalary + overtimePay);
  const totalDeductions = roundMoney(structureDeductions + lopDeduction);

  return {
    grossSalary,
    perDaySalary,
    perHourSalary,
    workingDays,
    lopDays: roundHours(chargedLopDays),
    payableDays,
    lopDeduction,
    overtimeHours,
    overtimeRate,
    overtimePay,
    totalEarnings,
    structureDeductions,
    totalDeductions,
    netPayable: roundMoney(totalEarnings - totalDeductions),
  };
};

/* Run lifecycle: Pending -> Generated -> Approved -> Locked, forward only. */
const RUN_STAGE = {
  [PAYROLL_PENDING]: 0,
  [PAYROLL_RUN_STATUS.GENERATED]: 1,
  [PAYROLL_RUN_STATUS.APPROVED]: 2,
  [PAYROLL_RUN_STATUS.LOCKED]: 3,
};

const getRunStatus = (run) => {
  const status = run?.status;
  return status && status in RUN_STAGE ? status : PAYROLL_PENDING;
};

const stageOf = (run) => RUN_STAGE[getRunStatus(run)];
const isRunLocked = (run) => stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.LOCKED];

const allow = () => ({ allowed: true, reason: "" });
const refuse = (reason) => ({ allowed: false, reason });

const canGenerateRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is locked and cannot be generated again.");
  }

  if (stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.APPROVED]) {
    return refuse("This month has been approved. Generating is closed.");
  }

  return allow();
};

const canApproveRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is locked.");
  }

  if (stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.APPROVED]) {
    return refuse("This month has already been approved.");
  }

  if (stageOf(run) < RUN_STAGE[PAYROLL_RUN_STATUS.GENERATED]) {
    return refuse("Generate the payroll before approving it.");
  }

  return allow();
};

const canLockRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is already locked.");
  }

  if (stageOf(run) < RUN_STAGE[PAYROLL_RUN_STATUS.APPROVED]) {
    return refuse("Approve the payroll before locking it.");
  }

  return allow();
};

const canEditRun = (run) =>
  isRunLocked(run)
    ? refuse("This month is locked and can no longer be changed.")
    : allow();

const buildRunTotals = (records = {}) => {
  const list = Object.values(records || {});

  const total = (read) =>
    roundMoney(list.reduce((total, record) => total + (Number(read(record)) || 0), 0));

  return {
    totalEmployees: list.length,
    totalGross: total((record) => record?.calculation?.grossSalary),
    totalDeductions: total((record) => record?.calculation?.totalDeductions),
    totalNet: total((record) => record?.calculation?.netPayable),
  };
};

/* Firebase paths. */
const payrollRoot = (companyCode) => `${companyRoot(companyCode)}/payroll`;
const runRef = (companyCode, payrollMonth) =>
  db.ref(`${payrollRoot(companyCode)}/${PAYROLL_RUNS_NODE}/${normalizeId(payrollMonth)}`);
const recordsRef = (companyCode, payrollMonth) =>
  db.ref(`${payrollRoot(companyCode)}/${PAYROLL_RECORDS_NODE}/${normalizeId(payrollMonth)}`);
const recordRef = (companyCode, payrollMonth, employeeId) =>
  db.ref(
    `${payrollRoot(companyCode)}/${PAYROLL_RECORDS_NODE}/${normalizeId(payrollMonth)}/${normalizeId(employeeId)}`
  );
const legacyMonthRef = (companyCode, payrollMonth) =>
  db.ref(`${payrollRoot(companyCode)}/${normalizeId(payrollMonth)}`);

const readValue = async (reference) => {
  const snapshot = await reference.once("value");
  return snapshot.exists() ? snapshot.val() : null;
};

const readMonthRecords = async (companyCode, payrollMonth) => {
  const records = await readValue(recordsRef(companyCode, payrollMonth));

  if (records) return { records, legacy: false };

  const legacyRecords = await readValue(legacyMonthRef(companyCode, payrollMonth));

  return { records: legacyRecords || {}, legacy: Boolean(legacyRecords) };
};

const migrateLegacyRecords = async (companyCode, payrollMonth, records) => {
  await recordsRef(companyCode, payrollMonth).set(records || {});
  await legacyMonthRef(companyCode, payrollMonth).remove();
};

const readRunState = async (companyCode, payrollMonth) => {
  const [run, { records, legacy }] = await Promise.all([
    readValue(runRef(companyCode, payrollMonth)),
    readMonthRecords(companyCode, payrollMonth),
  ]);

  if (run) return { run, records, legacy };

  if (Object.keys(records).length === 0) {
    return { run: null, records, legacy };
  }

  return {
    run: {
      payrollMonth: normalizeId(payrollMonth),
      status: PAYROLL_RUN_STATUS.GENERATED,
      ...buildRunTotals(records),
      generatedAt: 0,
      generatedBy: null,
    },
    records,
    legacy,
  };
};

const readAttendanceMonth = async (companyCode, year, month) => {
  const monthName = getMonthName(month);

  if (!monthName) return {};

  const snapshot = await db
    .ref(`${companyRoot(companyCode)}/attendance/records/${year}/${monthName}`)
    .once("value");

  return snapshot.val() || {};
};

/* An unreachable holiday calendar never stops a summary — it comes back
| empty and the month is summarised without declared holidays. */
const readHolidayDates = async (companyCode, year) => {
  try {
    const snapshot = await db
      .ref(`${companyRoot(companyCode)}/holidays/${year}`)
      .once("value");

    if (!snapshot.exists()) return [];

    return Object.values(snapshot.val() || {})
      .flatMap((monthNode) => Object.values(monthNode || {}))
      .map((holiday) => holiday?.date)
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to load holidays for the payroll summary:", error);
    return [];
  }
};

const getPayrollRun = async (companyCode, payrollMonth) => {
  requirePayrollMonth(payrollMonth);
  return readValue(runRef(companyCode, payrollMonth));
};

const getMonthlyPayroll = async (companyCode, payrollMonth) => {
  requirePayrollMonth(payrollMonth);
  return (await readMonthRecords(companyCode, payrollMonth)).records;
};

const getPayroll = async (companyCode, payrollMonth, employeeId) => {
  requirePayrollMonth(payrollMonth);

  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const record = await readValue(recordRef(companyCode, payrollMonth, id));

  if (record) return record;

  return readValue(
    db.ref(`${companyRoot(companyCode)}/payroll/${normalizeId(payrollMonth)}/${id}`)
  );
};

/*
| One employee's payroll across a span of months, each month with its run
| attached (a payslip is released only once its month is locked).
*/
const getEmployeePayrollMonths = async (companyCode, employeeId, payrollMonths = []) => {
  const months = (payrollMonths || []).filter(isPayrollMonth);
  const id = normalizeId(employeeId);

  if (!id || months.length === 0) {
    return [];
  }

  const entries = await Promise.all(
    months.map(async (month) => {
      const [payroll, run] = await Promise.all([
        getPayroll(companyCode, month, id),
        getPayrollRun(companyCode, month),
      ]);

      return payroll ? { ...payroll, payrollMonth: month, run } : null;
    })
  );

  return entries.filter(Boolean);
};

const getPayrollHistory = async (
  companyCode,
  employeeId,
  payrollMonth,
  months = PAYSLIP_MONTHS
) =>
  getEmployeePayrollMonths(
    companyCode,
    employeeId,
    getRecentPayrollMonths(payrollMonth, months)
  );

const getEmployeesWithPayrollStatus = async (companyCode, payrollMonth) => {
  requirePayrollMonth(payrollMonth);

  const [employees, { run, records }] = await Promise.all([
    getEmployees(companyCode),
    readRunState(companyCode, payrollMonth),
  ]);

  const rows = Object.keys(employees || {}).map((employeeId) => {
    const employee = employees[employeeId];
    const payroll = records?.[employeeId] || null;

    return {
      employeeId,
      name: employee.personalInfo?.name,
      department: employee.employmentInfo?.department,
      designation: employee.employmentInfo?.designation,
      payrollGenerated: Boolean(payroll),
      netPayable: payroll?.calculation?.netPayable ?? null,
      payrollStatus: payroll?.status || "",
    };
  });

  return { employees: rows, run };
};

const buildPayrollSnapshot = ({
  employeeId,
  employee,
  salary,
  summary,
  payrollMonth,
  generatedBy,
}) => {
  const calculation = calculatePayroll(salary, summary);
  const { fromDate, toDate, payDate } = getPayPeriod(payrollMonth);

  return {
    employeeId,
    employee: {
      name: employee?.personalInfo?.name || employeeId,
      email: employee?.personalInfo?.email || "",
      department: employee?.employmentInfo?.department || "",
      designation: employee?.employmentInfo?.designation || "",
      joiningDate: employee?.employmentInfo?.joiningDate || "",
      employeeType: employee?.employmentInfo?.employeeType || "",
      bankName: employee?.bankInfo?.bankName || "",
      accountNumber: employee?.bankInfo?.accountNumber || "",
    },
    salary: {
      earnings: salary?.earnings || {},
      deductions: salary?.deductions || {},
      effectiveFrom: salary?.effectiveFrom || "",
    },
    attendanceSummary: summary,
    calculation,
    payPeriod: { fromDate, toDate, payDate },
    status: PAYROLL_STATUS.GENERATED,
    generatedAt: Date.now(),
    generatedBy: {
      employeeId: generatedBy?.employeeId || "unknown",
      name: generatedBy?.name || "Unknown",
      role: generatedBy?.role || "unknown",
    },
  };
};

const writeRun = async (companyCode, payrollMonth, { run, records, generatedBy }) => {
  const stamped = {
    payrollMonth: normalizeId(payrollMonth),
    status: run?.status || PAYROLL_RUN_STATUS.GENERATED,
    ...buildRunTotals(records),
    generatedAt: run?.generatedAt || Date.now(),
    generatedBy: run?.generatedBy || generatedBy || null,
    approvedAt: run?.approvedAt || null,
    approvedBy: run?.approvedBy || null,
    lockedAt: run?.lockedAt || null,
    lockedBy: run?.lockedBy || null,
  };

  await runRef(companyCode, payrollMonth).set(stamped);

  return stamped;
};

const generatePayroll = async (
  companyCode,
  payrollMonth,
  { employeeIds = null, regenerate = false, generatedBy = null, manualLeaveIsPaid = false } = {}
) => {
  const { year, month } = requirePayrollMonth(payrollMonth);

  const [employees, salaries, { run, records, legacy }] = await Promise.all([
    getEmployees(companyCode),
    getAllSalaries(companyCode),
    readRunState(companyCode, payrollMonth),
  ]);

  const allowed = canGenerateRun(run);

  if (!allowed.allowed) {
    fail(allowed.reason, 400, "PAYROLL_RUN_NOT_ALLOWED");
  }

  if (legacy) {
    await migrateLegacyRecords(companyCode, payrollMonth, records);
  }

  const salaryMap = {};

  salaries.forEach((salary) => {
    salaryMap[salary.employeeId] = salary;
  });

  const targets = (employeeIds || Object.keys(employees || {})).filter(
    (employeeId) => Boolean(employees?.[employeeId])
  );

  if (targets.length === 0) {
    fail("No employees found for this payroll run.", 400, "PAYROLL_NO_TARGETS");
  }

  const [monthRecords, holidayDates] = await Promise.all([
    readAttendanceMonth(companyCode, year, month),
    readHolidayDates(companyCode, year),
  ]);

  const summaries = buildMonthlyAttendanceSummaries({
    employeeIds: targets,
    year,
    month,
    monthRecords,
    holidayDates,
    manualLeaveIsPaid,
  });

  const generated = [];
  const skipped = [];
  const nextRecords = { ...records };

  for (const employeeId of targets) {
    if (records?.[employeeId] && !regenerate) {
      skipped.push({ employeeId, reason: "Payroll already generated for this month." });
      continue;
    }

    const salary = salaryMap[employeeId];

    if (!salary) {
      skipped.push({ employeeId, reason: "No salary structure assigned." });
      continue;
    }

    try {
      const payroll = buildPayrollSnapshot({
        employeeId,
        employee: employees[employeeId],
        salary,
        summary: summaries[employeeId],
        payrollMonth: normalizeId(payrollMonth),
        generatedBy,
      });

      await recordRef(companyCode, payrollMonth, employeeId).set(payroll);

      nextRecords[employeeId] = payroll;
      generated.push(payroll);
    } catch (error) {
      console.error(`Failed to generate payroll for ${employeeId}:`, error);

      skipped.push({ employeeId, reason: "Could not be saved." });
    }
  }

  const nextRun = generated.length
    ? await writeRun(companyCode, payrollMonth, { run, records: nextRecords, generatedBy })
    : run;

  return {
    generated,
    skipped,
    run: nextRun,
  };
};

const generateEmployeePayroll = async (
  companyCode,
  payrollMonth,
  employeeId,
  options = {}
) => {
  const result = await generatePayroll(companyCode, payrollMonth, {
    ...options,
    employeeIds: [normalizeId(employeeId)],
  });

  if (result.generated?.length) {
    return { payroll: result.generated[0], run: result.run };
  }

  fail(
    result.skipped?.[0]?.reason || "Payroll could not be generated.",
    400,
    "PAYROLL_NOT_GENERATED"
  );
};

const advanceRun = async (
  companyCode,
  payrollMonth,
  actor,
  { guard, status, atField, byField }
) => {
  requirePayrollMonth(payrollMonth);

  const { run, records, legacy } = await readRunState(companyCode, payrollMonth);
  const allowed = guard(run);

  if (!allowed.allowed) {
    fail(allowed.reason, 400, "PAYROLL_RUN_NOT_ALLOWED");
  }

  const stamp = {
    status,
    [atField]: Date.now(),
    [byField]: actor || null,
  };

  let next = { ...run, ...stamp };

  if (!run.generatedAt) {
    if (legacy) {
      await migrateLegacyRecords(companyCode, payrollMonth, records);
    }

    next = {
      ...(await writeRun(companyCode, payrollMonth, { run, records })),
      ...stamp,
    };
  }

  await runRef(companyCode, payrollMonth).update(stamp);

  return next;
};

const approvePayroll = (companyCode, payrollMonth, approvedBy) =>
  advanceRun(companyCode, payrollMonth, approvedBy, {
    guard: canApproveRun,
    status: PAYROLL_RUN_STATUS.APPROVED,
    atField: "approvedAt",
    byField: "approvedBy",
  });

const lockPayroll = (companyCode, payrollMonth, lockedBy) =>
  advanceRun(companyCode, payrollMonth, lockedBy, {
    guard: canLockRun,
    status: PAYROLL_RUN_STATUS.LOCKED,
    atField: "lockedAt",
    byField: "lockedBy",
  });

const markPayrollPaid = async (companyCode, payrollMonth, employeeId) => {
  requirePayrollMonth(payrollMonth);

  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const { run, records, legacy } = await readRunState(companyCode, payrollMonth);
  const allowed = canEditRun(run);

  if (!allowed.allowed) {
    fail(allowed.reason, 400, "PAYROLL_RUN_NOT_ALLOWED");
  }

  if (!records?.[id]) {
    fail("There is no payroll for this employee in this month.", 404, "PAYROLL_NOT_FOUND");
  }

  if (legacy) {
    await migrateLegacyRecords(companyCode, payrollMonth, records);
  }

  await recordRef(companyCode, payrollMonth, id).update({
    status: PAYROLL_STATUS.PAID,
    paidAt: Date.now(),
  });

  return { employeeId: id, payrollMonth: normalizeId(payrollMonth) };
};

const deletePayroll = async (companyCode, payrollMonth, employeeId) => {
  requirePayrollMonth(payrollMonth);

  const id = normalizeId(employeeId);

  if (!id) {
    fail("Employee ID is required.", 400);
  }

  const { run, records, legacy } = await readRunState(companyCode, payrollMonth);
  const allowed = canEditRun(run);

  if (!allowed.allowed) {
    fail(allowed.reason, 400, "PAYROLL_RUN_NOT_ALLOWED");
  }

  if (legacy) {
    await migrateLegacyRecords(companyCode, payrollMonth, records);
  }

  await recordRef(companyCode, payrollMonth, id).remove();

  const nextRecords = { ...records };
  delete nextRecords[id];

  if (Object.keys(nextRecords).length === 0) {
    await runRef(companyCode, payrollMonth).remove();
    return { employeeId: id, payrollMonth: normalizeId(payrollMonth), run: null };
  }

  const nextRun = await writeRun(companyCode, payrollMonth, { run, records: nextRecords });

  return { employeeId: id, payrollMonth: normalizeId(payrollMonth), run: nextRun };
};

const isPayrollMonthLocked = async (companyCode, payrollMonth) =>
  isRunLocked(await getPayrollRun(companyCode, payrollMonth).catch(() => null));

module.exports = {
  PAYROLL_RUN_STATUS,
  PAYROLL_STATUS,
  PAYSLIP_MONTHS,
  isPayrollMonth,
  parsePayrollMonth,
  getPayPeriod,
  getRecentPayrollMonths,
  calculatePayroll,
  buildMonthlyAttendanceSummary,
  getPayrollRun,
  getMonthlyPayroll,
  getPayroll,
  getEmployeePayrollMonths,
  getPayrollHistory,
  getEmployeesWithPayrollStatus,
  generatePayroll,
  generateEmployeePayroll,
  approvePayroll,
  lockPayroll,
  markPayrollPaid,
  deletePayroll,
  isPayrollMonthLocked,
};
