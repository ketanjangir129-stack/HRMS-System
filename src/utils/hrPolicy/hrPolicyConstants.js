/*
|--------------------------------------------------------------------------
| HR Policy Constants
|--------------------------------------------------------------------------
| The statutory deductions a company can switch on for its salaries, declared
| once: the defaults a company starts on, the shape stored in Firebase, and
| the rules a draft is checked against before it is saved.
|
| Nothing here reads Firebase and nothing here reads the screen. The HR Policy
| page, the service that writes the branch and anything that later prices a
| payslip all work off this file, so the percentages mean the same thing in
| every one of them.
|--------------------------------------------------------------------------
*/

/*
| What a PF percentage is applied to.
|
| Both are ordinary statutory choices: Basic alone is the narrower base, Basic
| + DA is what the EPF Act actually names, so it is the default.
*/

export const PF_CALCULATION_BASE = {
  BASIC: "basic",
  BASIC_PLUS_DA: "basicPlusDa",
};

export const PF_CALCULATION_BASE_OPTIONS = [
  {
    value: PF_CALCULATION_BASE.BASIC,
    label: "Basic Salary",
    description: "The percentage applies to Basic only",
  },
  {
    value: PF_CALCULATION_BASE.BASIC_PLUS_DA,
    label: "Basic + DA",
    description: "The percentage applies to Basic plus Dearness Allowance",
  },
];

const CALCULATION_BASE_VALUES = PF_CALCULATION_BASE_OPTIONS.map(
  (option) => option.value
);

/*
|--------------------------------------------------------------------------
| Defaults
|--------------------------------------------------------------------------
| The statutory rates, used for a company that has never opened this screen.
| They are only a starting point - every one of them is editable, because the
| rate a company is actually on is a matter for the company.
*/

export const DEFAULT_PF_POLICY = {
  enabled: false,
  employeeContribution: 12,
  employerContribution: 12,
  calculationBase: PF_CALCULATION_BASE.BASIC_PLUS_DA,
};

export const DEFAULT_ESI_POLICY = {
  enabled: false,
  employeeContribution: 0.75,
  employerContribution: 3.25,
  salaryEligibilityLimit: 21000,
};

/*
| Professional Tax is a state tax, so there is no national rate to default to -
| it is a flat monthly amount that steps up as the monthly gross crosses each
| slab. The slabs below are the common Maharashtra table, which is a starting
| point a company edits to its own state rather than a rule.
|
| The last slab has no ceiling. `upTo: null` is what says so, and every slab
| table here is held that way: the final row catches everything above the row
| before it, so no salary can fall through the table untaxed.
*/

export const DEFAULT_PROFESSIONAL_TAX_POLICY = {
  enabled: false,
  slabs: [
    { upTo: 7500, amount: 0 },
    { upTo: 10000, amount: 175 },
    { upTo: null, amount: 200 },
  ],
};

/*
| Income tax is worked out on the year, not the month: the annual gross, less
| the standard deduction, priced through the slabs, plus cess, divided back
| down to a monthly deduction.
|
| `rebateLimit` is the 87A rebate - a taxable income at or under it pays
| nothing at all. Without it the slabs alone would start deducting tax from
| someone the law charges nothing, which is the single most visible way a
| payslip can be wrong.
|
| The rates are the new regime's, and like everything else on this screen they
| are editable, because the year they are right for moves.
*/

