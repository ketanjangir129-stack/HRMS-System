const db = require("../config/firebase");

/*
|--------------------------------------------------------------------------
| Statutory Compliance Service
|--------------------------------------------------------------------------
| Backend port of the frontend policy rules. The frontend remains the source
| of truth for the field-level copy; this file mirrors its storage shape,
| defaults, validation and calculation so the API prices exactly what the
| Statutory Compliance screen shows.
|
| Storage: companies/{companyCode}/settings/statutoryCompliance/{pf|esi|
| professionalTax|incomeTax}, with a read fallback to the legacy
| settings/hrPolicy node created before the rename.
|--------------------------------------------------------------------------
*/

const PF_CALCULATION_BASE = {
  BASIC: "basic",
  BASIC_PLUS_DA: "basicPlusDa",
};

const PF_CALCULATION_BASE_VALUES = Object.values(PF_CALCULATION_BASE);

const DEFAULT_PF_POLICY = {
  enabled: false,
  employeeContribution: 12,
  employerContribution: 12,
  calculationBase: PF_CALCULATION_BASE.BASIC_PLUS_DA,
};

const DEFAULT_ESI_POLICY = {
  enabled: false,
  employeeContribution: 0.75,
  employerContribution: 3.25,
  salaryEligibilityLimit: 21000,
};

const DEFAULT_PROFESSIONAL_TAX_POLICY = {
  enabled: false,
  slabs: [
    { upTo: 7500, amount: 0 },
    { upTo: 10000, amount: 175 },
    { upTo: null, amount: 200 },
  ],
};

const DEFAULT_INCOME_TAX_POLICY = {
  enabled: false,
  standardDeduction: 75000,
  rebateLimit: 700000,
  cess: 4,
  slabs: [
    { upTo: 300000, rate: 0 },
    { upTo: 700000, rate: 5 },
    { upTo: 1000000, rate: 10 },
    { upTo: 1200000, rate: 15 },
    { upTo: 1500000, rate: 20 },
    { upTo: null, rate: 30 },
  ],
};

const SLAB_VALUE_KEY = {
  PROFESSIONAL_TAX: "amount",
  INCOME_TAX: "rate",
};

const PERCENT_LIMIT = 100;

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

const compliancePath = (companyCode) =>
  `${companyRoot(companyCode)}/settings/statutoryCompliance`;

const legacyPath = (companyCode) =>
  `${companyRoot(companyCode)}/settings/hrPolicy`;

/* ---------------- Numbers ---------------- */

const toStoredNumber = (value, fallback) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
};

const toSavedNumber = (value, fallback) => {
  const amount = toNumber(value);
  return Number.isFinite(amount) ? amount : fallback;
};

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

/* ---------------- Normalize (read shape) ---------------- */

function normalizePFPolicy(stored) {
  const employeeContribution = toStoredNumber(
    stored?.employeeContribution,
    DEFAULT_PF_POLICY.employeeContribution
  );

  return {
    enabled: Boolean(stored?.enabled),
    employeeContribution,
    // Employer mirrors employee by rule, same as the frontend.
    employerContribution: employeeContribution,
    calculationBase: PF_CALCULATION_BASE_VALUES.includes(
      stored?.calculationBase
    )
      ? stored.calculationBase
      : DEFAULT_PF_POLICY.calculationBase,
  };
}

function normalizeESIPolicy(stored) {
  return {
    enabled: Boolean(stored?.enabled),
    employeeContribution: toStoredNumber(
      stored?.employeeContribution,
      DEFAULT_ESI_POLICY.employeeContribution
    ),
    employerContribution: toStoredNumber(
      stored?.employerContribution,
      DEFAULT_ESI_POLICY.employerContribution
    ),
    salaryEligibilityLimit: toStoredNumber(
      stored?.salaryEligibilityLimit,
      DEFAULT_ESI_POLICY.salaryEligibilityLimit
    ),
  };
}

function normalizeSlabs(stored, valueKey, fallback) {
  const rows = Object.values(stored ?? {}).filter(
    (row) => row && typeof row === "object"
  );

  if (!rows.length) {
    return fallback.map((row) => ({ ...row }));
  }

  const cleaned = rows.map((row) => ({
    upTo:
      Number.isFinite(Number(row.upTo)) && Number(row.upTo) > 0
        ? Number(row.upTo)
        : null,
    [valueKey]: toStoredNumber(row[valueKey], 0),
  }));

  const bounded = cleaned
    .filter((row) => row.upTo !== null)
    .sort((left, right) => left.upTo - right.upTo);

  const openEnded = cleaned.filter((row) => row.upTo === null);

  const top = openEnded.length ? openEnded[openEnded.length - 1] : bounded.pop();

  return [...bounded, { ...top, upTo: null }];
}

