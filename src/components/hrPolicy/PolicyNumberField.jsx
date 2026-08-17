import { toNumericInput } from "../../utils/hrPolicy/hrPolicyConstants";

/*
|--------------------------------------------------------------------------
| Policy Number Field
|--------------------------------------------------------------------------
| A percentage or a rupee amount, in the one field both are typed into.
|
| `unit` is which of the two: "%" hangs the sign off the right of the box, "₹"
| off the left, which is where each is read. Nothing else about the field
| changes, so a rate and a limit line up in the same grid.
|
| The input is text rather than number so it carries no stepper arrows and a
| scroll wheel over a focused field cannot change a rate. `inputMode` is what
| still puts a phone's numeric keypad up, and the filtering the number type
| would have done is done by `toNumericInput` as the value is typed.
|
| A `readOnly` field is one the screen derives - the PF employer share, which
| is held equal to the employee share. It is deliberately not `disabled`: a
| disabled input is skipped by the keyboard and its value is greyed to the
| point of being hard to read, and this one is a number the user is meant to
| see and check.
|--------------------------------------------------------------------------
*/

function PolicyNumberField({
  id,
  label,
  value,
  onChange,
  unit = "%",
  placeholder = "0",
  hint = "",
  error = "",
  disabled = false,
  readOnly = false,
}) {

  const isPercent = unit === "%";

  return (
    <div>

      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">

        {!isPercent && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            {unit}
          </span>
        )}

        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) =>
            onChange?.(toNumericInput(event.target.value))
          }
          className={`w-full rounded-xl border bg-white py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:ring-2 ${
            isPercent ? "pl-4 pr-9" : "pl-8 pr-4"
          } ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          } ${
            disabled
              ? "cursor-not-allowed bg-slate-50 text-slate-400"
              : ""
          } ${
            readOnly && !disabled
              ? "cursor-default bg-slate-50 text-slate-600"
              : ""
          }`}
        />

        {isPercent && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            %
          </span>
        )}

      </div>

      {/*
      | The hint is the field's own note and the error replaces it, so the row
      | keeps one line of text under it either way and the card does not jump
      | as a message appears.
      */}
      {(error || hint) && (
        <p
          className={`mt-1.5 text-xs ${
            error ? "font-medium text-red-600" : "text-slate-400"
          }`}
        >
          {error || hint}
        </p>
      )}

    </div>
  );

}

export default PolicyNumberField;