export const DEFAULT_INCOME_TAX_POLICY = {
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

export const DEFAULT_HR_POLICY = {
  pf: DEFAULT_PF_POLICY,
  esi: DEFAULT_ESI_POLICY,
  professionalTax: DEFAULT_PROFESSIONAL_TAX_POLICY,
  incomeTax: DEFAULT_INCOME_TAX_POLICY,
};

/*
| Which key a slab table's second column is kept under. Professional Tax is a
| rupee amount, income tax a percentage, and everything that handles a slab
| table is told which of the two it is holding rather than guessing from the
| value.
*/

export const SLAB_VALUE_KEY = {
  PROFESSIONAL_TAX: "amount",
  INCOME_TAX: "rate",
};

/*
|--------------------------------------------------------------------------
| Input Parsing
|--------------------------------------------------------------------------
| The fields on the screen are text inputs rather than number ones, so the
| browser leaves out the stepper arrows and the scroll wheel cannot silently
| change a rate under a focused field. That also drops the browser's own
| filtering, so it is done here: digits and a single decimal point survive.
|
| The value stays the string that was typed. "12." and "" are both mid-edit
| states a number cannot hold, and parsing on every keystroke would delete the
| decimal point the moment it was entered.
*/

export const toNumericInput = (value) => {

  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");

  const [whole, ...rest] = cleaned.split(".");

  // Only the first decimal point is a decimal point; "1.2.3" is 1.23.
  return rest.length ? `${whole}.${rest.join("")}` : whole;

};

/*
| A typed field read as a number. A blank field and a lone "." are both "not a
| number yet" rather than zero, so validation can tell an empty rate from a
| deliberate 0.
*/

export const toNumber = (value) => {

  if (value === "" || value === null || value === undefined) return NaN;

  return Number(value);

};

/*
| A stored number put back into a field. Trailing zeros are dropped so 12
| reads as "12" rather than "12.00".
*/

export const toFieldValue = (value) =>
  Number.isFinite(Number(value)) ? String(Number(value)) : "";

/*
|--------------------------------------------------------------------------
| Slab Rows
|--------------------------------------------------------------------------
| A slab table on the screen is a list of rows, and rows are added, removed and
| reordered by the person editing them. React needs a key that survives that,
| and the row's position cannot be it - removing the middle row would hand the
| row below it the key of the one that just went, and the field the cursor is
| in would inherit somebody else's value.
|
| So each row carries an id of its own. It exists only for the screen: it is
| never validated, never compared and never stored.
*/

let rowKey = 0;

const nextRowId = () => {
  rowKey += 1;
  return `slab-${rowKey}`;
};

export const createSlabRow = (valueKey) => ({
  id: nextRowId(),
  upTo: "",
  [valueKey]: "",
});

/*
| Stored slabs put into fields. A row with no ceiling is the open ended last
| one, and its box is left empty rather than reading "null".
*/

export const toSlabFields = (slabs, valueKey) =>
  (Array.isArray(slabs) ? slabs : []).map((row) => ({
    id: nextRowId(),
    upTo:
      row?.upTo === null || row?.upTo === undefined
        ? ""
        : toFieldValue(row.upTo),
    [valueKey]: toFieldValue(row?.[valueKey]),
  }));

/*
| The same rows with the screen-only id dropped, so a draft can be compared
| against what is stored without the ids - which are new on every read - making
| an untouched card look edited.
*/

export const toComparableSlabs = (slabs, valueKey) =>
  (Array.isArray(slabs) ? slabs : []).map((row) => ({
    upTo: row?.upTo ?? "",
    [valueKey]: row?.[valueKey] ?? "",
  }));

/*
|--------------------------------------------------------------------------
| Normalize
|--------------------------------------------------------------------------
| A stored branch merged over the defaults.
|
| A company with no `settings/hrPolicy` node, and any single field an older
| record never stored, both fall back to the defaults rather than to zero: a
| missing rate is "not configured", and pricing it as 0% would quietly stop a
| deduction the company thinks is running.
*/

const toStoredNumber = (value, fallback) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export const normalizePFPolicy = (stored) => {

  const employeeContribution = toStoredNumber(
    stored?.employeeContribution,
    DEFAULT_PF_POLICY.employeeContribution
  );

  return {
    enabled: Boolean(stored?.enabled),
    employeeContribution,
    /*
    | The employer side is held equal to the employee side, so the stored
    | employer value is never trusted over it. A record written before that
    | rule existed is corrected on the way in rather than left disagreeing
    | with the screen.
    */
    employerContribution: employeeContribution,
    calculationBase: CALCULATION_BASE_VALUES.includes(stored?.calculationBase)
      ? stored.calculationBase
      : DEFAULT_PF_POLICY.calculationBase,
  };

};

export const normalizeESIPolicy = (stored) => ({
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
});

/*
| A stored slab table put back into the shape everything downstream expects:
| ceilings ascending, exactly one open ended row, and it last.
|
| Firebase hands an array back as an array but a table saved with a gap in it
| as an object keyed by index, so the rows are taken with `Object.values`
| rather than assumed to be a list. The order they come back in is not
| guaranteed either, which is why the ceilings are sorted here rather than
| trusted - a table read out of order would price the wrong band.
|
| A record with no slabs at all falls back to the defaults, copied rather than
| shared, so a caller that edits what it was handed cannot reach back into the
| defaults every later read is measured against.
*/

const normalizeSlabs = (stored, valueKey, fallback) => {

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

  /*
  | The top band is whichever row was saved without a ceiling; a table saved
  | entirely in bounded rows has its highest one opened up instead, so the
  | income above it is still priced somewhere.
  */
  const top = openEnded.length ? openEnded[openEnded.length - 1] : bounded.pop();

  return [...bounded, { ...top, upTo: null }];

};

export const normalizeProfessionalTaxPolicy = (stored) => ({
  enabled: Boolean(stored?.enabled),
  slabs: normalizeSlabs(
    stored?.slabs,
    SLAB_VALUE_KEY.PROFESSIONAL_TAX,
    DEFAULT_PROFESSIONAL_TAX_POLICY.slabs
  ),
});

export const normalizeIncomeTaxPolicy = (stored) => ({
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
});

export const normalizeHRPolicy = (stored) => ({
  pf: normalizePFPolicy(stored?.pf),
  esi: normalizeESIPolicy(stored?.esi),
  professionalTax: normalizeProfessionalTaxPolicy(stored?.professionalTax),
  incomeTax: normalizeIncomeTaxPolicy(stored?.incomeTax),
});

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns a map of field name to message, empty when the draft can be saved.
|
| A switched off policy is never validated: turning something off is not the
| moment to insist its rates are right, and the values are kept exactly as
| they were so switching it back on restores the configuration.
*/

const PERCENT_LIMIT = 100;

const percentError = (value, label) => {

  const amount = toNumber(value);

  if (!Number.isFinite(amount)) {
    return `${label} is required.`;
  }

  if (amount <= 0) {
    return `${label} must be greater than 0.`;
  }

  if (amount > PERCENT_LIMIT) {
    return `${label} cannot be more than ${PERCENT_LIMIT}%.`;
  }

  return "";

};

export const validatePFPolicy = (draft) => {

  if (!draft?.enabled) return {};

  const errors = {};

  const employee = percentError(
    draft.employeeContribution,
    "Employee contribution"
  );

  /*
  | One message, on the field that is actually typed into. The employer side
  | mirrors it, so a second copy of the same complaint would only say the same
  | thing twice.
  */
  if (employee) {
    errors.employeeContribution = employee;
  }

  return errors;

};

export const validateESIPolicy = (draft) => {

  if (!draft?.enabled) return {};

  const errors = {};

  const employee = percentError(
    draft.employeeContribution,
    "Employee contribution"
  );

  if (employee) {
    errors.employeeContribution = employee;
  }

  const employer = percentError(
    draft.employerContribution,
    "Employer contribution"
  );

  if (employer) {
    errors.employerContribution = employer;
  }

  const limit = toNumber(draft.salaryEligibilityLimit);

  if (!Number.isFinite(limit)) {
    errors.salaryEligibilityLimit = "Salary eligibility limit is required.";
  }

  else if (limit <= 0) {
    errors.salaryEligibilityLimit =
      "Salary eligibility limit must be greater than 0.";
  }

  return errors;

};

/*
| An amount that is allowed to be nothing. A rate has to be a real percentage
| to mean anything, but a company can genuinely be on a zero standard deduction
| or a zero cess, so 0 is an answer here rather than a missing one.
*/

const amountError = (value, label, { max = null } = {}) => {

  const amount = toNumber(value);

  if (!Number.isFinite(amount)) {
    return `${label} is required.`;
  }

  if (amount < 0) {
    return `${label} cannot be negative.`;
  }

  if (max !== null && amount > max) {
    return `${label} cannot be more than ${max}%.`;
  }

  return "";

};

/*
|--------------------------------------------------------------------------
| Slab Validation
|--------------------------------------------------------------------------
| Errors are keyed by row: "2.upTo" is the ceiling on the third slab. That is
| what lets the table put each message under the box it belongs to instead of
| printing one complaint for the whole table.
|
| The messages themselves name the slab, because the service reports only the
| first one in a toast and "Enter the upper limit" on its own does not say
| which row to go and look at.
|
| The last row is the open ended one and has no ceiling to check. Everything
| above it has to end above the row before it - a table that steps backwards
| would leave a band no salary can ever match.
*/

const slabErrors = (slabs, { valueKey, valueLabel, isPercent = false }) => {

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
      }

      else if (ceiling <= previousCeiling) {
        errors[`${index}.upTo`] =
          `${position}: the upper limit must be above the slab before it.`;
      }

      else {
        previousCeiling = ceiling;
      }

    }

    const message = amountError(
      row?.[valueKey],
      `${position}: ${valueLabel}`,
      { max: isPercent ? PERCENT_LIMIT : null }
    );

    if (message) {
      errors[`${index}.${valueKey}`] = message;
    }

  });

  return errors;

};