function normalizeProfessionalTaxPolicy(stored) {
  return {
    enabled: Boolean(stored?.enabled),
    slabs: normalizeSlabs(
      stored?.slabs,
      SLAB_VALUE_KEY.PROFESSIONAL_TAX,
      DEFAULT_PROFESSIONAL_TAX_POLICY.slabs
    ),
  };
}

function normalizeIncomeTaxPolicy(stored) {
  return {
    enabled: Boolean(stored?.enabled),
    standardDeduction: toStoredNumber(
      stored?.standardDeduction,
      DEFAULT_INCOME_TAX_POLICY.standardDeduction
    ),
    rebateLimit: toStoredNumber(
      stored?.rebateLimit,
      DEFAULT_INCOME_TAX_POLICY.rebateLimit
    ),
    cess: toStoredNumber(stored?.cess, DEFAULT_INCOME_TAX_POLICY.cess),
    slabs: normalizeSlabs(
      stored?.slabs,
      SLAB_VALUE_KEY.INCOME_TAX,
      DEFAULT_INCOME_TAX_POLICY.slabs
    ),
  };
}

function normalizeStatutoryCompliance(stored) {
  return {
    pf: normalizePFPolicy(stored?.pf),
    esi: normalizeESIPolicy(stored?.esi),
    professionalTax: normalizeProfessionalTaxPolicy(stored?.professionalTax),
    incomeTax: normalizeIncomeTaxPolicy(stored?.incomeTax),
  };
}

/* ---------------- Validation (same rules as the frontend) ---------------- */

function percentError(value, label) {
  const amount = toNumber(value);

  if (!Number.isFinite(amount)) return `${label} is required.`;
  if (amount <= 0) return `${label} must be greater than 0.`;
  if (amount > PERCENT_LIMIT)
    return `${label} cannot be more than ${PERCENT_LIMIT}%.`;

  return "";
}

function validatePFPolicy(draft) {
  if (!draft?.enabled) return {};

  const errors = {};
  const employee = percentError(draft.employeeContribution, "Employee contribution");
  if (employee) errors.employeeContribution = employee;

  return errors;
}

function validateESIPolicy(draft) {
  if (!draft?.enabled) return {};

  const errors = {};
  const employee = percentError(draft.employeeContribution, "Employee contribution");
  if (employee) errors.employeeContribution = employee;

  const employer = percentError(draft.employerContribution, "Employer contribution");
  if (employer) errors.employerContribution = employer;

  const limit = toNumber(draft.salaryEligibilityLimit);
  if (!Number.isFinite(limit)) {
    errors.salaryEligibilityLimit = "Salary eligibility limit is required.";
  } else if (limit <= 0) {
    errors.salaryEligibilityLimit =
      "Salary eligibility limit must be greater than 0.";
  }

  return errors;
}

function amountError(value, label, { max = null } = {}) {
  const amount = toNumber(value);

  if (!Number.isFinite(amount)) return `${label} is required.`;
  if (amount < 0) return `${label} cannot be negative.`;
  if (max !== null && amount > max)
    return `${label} cannot be more than ${max}%.`;

  return "";
}

function slabErrors(slabs, { valueKey, valueLabel, isPercent = false }) {
  const errors = {};
  const rows = Array.isArray(slabs) ? slabs : [];

  if (!rows.length) {
    errors.slabs = "Add at least one slab.";
    return errors;
  }

  let previousCeiling = 0;

  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    const position = `Slab ${index + 1}`;

    if (!isLast) {
      const ceiling = toNumber(row?.upTo);

      if (!Number.isFinite(ceiling)) {
        errors[`${index}.upTo`] = `${position}: enter the upper limit.`;
      } else if (ceiling <= previousCeiling) {
        errors[`${index}.upTo`] =
          `${position}: the upper limit must be above the slab before it.`;
      } else {
        previousCeiling = ceiling;
      }
    }

    const message = amountError(row?.[valueKey], `${position}: ${valueLabel}`, {
      max: isPercent ? PERCENT_LIMIT : null,
    });

    if (message) errors[`${index}.${valueKey}`] = message;
  });

  return errors;
}

function validateProfessionalTaxPolicy(draft) {
  if (!draft?.enabled) return {};

  return slabErrors(draft.slabs, {
    valueKey: SLAB_VALUE_KEY.PROFESSIONAL_TAX,
    valueLabel: "monthly amount",
  });
}

