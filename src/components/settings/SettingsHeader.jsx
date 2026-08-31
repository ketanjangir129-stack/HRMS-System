import { FiSettings } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| SettingsHeader
|--------------------------------------------------------------------------
| Same shape as the dashboard greeting: a small brand-hued eyebrow for
| context, the page name at heading size, and one quiet line under it. No
| card around it - the panels below are the surfaces on this page, and a
| second one up here would compete with them.
|--------------------------------------------------------------------------
*/

function SettingsHeader({ companyName }) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8">

      {/*
      | `min-w-0` is what keeps a long company name inside the column: without
      | it a flex item refuses to shrink below its content and the name pushes
      | the header wider than the page.
      */}
      <div className="min-w-0">

        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <FiSettings className="shrink-0" size={14} />
          <span className="truncate">Company Settings</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-ink wrap-break-word">
          Settings
        </h1>

        <p className="mt-1 text-sm wrap-break-word text-ink-subtle">
          {companyName
            ? `Company configuration · ${companyName}`
            : "Company configuration"}
        </p>

      </div>

    </div>
  );
}

export default SettingsHeader;
