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

export const DEFAULT_HR_POLICY = {
  pf: DEFAULT_PF_POLICY,
  esi: DEFAULT_ESI_POLICY,
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

export const normalizeHRPolicy = (stored) => ({
  pf: normalizePFPolicy(stored?.pf),
  esi: normalizeESIPolicy(stored?.esi),
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
| Whether a draft still matches what is stored, so Save can be held disabled
| while there is nothing to save.
*/

export const isSamePolicy = (left, right) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
