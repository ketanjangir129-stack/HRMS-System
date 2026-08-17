import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
| `inlineAction` keeps the action beside the title on a phone instead of
| dropping it onto its own line. It is opt-in because it only works for a
| small action such as a status pill — a card sized one needs the full width
| a stacked header gives it.
|
| `backTo` is opt-in as well. The salary screen itself is reached from the
| sidebar, so there is nowhere behind it to go; only the pages opened from it
| — the form and an employee's history — name where they came from.
|
| `card` is the difference between the two headers the product uses. A page
| that hangs off the sidebar sits its heading in a white card, the same as
| the payroll and task screens; a page opened from one of those is bare, with
| the back arrow doing the work the card would otherwise do of saying where
| the screen begins.
*/
function SalaryPageHeader({
  title,
  subtitle,
  icon,
  action,
  inlineAction = false,
  card = false,
  backTo = "",
}) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex md:flex-row md:items-center md:justify-between md:gap-4 ${inlineAction
        ? "flex-row items-center justify-between gap-3"
        : "flex-col gap-4"
        } ${card
          ? "rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5"
          : ""
        }`}
    >

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            title="Go back"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600"
          >
            <FiArrowLeft size={18} />
          </button>
        )}

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
              {icon}
            </div>
          )}

          <div className="min-w-0">

            {/* Only the phone sizes differ — from `sm` up this is unchanged. */}
            <h1
              className={`text-lg font-bold tracking-tight text-slate-900 sm:text-3xl ${inlineAction ? "truncate sm:overflow-visible sm:whitespace-normal" : ""
                }`}
            >
              {title}
            </h1>

            {/*
            | An inline action takes width off this column, so on a phone the
            | subtitle is held to the one line it has room for rather than
            | wrapping into a paragraph beside the pill.
            */}
            <p
              className={`mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-base ${inlineAction ? "truncate sm:overflow-visible sm:whitespace-normal" : ""
                }`}
            >
              {subtitle}
            </p>

          </div>

        </div>

      </div>

      {/*
      | `contents` leaves the stacked header laying the action out exactly as
      | it did before this wrapper existed.
      */}
      {action && (
        <div className={inlineAction ? "shrink-0" : "contents"}>
          {action}
        </div>
      )}

    </div>
  );
}

export default SalaryPageHeader;