export const validateProfessionalTaxPolicy = (draft) => {

  if (!draft?.enabled) return {};

  return slabErrors(draft.slabs, {
    valueKey: SLAB_VALUE_KEY.PROFESSIONAL_TAX,
    valueLabel: "monthly amount",
  });

};

export const validateIncomeTaxPolicy = (draft) => {

  if (!draft?.enabled) return {};

  const errors = {};

  const standardDeduction = amountError(
    draft.standardDeduction,
    "Standard deduction"
  );

  if (standardDeduction) {
    errors.standardDeduction = standardDeduction;
  }

  const rebateLimit = amountError(draft.rebateLimit, "Rebate limit");

  if (rebateLimit) {
    errors.rebateLimit = rebateLimit;
  }

  const cess = amountError(draft.cess, "Cess", { max: PERCENT_LIMIT });

  if (cess) {
    errors.cess = cess;
  }

  return {
    ...errors,
    ...slabErrors(draft.slabs, {
      valueKey: SLAB_VALUE_KEY.INCOME_TAX,
      valueLabel: "tax rate",
      isPercent: true,
    }),
  };

};

/*
|--------------------------------------------------------------------------
| Storage Shape
|--------------------------------------------------------------------------
| A draft reduced to the keys this file declares, as numbers and booleans.
|
| Firebase rejects `undefined` and keeps whatever else it is handed forever,
| so the record is rebuilt from the draft rather than written as it came off
| the screen: the fields hold typed strings, and a string rate would price
| every payslip through a silent coercion.
|
| A disabled policy keeps its rates. The switch is the only thing that decides
| whether the deduction runs, and blanking the numbers with it would make
| switching it back on a re-entry job.
*/

