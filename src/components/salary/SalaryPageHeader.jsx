import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Salary Page Header
|--------------------------------------------------------------------------
| The same anatomy the Dashboard opens with: an eyebrow for context, the page
| name at heading size, then the one line that says what the page is for, with
| whatever action belongs to the page on the right.
|
| The way back is the eyebrow itself rather than a separate boxed arrow. It is
| the only line above the title, so it is where the eye already is, and a 40px
| square button beside the heading is the one piece of chrome the Dashboard's
| header does not have.
|
| The icon each page passes stays with the eyebrow rather than being blown up
| into a filled tile: at eyebrow size it labels the section without competing
| with the heading under it.
|--------------------------------------------------------------------------
*/

function SalaryPageHeader({
  title,
  subtitle,
  icon,
  action,
  backTo = "/salarydashboard",
  backLabel = "Salary",
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div className="min-w-0">

        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label={`Back to ${backLabel}`}
          className="mb-1.5 flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand transition-colors hover:text-brand-hover"
        >

          <FiArrowLeft className="shrink-0" size={14} />

          {icon && (
            <span className="flex shrink-0 items-center text-sm" aria-hidden="true">
              {icon}
            </span>
          )}

          <span className="truncate">{backLabel}</span>

        </button>

        <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-ink-subtle">
            {subtitle}
          </p>
        )}

      </div>

      {/* Its own line on a phone, beside the title from `md`. */}
      {action && <div className="shrink-0">{action}</div>}

    </div>
  );
}

export default SalaryPageHeader;
