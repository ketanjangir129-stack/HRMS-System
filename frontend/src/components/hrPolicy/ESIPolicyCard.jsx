import { useState } from "react";
import { TbShieldHeart } from "react-icons/tb";
import {
  isSamePolicy,
  toFieldValue,
  validateESIPolicy,
} from "../../utils/hrPolicy/hrPolicyConstants";
import PolicyCard from "./PolicyCard";
import PolicyNumberField from "./PolicyNumberField";

/*
|--------------------------------------------------------------------------
| ESI Policy
|--------------------------------------------------------------------------
| Employees' State Insurance: whether it is deducted, the two rates, and the
| gross salary above which an employee stops being covered.
|
| Unlike PF the two contributions are not the same number - the employer pays
| the larger share - so both are typed in and neither moves the other.
|
| The eligibility limit is the whole reason ESI is not just another rate: it
| applies per employee, per month, so a company on it deducts for some of its
| people and not for others.
|
| The card owns its draft. The page holds what is stored and hands it down;
| everything typed here stays here until Save Policy is pressed.
|--------------------------------------------------------------------------
*/

const toFields = (policy) => ({
  enabled: Boolean(policy?.enabled),
  employeeContribution: toFieldValue(policy?.employeeContribution),
  employerContribution: toFieldValue(policy?.employerContribution),
  salaryEligibilityLimit: toFieldValue(policy?.salaryEligibilityLimit),
});

function ESIPolicyCard({ policy, saving = false, readOnly = false, onSave }) {

  const [draft, setDraft] = useState(() => toFields(policy));

  const [errors, setErrors] = useState({});

  /*
  | A save replaces what the page holds, so the draft is re-seeded from it and
  | the card goes back to being unchanged with its messages cleared.
  |
  | Re-seeding during the render that brought the new policy in, rather than in
  | an effect afterwards, is what keeps the card from painting the old draft
  | first and correcting itself a frame later.
  */
  const [seeded, setSeeded] = useState(policy);

  if (seeded !== policy) {

    setSeeded(policy);

    setDraft(toFields(policy));

    setErrors({});

  }

  const dirty = !isSamePolicy(draft, toFields(policy));

  /*
  | The message is cleared as the field it belongs to is corrected, rather than
  | left standing under a value that is now fine until the next save.
  */
  const setField = (field) => (value) => {

    setDraft((previous) => ({ ...previous, [field]: value }));

    setErrors((previous) =>
      previous[field] ? { ...previous, [field]: "" } : previous
    );

  };

  const handleSave = () => {

    const found = validateESIPolicy(draft);

    setErrors(found);

    if (Object.values(found).some(Boolean)) return;

    onSave?.(draft);

  };

  const disabled = readOnly || saving || !draft.enabled;

  return (
    <PolicyCard
      title="Employees' State Insurance (ESI)"
      subtitle="Deduct ESI for employees earning within the eligibility limit"
      icon={<TbShieldHeart />}
      accent="bg-violet-50 text-violet-600"
      enabled={draft.enabled}
      onToggle={(enabled) =>
        setDraft((previous) => ({ ...previous, enabled }))
      }
      dirty={dirty}
      saving={saving}
      onSave={handleSave}
      readOnly={readOnly}
      footnote={
        draft.enabled
          ? "Applied only to employees within the eligibility limit."
          : "ESI is switched off, so nothing is deducted."
      }
    >

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">

        <PolicyNumberField
          id="esi-employee-contribution"
          label="Employee Contribution"
          value={draft.employeeContribution}
          onChange={setField("employeeContribution")}
          disabled={disabled}
          error={errors.employeeContribution}
          hint="Deducted from the employee's salary"
          placeholder="0.75"
        />

        <PolicyNumberField
          id="esi-employer-contribution"
          label="Employer Contribution"
          value={draft.employerContribution}
          onChange={setField("employerContribution")}
          disabled={disabled}
          error={errors.employerContribution}
          hint="Paid by the company on top of the salary"
          placeholder="3.25"
        />

        <PolicyNumberField
          id="esi-salary-limit"
          label="Salary Eligibility Limit"
          unit="₹"
          value={draft.salaryEligibilityLimit}
          onChange={setField("salaryEligibilityLimit")}
          disabled={disabled}
          error={errors.salaryEligibilityLimit}
          hint="Monthly gross above which ESI does not apply"
          placeholder="21000"
        />

      </div>

    </PolicyCard>
  );

}

export default ESIPolicyCard;