const toSavedNumber = (value, fallback) => {

  const amount = toNumber(value);

  return Number.isFinite(amount) ? amount : fallback;

};

export const toStoredPFPolicy = (draft) => {

  const employeeContribution = toSavedNumber(
    draft?.employeeContribution,
    DEFAULT_PF_POLICY.employeeContribution
  );

  return {
    enabled: Boolean(draft?.enabled),
    employeeContribution,
    // Equal by rule, not by what the second field happens to hold.
    employerContribution: employeeContribution,
    calculationBase: CALCULATION_BASE_VALUES.includes(draft?.calculationBase)
      ? draft.calculationBase
      : DEFAULT_PF_POLICY.calculationBase,
  };

};

export const toStoredESIPolicy = (draft) => ({
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
});

/*
| A slab row written down. The open ended row is saved without a `upTo` key at
| all rather than with a null one - Firebase deletes a key it is handed null
| for, so the two would store identically anyway, and leaving it out says what
| is meant instead of relying on that.
|
| The last row is forced open ended on the way out whatever the draft holds, so
| the table that is stored always covers every salary.
*/

const toStoredSlab = (row, valueKey) => {

  const ceiling = toSavedNumber(row?.upTo, 0);

  const value = toSavedNumber(row?.[valueKey], 0);

  return ceiling > 0
    ? { upTo: ceiling, [valueKey]: value }
    : { [valueKey]: value };

};

const toStoredSlabs = (slabs, valueKey, fallback) => {

  const rows = Array.isArray(slabs) && slabs.length ? slabs : fallback;

  return rows.map((row, index) =>
    toStoredSlab(
      index === rows.length - 1 ? { ...row, upTo: null } : row,
      valueKey
    )
  );

};

export const toStoredProfessionalTaxPolicy = (draft) => ({
  enabled: Boolean(draft?.enabled),
  slabs: toStoredSlabs(
    draft?.slabs,
    SLAB_VALUE_KEY.PROFESSIONAL_TAX,
    DEFAULT_PROFESSIONAL_TAX_POLICY.slabs
  ),
});

export const toStoredIncomeTaxPolicy = (draft) => ({
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
});

/*
| Whether a draft still matches what is stored, so Save can be held disabled
| while there is nothing to save.
*/

export const isSamePolicy = (left, right) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