function validateIncomeTaxPolicy(draft) {
  if (!draft?.enabled) return {};

  const errors = {};
  const standardDeduction = amountError(draft.standardDeduction, "Standard deduction");
  if (standardDeduction) errors.standardDeduction = standardDeduction;

  const rebateLimit = amountError(draft.rebateLimit, "Rebate limit");
  if (rebateLimit) errors.rebateLimit = rebateLimit;

  const cess = amountError(draft.cess, "Cess", { max: PERCENT_LIMIT });
  if (cess) errors.cess = cess;

  return {
    ...errors,
    ...slabErrors(draft.slabs, {
      valueKey: SLAB_VALUE_KEY.INCOME_TAX,
      valueLabel: "tax rate",
      isPercent: true,
    }),
  };
}

/* ---------------- Storage shape ---------------- */

function toStoredSlab(row, valueKey) {
  const ceiling = toSavedNumber(row?.upTo, 0);
  const value = toSavedNumber(row?.[valueKey], 0);

  return ceiling > 0
    ? { upTo: ceiling, [valueKey]: value }
    : { [valueKey]: value };
}

function toStoredSlabs(slabs, valueKey, fallback) {
  const rows = Array.isArray(slabs) && slabs.length ? slabs : fallback;

  return rows.map((row, index) =>
    toStoredSlab(
      index === rows.length - 1 ? { ...row, upTo: null } : row,
      valueKey
    )
  );
}

function toStoredPFPolicy(draft) {
  const employeeContribution = toSavedNumber(
    draft?.employeeContribution,
    DEFAULT_PF_POLICY.employeeContribution
  );

  return {
    enabled: Boolean(draft?.enabled),
    employeeContribution,
    employerContribution: employeeContribution,
    calculationBase: PF_CALCULATION_BASE_VALUES.includes(draft?.calculationBase)
      ? draft.calculationBase
      : DEFAULT_PF_POLICY.calculationBase,
  };
}

function toStoredESIPolicy(draft) {
  return {
    enabled: Boolean(draft?.enabled),
    employeeContribution: toSavedNumber(
      draft?.employeeContribution,
      DEFAULT_ESI_POLICY.employeeContribution
    ),
    employerContribution: toSavedNumber(
      draft?.employerContribution,
      DEFAULT_ESI_POLICY.employerContribution
    ),
    salaryEligibilityLimit: toSavedNumber(
      draft?.salaryEligibilityLimit,
      DEFAULT_ESI_POLICY.salaryEligibilityLimit
    ),
  };
}

function toStoredProfessionalTaxPolicy(draft) {
  return {
    enabled: Boolean(draft?.enabled),
    slabs: toStoredSlabs(
      draft?.slabs,
      SLAB_VALUE_KEY.PROFESSIONAL_TAX,
      DEFAULT_PROFESSIONAL_TAX_POLICY.slabs
    ),
  };
}

function toStoredIncomeTaxPolicy(draft) {
  return {
    enabled: Boolean(draft?.enabled),
    standardDeduction: toSavedNumber(
      draft?.standardDeduction,
      DEFAULT_INCOME_TAX_POLICY.standardDeduction
    ),
    rebateLimit: toSavedNumber(
      draft?.rebateLimit,
      DEFAULT_INCOME_TAX_POLICY.rebateLimit
    ),
    cess: toSavedNumber(draft?.cess, DEFAULT_INCOME_TAX_POLICY.cess),
    slabs: toStoredSlabs(
      draft?.slabs,
      SLAB_VALUE_KEY.INCOME_TAX,
      DEFAULT_INCOME_TAX_POLICY.slabs
    ),
  };
}

const POLICY_DEFS = {
  pf: {
    validate: validatePFPolicy,
    toStored: toStoredPFPolicy,
    label: "PF",
  },
  esi: {
    validate: validateESIPolicy,
    toStored: toStoredESIPolicy,
    label: "ESI",
  },
  professionalTax: {
    validate: validateProfessionalTaxPolicy,
    toStored: toStoredProfessionalTaxPolicy,
    label: "Professional Tax",
  },
  incomeTax: {
    validate: validateIncomeTaxPolicy,
    toStored: toStoredIncomeTaxPolicy,
    label: "Income Tax",
  },
};

/* ---------------- Reads / writes ---------------- */

const getPolicy = async (companyCode) => {
  const snapshot = await db.ref(compliancePath(companyCode)).once("value");

  if (snapshot.exists()) {
    return normalizeStatutoryCompliance(snapshot.val());
  }

  const legacySnapshot = await db.ref(legacyPath(companyCode)).once("value");

  return normalizeStatutoryCompliance(
    legacySnapshot.exists() ? legacySnapshot.val() : null
  );
};

