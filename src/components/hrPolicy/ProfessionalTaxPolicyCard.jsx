import { useState } from "react";
import { TbBuildingBank } from "react-icons/tb";
import {
  SLAB_VALUE_KEY,
  createSlabRow,
  isSamePolicy,
  toComparableSlabs,
  toSlabFields,
  validateProfessionalTaxPolicy,
} from "../../utils/hrPolicy/hrPolicyConstants";
import PolicyCard from "./PolicyCard";
import PolicySlabTable from "./PolicySlabTable";

/*
|--------------------------------------------------------------------------
| Professional Tax Policy
|--------------------------------------------------------------------------
| Professional Tax is charged by the state, not by the centre, so there is no
| single rate to put in a field: each state publishes a table of monthly gross
| bands and a flat rupee amount against each one.
|
| That is why this card is a table rather than a percentage. The amount does
| not scale with the salary - somebody on twice the gross of the band below
| pays the same fixed figure as everybody else in their band.
|
| The card owns its draft. The page holds what is stored and hands it down;
| everything typed here stays here until Save Policy is pressed.
|--------------------------------------------------------------------------
*/

const VALUE_KEY = SLAB_VALUE_KEY.PROFESSIONAL_TAX;

const toFields = (policy) => ({
  enabled: Boolean(policy?.enabled),
  slabs: toSlabFields(policy?.slabs, VALUE_KEY),
});

/*
| The ids the rows carry are for React alone and are new on every read, so they
| are dropped before a draft is measured against what is stored - otherwise a
| card nobody had touched would report itself as edited.
*/
const toComparable = (fields) => ({
  enabled: fields.enabled,
  slabs: toComparableSlabs(fields.slabs, VALUE_KEY),
});

function ProfessionalTaxPolicyCard({
  policy,
  saving = false,
  readOnly = false,
  onSave,
}) {

  const [draft, setDraft] = useState(() => toFields(policy));

  const [errors, setErrors] = useState({});

  /*
  | A save replaces what the page holds, so the draft is re-seeded from it and
  | the card goes back to being unchanged with its messages cleared.
  */
  const [seeded, setSeeded] = useState(policy);

  if (seeded !== policy) {

    setSeeded(policy);

    setDraft(toFields(policy));

    setErrors({});

  }

  const dirty = !isSamePolicy(
    toComparable(draft),
    toComparable(toFields(policy))
  );

  const clearError = (key) =>
    setErrors((previous) =>
      previous[key] || previous.slabs
        ? { ...previous, [key]: "", slabs: "" }
        : previous
    );

  const changeRow = (index, field, value) => {

    setDraft((previous) => ({
      ...previous,
      slabs: previous.slabs.map((row, position) =>
        position === index ? { ...row, [field]: value } : row
      ),
    }));

    clearError(`${index}.${field}`);

  };

  /*
  | A new band goes in under the open ended one, which stays the top of the
  | table. Removing a row renumbers everything below it, so the messages - which
  | are keyed by row - are dropped rather than left pointing at rows that have
  | moved.
  */
  const addRow = () => {

    setDraft((previous) => ({
      ...previous,
      slabs: [
        ...previous.slabs.slice(0, -1),
        createSlabRow(VALUE_KEY),
        ...previous.slabs.slice(-1),
      ],
    }));

    setErrors({});

  };

  const removeRow = (index) => {

    setDraft((previous) => ({
      ...previous,
      slabs: previous.slabs.filter((row, position) => position !== index),
    }));

    setErrors({});

  };

  const handleSave = () => {

    const found = validateProfessionalTaxPolicy(draft);

    setErrors(found);

    if (Object.values(found).some(Boolean)) return;

    onSave?.(draft);

  };

  const disabled = readOnly || saving || !draft.enabled;

  return (
    <PolicyCard
      title="Professional Tax (PT)"
      subtitle="Deduct a fixed monthly amount by salary band, as your state charges it"
      icon={<TbBuildingBank />}
      accent="bg-amber-50 text-amber-600"
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
          ? "The band a monthly gross falls in decides the amount deducted."
          : "Professional Tax is switched off, so nothing is deducted."
      }
    >

      <div className="space-y-4">

        <p className="text-sm text-slate-500">
          Professional Tax is set by each state, so the bands below are a
          starting point rather than a national rule - edit them to the table
          your state publishes.
        </p>

        <PolicySlabTable
          slabs={draft.slabs}
          valueKey={VALUE_KEY}
          valueLabel="Monthly amount"
          valueUnit="₹"
          rangeLabel="Monthly gross"
          disabled={disabled}
          errors={errors}
          onChangeRow={changeRow}
          onAddRow={addRow}
          onRemoveRow={removeRow}
        />

      </div>

    </PolicyCard>
  );

}

export default ProfessionalTaxPolicyCard;
