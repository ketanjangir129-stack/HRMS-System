/*
|--------------------------------------------------------------------------
| Policy Radio Group
|--------------------------------------------------------------------------
| A choice between named bases, drawn as selectable cards rather than as a bare
| list of dots: each option carries a line explaining what the percentage would
| then apply to, and that sentence needs somewhere to sit.
|
| The native radios are kept and only visually replaced, so the group is still
| one tab stop, still moves between options with the arrow keys, and still
| reads as a radio group. `name` is what ties them together, so it has to be
| unique on the page - the caller passes the group's own name.
|--------------------------------------------------------------------------
*/

function PolicyRadioGroup({
  name,
  legend,
  options = [],
  value,
  onChange,
  disabled = false,
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">

      {legend && (
        <legend className="mb-2 block text-sm font-medium text-slate-700">
          {legend}
        </legend>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {options.map((option) => {

          const selected = value === option.value;

          return (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                selected
                  ? "border-blue-500 bg-blue-50/60 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >

              <span className="relative mt-0.5 inline-flex shrink-0">

                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChange?.(option.value)}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />

                <span
                  aria-hidden="true"
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 ${
                    selected
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white peer-hover:border-blue-400"
                  }`}
                >

                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}

                </span>

              </span>

              <span className="min-w-0">

                <span
                  className={`block text-sm font-semibold ${
                    selected ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {option.label}
                </span>

                {option.description && (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {option.description}
                  </span>
                )}

              </span>

            </label>
          );

        })}

      </div>

    </fieldset>
  );
}

export default PolicyRadioGroup;
