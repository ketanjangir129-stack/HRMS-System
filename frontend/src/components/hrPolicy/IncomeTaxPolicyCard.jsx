import { useState } from "react";
import { TbReceiptTax } from "react-icons/tb";
import {
  SLAB_VALUE_KEY,
  createSlabRow,
  isSamePolicy,
  toComparableSlabs,
  toFieldValue,
  toSlabFields,
  validateIncomeTaxPolicy,
} from "../../utils/hrPolicy/hrPolicyConstants";
import PolicyCard from "./PolicyCard";
import PolicyNumberField from "./PolicyNumberField";
import PolicySlabTable from "./PolicySlabTable";

/*
|--------------------------------------------------------------------------
| Income Tax Policy
|--------------------------------------------------------------------------
| Income tax is the one deduction on this screen that is not worked out on the
| month. It is charged on the year, so the slabs here are annual and what
| reaches a payslip is a twelfth of the year's liability.
|
| Three things sit outside the table, because all three are applied to the year
| as a whole rather than to a band:
|
|   Standard deduction  taken off the annual gross before the slabs see it
|   Rebate limit        a taxable income at or under it pays nothing at all
|   Cess                a percentage of the tax, added after the slabs
|
| The rebate is the one that matters most on a payslip. Without it the slabs
| alone would start charging somebody the law charges nothing, which is exactly
| the kind of deduction an employee notices and nobody can explain.
|
| Unlike Professional Tax the bands are percentages and they are progressive:
| income is priced band by band, so crossing into a higher slab raises the tax
| on what is above the line and not on everything below it.
|--------------------------------------------------------------------------
*/

const VALUE_KEY = SLAB_VALUE_KEY.INCOME_TAX;

const toFields = (policy) => ({
  enabled: Boolean(policy?.enabled),
  standardDeduction: toFieldValue(policy?.standardDeduction),
  rebateLimit: toFieldValue(policy?.rebateLimit),
  cess: toFieldValue(policy?.cess),
  slabs: toSlabFields(policy?.slabs, VALUE_KEY),
});

/*
| The ids the rows carry are for React alone and are new on every read, so they
| are dropped before a draft is measured against what is stored.
*/
const toComparable = (fields) => ({
  ...fields,
  slabs: toComparableSlabs(fields.slabs, VALUE_KEY),
});

function IncomeTaxPolicyCard({
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

  const setField = (field) => (value) => {

    setDraft((previous) => ({ ...previous, [field]: value }));

    clearError(field);

  };

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

    const found = validateIncomeTaxPolicy(draft);

    setErrors(found);

    if (Object.values(found).some(Boolean)) return;

    onSave?.(draft);

  };

  const disabled = readOnly || saving || !draft.enabled;

  return (
    <PolicyCard
      title="Income Tax (TDS)"
      subtitle="Withhold tax on the annual salary and spread it across the twelve months"
      icon={<TbReceiptTax />}
      accent="bg-blue-50 text-blue-600"
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
          ? "The year's tax is worked out first, then deducted a twelfth at a time."
          : "Income Tax is switched off, so nothing is deducted."
      }
    >

      <div className="space-y-6">

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">

          <PolicyNumberField
            id="income-tax-standard-deduction"
            label="Standard Deduction"
            unit="₹"
            value={draft.standardDeduction}
            onChange={setField("standardDeduction")}
            disabled={disabled}
            error={errors.standardDeduction}
            hint="Taken off the annual salary before the slabs"
            placeholder="75000"
          />

          <PolicyNumberField
            id="income-tax-rebate-limit"
            label="Rebate Limit"
            unit="₹"
            value={draft.rebateLimit}
            onChange={setField("rebateLimit")}
            disabled={disabled}
            error={errors.rebateLimit}
            hint="Taxable income at or under this pays no tax"
            placeholder="700000"
          />

          <PolicyNumberField
            id="income-tax-cess"
            label="Health & Education Cess"
            value={draft.cess}
            onChange={setField("cess")}
            disabled={disabled}
            error={errors.cess}
            hint="Added to the tax, not to the income"
            placeholder="4"
          />

        </div>

        <div className="space-y-4">

          <div>

            <h3 className="text-sm font-semibold text-slate-800">
              Annual Tax Slabs
            </h3>

            <p className="mt-0.5 text-sm text-slate-500">
              Each band is charged on the income inside it only, so crossing a
              slab does not re-price the income below it.
            </p>

          </div>

          <PolicySlabTable
            slabs={draft.slabs}
            valueKey={VALUE_KEY}
            valueLabel="Tax rate"
            valueUnit="%"
            rangeLabel="Annual taxable income"
            disabled={disabled}
            errors={errors}
            onChangeRow={changeRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />

        </div>

      </div>

    </PolicyCard>
  );

}

export default IncomeTaxPolicyCard;
