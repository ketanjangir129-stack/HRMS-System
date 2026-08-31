/*
|--------------------------------------------------------------------------
| Policy Toggle
|--------------------------------------------------------------------------
| The enable / disable switch on a policy card.
|
| The native checkbox is kept and only visually replaced, so the switch is
| still focusable, still toggles on space and still announces its state to a
| screen reader. `role="switch"` is what makes it read as on and off rather
| than as checked and unchecked.
|
| The label beside it says which state the policy is in rather than what the
| click will do: "Enabled" describes the switch under it, where "Disable"
| would contradict the knob's own position.
|--------------------------------------------------------------------------
*/

function PolicyToggle({
  checked = false,
  disabled = false,
  onChange,
  ariaLabel,
}) {
  return (
    <label
      className={`inline-flex shrink-0 items-center gap-2.5 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >

      <span className="relative inline-flex">

        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => onChange?.(event.target.checked)}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <span
          aria-hidden="true"
          className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 ${
            checked
              ? "bg-blue-600 shadow-sm shadow-blue-600/30"
              : "bg-slate-300 peer-hover:bg-slate-400"
          } ${disabled ? "opacity-40" : ""}`}
        >

          <span
            className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />

        </span>

      </span>

      <span
        className={`text-sm font-semibold ${
          checked ? "text-blue-700" : "text-slate-500"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {checked ? "Enabled" : "Disabled"}
      </span>

    </label>
  );
}

export default PolicyToggle;
