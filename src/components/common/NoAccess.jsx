import { FiLock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| No Access
|--------------------------------------------------------------------------
| Shown when a page is refused and there is nowhere sensible to send the user
| instead - a role whose landing page is itself switched off, or one with no
| pages left at all.
|
| The guard prefers to redirect. This is the end of that road, not the usual
| answer, so it says who to ask rather than pretending something went wrong.
|--------------------------------------------------------------------------
*/

function NoAccess({
  title = "You do not have access to this page",
  message = "Your role does not include this section. Contact the account owner if you need it enabled.",
  fallbackPath = "",
}) {

  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-[1600px] items-center justify-center p-1 sm:p-2">

      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <FiLock size={24} />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {message}
        </p>

        {fallbackPath && (
          <button
            type="button"
            onClick={() => navigate(fallbackPath, { replace: true })}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
          >
            Go back
          </button>
        )}

      </div>

    </div>
  );

}

export default NoAccess;
