import { useMemo, useState } from "react";
import { TbPigMoney } from "react-icons/tb";
import {
  PF_CALCULATION_BASE_OPTIONS,
  isSamePolicy,
  toFieldValue,
  validatePFPolicy,
} from "../../utils/hrPolicy/hrPolicyConstants";
import PolicyCard from "./PolicyCard";
import PolicyNumberField from "./PolicyNumberField";
import PolicyRadioGroup from "./PolicyRadioGroup";

/*
|--------------------------------------------------------------------------
| PF Policy
|--------------------------------------------------------------------------
| Provident Fund: whether it is deducted at all, the rate, and what the rate
| is a percentage of.
|
| The two contributions are one number. PF is matched - whatever comes off the
| employee's salary the employer pays in as well - so the two fields are held
| equal rather than left as two rates that could be saved disagreeing. Both are
| typed into, because both are read as their own figure on a payslip, and
| typing in either moves the other.
|
| The card owns its draft. The page holds what is stored and hands it down;
| everything typed here stays here until Save Policy is pressed, so an
| abandoned edit is abandoned rather than half applied.
|--------------------------------------------------------------------------
*/

const toFields = (policy) => ({
  enabled: Boolean(policy?.enabled),
  employeeContribution: toFieldValue(policy?.employeeContribution),
  employerContribution: toFieldValue(policy?.employerContribution),
  calculationBase: policy?.calculationBase || "",
});

function PFPolicyCard({ policy, saving = false, readOnly = false, onSave }) {

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

  const contributionError = errors.employeeContribution || "";

  /*
  | The message is cleared as the field it belongs to is corrected, rather than
  | left standing under a value that is now fine until the next save.
  */
  const clearError = (field) =>
    setErrors((previous) =>
      previous[field] ? { ...previous, [field]: "" } : previous
    );

  // One number behind two fields: either one sets both.
  const setContribution = (value) => {

    setDraft((previous) => ({
      ...previous,
      employeeContribution: value,
      employerContribution: value,
    }));

    clearError("employeeContribution");

  };

  const handleSave = () => {

    const found = validatePFPolicy(draft);

    setErrors(found);

    if (Object.values(found).some(Boolean)) return;

    onSave?.(draft);

  };

  const baseLabel = useMemo(
    () =>
      PF_CALCULATION_BASE_OPTIONS.find(
        (option) => option.value === draft.calculationBase
      )?.label || "the selected base",
    [draft.calculationBase]
  );

  const disabled = readOnly || saving || !draft.enabled;

  return (
    <PolicyCard
      title="Provident Fund (PF)"
      subtitle="Deduct PF from salaries and set the matching employer share"
      icon={<TbPigMoney />}
      accent="bg-emerald-50 text-emerald-600"
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
          ? `Applied to ${baseLabel} on every payslip.`
          : "PF is switched off, so nothing is deducted."
      }
    >

      <div className="space-y-6">

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          <PolicyNumberField
            id="pf-employee-contribution"
            label="Employee Contribution"
            value={draft.employeeContribution}
            onChange={setContribution}
            disabled={disabled}
            error={contributionError}
            hint="Deducted from the employee's salary"
            placeholder="12"
          />

          <PolicyNumberField
            id="pf-employer-contribution"
            label="Employer Contribution"
            value={draft.employerContribution}
            onChange={setContribution}
            disabled={disabled}
            error={contributionError}
            hint="Always matches the employee contribution"
            placeholder="12"
          />

        </div>

        <PolicyRadioGroup
          name="pf-calculation-base"
          legend="Calculation based on"
          options={PF_CALCULATION_BASE_OPTIONS}
          value={draft.calculationBase}
          onChange={(calculationBase) =>
            setDraft((previous) => ({ ...previous, calculationBase }))
          }
          disabled={disabled}
        />

      </div>

    </PolicyCard>
  );

}

export default PFPolicyCard;
