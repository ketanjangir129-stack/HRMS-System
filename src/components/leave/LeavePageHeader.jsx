import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Leave Page Header
|--------------------------------------------------------------------------
| The sub-page twin of `LeaveHeader`, and the same anatomy the main Dashboard
| uses: eyebrow, then the page name at heading size, then the line that says
| what the page is for, with the page's action on the right.
|
| The way back is the eyebrow itself rather than a separate boxed arrow. It
| is the only line above the title, so it is where the eye already is, and
| the alternative - a 40px square button beside the heading - is the one
| piece of chrome the Dashboard's header does not have.
|
| The icon each page passes stays with the eyebrow rather than being blown up
| into a filled tile: at eyebrow size it labels the section without competing
| with the heading under it.
|--------------------------------------------------------------------------
*/

function LeavePageHeader({ title, subtitle, icon, action }) {

  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div className="min-w-0">

        <button
          type="button"
          onClick={() => navigate("/leave")}
          aria-label="Back to leave dashboard"
          className="mb-1.5 flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand transition-colors hover:text-brand-hover"
        >

          <FiArrowLeft className="shrink-0" size={14} />

          {icon && (
            <span className="flex shrink-0 items-center text-sm" aria-hidden="true">
              {icon}
            </span>
          )}

          <span className="truncate">Leave</span>

        </button>

        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-ink-subtle">
            {subtitle}
          </p>
        )}

      </div>

      {/* Its own line on a phone, beside the title from `md`. */}
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {action}
        </div>
      )}

    </div>
  );

}

export default LeavePageHeader;
