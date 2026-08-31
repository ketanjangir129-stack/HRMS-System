import {
  PF_CALCULATION_BASE,
  PF_CALCULATION_BASE_OPTIONS,
} from "../hrPolicy/hrPolicyConstants";

/*
|--------------------------------------------------------------------------
| Statutory Deductions
|--------------------------------------------------------------------------
| The company's HR Policy priced against one employee's earnings.
|
| This is the only place the policies are turned into rupees. The HR Policy
| screen decides what the rules are, the salary form shows the result, and
| neither of them knows how a slab is walked or what PF is a percentage of -
| the two would otherwise have to agree on it by hand, and a payslip that
| disagreed with the policy screen is the kind of bug nobody finds until
| somebody's salary is short.
|
| Every amount is worked out from the earnings alone. A deduction is never
| derived from another deduction, so the order they are calculated in cannot
| change any of them.
|
| A policy that is switched off returns `null` rather than 0. The two are
| different answers: 0 is "this company deducts nothing here", `null` is "this
| company does not run this deduction at all", and the form uses it to decide
| whether the field is its own to fill in or the user's.
|--------------------------------------------------------------------------
*/

const toAmount = (value) => {

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;

};

const sumEarnings = (earnings) =>
  Object.values(earnings ?? {}).reduce(
    (total, value) => total + toAmount(value),
    0
  );

/*
| A slab's ceiling. The open ended top band is stored without one, so anything
| that is not a real number is read as "no limit" rather than as zero - reading
| it as zero would make the top band match nothing at all.
*/

const ceilingOf = (row) => {

  if (row?.upTo === null || row?.upTo === undefined) return Infinity;

  const ceiling = Number(row.upTo);

  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : Infinity;

};

/*
| Professional Tax: the flat amount of the one band the salary falls in. The
| amount does not scale inside the band - everybody in it pays the same figure.
*/

const flatSlabAmount = (slabs, income, valueKey) => {

  const rows = Array.isArray(slabs) ? slabs : [];

  const band = rows.find((row) => income <= ceilingOf(row));

  return band ? toAmount(band[valueKey]) : 0;

};

/*
| Income tax: charged band by band rather than at the one rate the income
| happens to reach. Only the part of the income inside a band is priced at that
| band's rate, so crossing a slab raises the tax on what is above the line and
| leaves everything below it exactly as it was.
*/

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

/*
| What PF is a percentage of. Basic + DA is the base the EPF Act names, but a
| company can be on Basic alone, so the policy says which and this reads it.
*/

const pfBase = (policy, earnings) => {

  const basic = toAmount(earnings?.basic);

  if (policy?.calculationBase === PF_CALCULATION_BASE.BASIC) {
    return basic;
  }

  return basic + toAmount(earnings?.da);

};

/*
|--------------------------------------------------------------------------
| Income Tax
|--------------------------------------------------------------------------
| Worked out on the year and then divided back down, because that is how the
| tax itself is charged. Pricing a month on its own would put an employee in
| whichever slab a twelfth of their salary happened to land in.
*/

const monthlyIncomeTax = (policy, monthlyGross) => {

  if (monthlyGross <= 0) return 0;

  const annualGross = monthlyGross * 12;

  const taxable = Math.max(
    0,
    annualGross - toAmount(policy?.standardDeduction)
  );

  const rebateLimit = toAmount(policy?.rebateLimit);

  /*
  | The rebate is checked before the slabs, not after: an income inside it owes
  | nothing at all, however the bands underneath it would have priced it.
  */
  if (rebateLimit > 0 && taxable <= rebateLimit) return 0;

  const tax = progressiveTax(policy?.slabs, taxable);

  const withCess = tax * (1 + toAmount(policy?.cess) / 100);

  return Math.round(withCess / 12);

};

/*
|--------------------------------------------------------------------------
| Calculate
|--------------------------------------------------------------------------
| The four policy driven deductions for a set of earnings, each either an
| amount or `null` for a policy the company does not run.
*/

export const calculateStatutoryDeductions = ({ earnings, policy }) => {

  const gross = sumEarnings(earnings);

  const pf = policy?.pf?.enabled
    ? Math.round(
        (pfBase(policy.pf, earnings) *
          toAmount(policy.pf.employeeContribution)) /
          100
      )
    : null;

  /*
  | ESI applies per employee rather than per company: an employee whose gross
  | is over the eligibility limit is simply not covered, so nothing is
  | deducted from them while the policy stays on for everybody under it.
  |
  | The share is rounded up rather than to the nearest rupee, which is how the
  | ESI contribution itself is rounded.
  */
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

  return {
    pf,
    esi,
    professionalTax,
    incomeTax,
  };

};

/*
|--------------------------------------------------------------------------
| Describe
|--------------------------------------------------------------------------
| One line per deduction saying where the figure in the box came from.
|
| A field somebody cannot type into has to answer "why is it that number", and
| "12% of Basic + DA" answers it on the spot rather than sending them to the
| policy screen to work it out.
|
| A policy that is switched off has no line: its field is an ordinary one the
| user fills in themselves, and a note under it would be describing a rule that
| is not running.
*/

export const describeStatutoryDeductions = (policy) => {

  const description = {};

  if (policy?.pf?.enabled) {

    const base =
      PF_CALCULATION_BASE_OPTIONS.find(
        (option) => option.value === policy.pf.calculationBase
      )?.label || "Basic + DA";

    description.pf =
      `HR Policy: ${toAmount(policy.pf.employeeContribution)}% of ${base}`;

  }

  if (policy?.esi?.enabled) {

    const limit = toAmount(policy.esi.salaryEligibilityLimit);

    description.esi =
      `HR Policy: ${toAmount(policy.esi.employeeContribution)}% of gross, ` +
      `up to ₹${limit.toLocaleString("en-IN")}`;

  }

  if (policy?.professionalTax?.enabled) {
    description.professionalTax = "HR Policy: fixed amount for this salary band";
  }

  if (policy?.incomeTax?.enabled) {
    description.incomeTax = "HR Policy: a twelfth of the year's tax on this salary";
  }

  return description;

};

export default calculateStatutoryDeductions;
