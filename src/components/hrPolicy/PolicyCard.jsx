import { FiCheck, FiLoader } from "react-icons/fi";
import PolicyToggle from "./PolicyToggle";

/*
|--------------------------------------------------------------------------
| Policy Card
|--------------------------------------------------------------------------
| The shell both policies are drawn in: the heading with its switch, the
| fields, and the Save Policy button under them.
|
| Each policy saves itself. PF and ESI only share a screen - one Save for both
| would commit a half typed ESI rate the moment somebody corrected the PF one,
| and would have to fail as a pair when only one of them is wrong.
|
| Save stays clickable while the switch is off. Turning a policy off is a
| change like any other and has to be saveable; what the disabled state is for
| is a card with nothing to save, and that is `dirty`.
|
| `readOnly` is a role that may open the page but not this policy. The fields
| are still rendered and still readable - the point is that the values can be
| seen - and only the switch, the inputs and the button are closed.
|--------------------------------------------------------------------------
*/

function PolicyCard({
  title,
  subtitle,
  icon,
  accent = "bg-blue-50 text-blue-600",
  enabled = false,
  onToggle,
  dirty = false,
  saving = false,
  onSave,
  readOnly = false,
  footnote = "",
  children,
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Heading */}
      <header className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${accent}`}
          >
            {icon}
          </div>

          <div className="min-w-0">

            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              {subtitle}
            </p>

          </div>

        </div>

        <PolicyToggle
          checked={enabled}
          disabled={readOnly || saving}
          onChange={onToggle}
          ariaLabel={`${enabled ? "Disable" : "Enable"} ${title}`}
        />

      </header>

      {/*
      | The fields keep their place when the policy is switched off rather than
      | being unmounted: the rates are what the switch will turn back on, and a
      | card that collapses to a single toggle gives no answer to "what is this
      | company's PF set to".
      */}
      <div
        className={`flex-1 px-4 py-5 transition-opacity duration-200 sm:px-6 ${
          enabled ? "" : "opacity-60"
        }`}
      >
        {children}
      </div>

      {/* Save */}
      <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <p className="text-xs text-slate-500 sm:text-sm">
          {readOnly
            ? "Your role can view this policy but not change it."
            : footnote}
        </p>

        <button
          type="button"
          onClick={onSave}
          disabled={readOnly || saving || !dirty}
          className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-slate-300"
        >

          {saving ? (
            <FiLoader size={18} className="animate-spin" />
          ) : (
            <FiCheck
              size={18}
              className="transition-transform duration-200 group-hover:scale-110"
            />
          )}

          {saving ? "Saving..." : "Save Policy"}

        </button>

      </footer>

    </section>
  );
}

export default PolicyCard;