const updatePolicy = async (companyCode, key, draft) => {
  const def = POLICY_DEFS[key];

  if (!def) {
    fail(`Unknown policy: ${key}.`, 400);
  }

  const errors = def.validate(draft || {});
  const [firstError] = Object.values(errors);

  if (firstError) {
    const error = new Error(firstError);
    error.statusCode = 422;
    error.code = "VALIDATION_FAILED";
    error.errors = errors;
    throw error;
  }

  const policy = def.toStored(draft || {});

  await db.ref(`${compliancePath(companyCode)}/${key}`).set(policy);

  return { key, label: def.label, policy };
};

/* ---------------- Calculation (mirrors the frontend) ---------------- */

const sumEarnings = (earnings) =>
  Object.values(earnings ?? {}).reduce((total, value) => total + toAmount(value), 0);

const ceilingOf = (row) => {
  if (row?.upTo === null || row?.upTo === undefined) return Infinity;
  const ceiling = Number(row.upTo);
  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : Infinity;
};

const flatSlabAmount = (slabs, income, valueKey) => {
  const rows = Array.isArray(slabs) ? slabs : [];
  const band = rows.find((row) => income <= ceilingOf(row));
  return band ? toAmount(band[valueKey]) : 0;
};

const progressiveTax = (slabs, income) => {
  const rows = Array.isArray(slabs) ? slabs : [];

  let tax = 0;
  let floor = 0;

  for (const row of rows) {
    if (income <= floor) break;

    const ceiling = ceilingOf(row);
    const band = Math.min(income, ceiling) - floor;

    if (band > 0) {
      tax += (band * toAmount(row.rate)) / 100;
    }

    if (!Number.isFinite(ceiling)) break;

    floor = ceiling;
  }

  return tax;
};

const pfBase = (policy, earnings) => {
  const basic = toAmount(earnings?.basic);

  if (policy?.calculationBase === PF_CALCULATION_BASE.BASIC) {
    return basic;
  }

  return basic + toAmount(earnings?.da);
};

const monthlyIncomeTax = (policy, monthlyGross) => {
  if (monthlyGross <= 0) return 0;

  const annualGross = monthlyGross * 12;
  const taxable = Math.max(0, annualGross - toAmount(policy?.standardDeduction));
  const rebateLimit = toAmount(policy?.rebateLimit);

  if (rebateLimit > 0 && taxable <= rebateLimit) return 0;

  const tax = progressiveTax(policy?.slabs, taxable);
  const withCess = tax * (1 + toAmount(policy?.cess) / 100);

  return Math.round(withCess / 12);
};

const calculateStatutoryDeductions = ({ earnings, policy }) => {
  const gross = sumEarnings(earnings);

  const pf = policy?.pf?.enabled
    ? Math.round(
        (pfBase(policy.pf, earnings) * toAmount(policy.pf.employeeContribution)) / 100
      )
    : null;

  const esi = policy?.esi?.enabled
    ? gross > 0 && gross <= toAmount(policy.esi.salaryEligibilityLimit)
      ? Math.ceil((gross * toAmount(policy.esi.employeeContribution)) / 100)
      : 0
    : null;

  const professionalTax = policy?.professionalTax?.enabled
    ? gross > 0
      ? Math.round(flatSlabAmount(policy.professionalTax.slabs, gross, "amount"))
      : 0
    : null;

  const incomeTax = policy?.incomeTax?.enabled
    ? monthlyIncomeTax(policy.incomeTax, gross)
    : null;

  return { pf, esi, professionalTax, incomeTax };
};

const calculateForCompany = async (companyCode, { earnings, policy } = {}) => {
  if (!earnings || typeof earnings !== "object" || Array.isArray(earnings)) {
    fail("Earnings are required.", 400);
  }

  const effectivePolicy = policy
    ? normalizeStatutoryCompliance(policy)
    : await getPolicy(companyCode);

  const gross = sumEarnings(earnings);
  const deductions = calculateStatutoryDeductions({
    earnings,
    policy: effectivePolicy,
  });

  return { gross, earnings, policy: effectivePolicy, deductions };
};

module.exports = {
  PF_CALCULATION_BASE,
  DEFAULT_PF_POLICY,
  DEFAULT_ESI_POLICY,
  DEFAULT_PROFESSIONAL_TAX_POLICY,
  DEFAULT_INCOME_TAX_POLICY,
  normalizeStatutoryCompliance,
  validatePFPolicy,
  validateESIPolicy,
  validateProfessionalTaxPolicy,
  validateIncomeTaxPolicy,
  getPolicy,
  updatePolicy,
  calculateStatutoryDeductions,
  calculateForCompany,
};
