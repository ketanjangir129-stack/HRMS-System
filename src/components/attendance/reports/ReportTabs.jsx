import { REPORT_TABS } from "../../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Report Tabs
|--------------------------------------------------------------------------
| Switches between the daily, monthly, employee and department reports. The
| row scrolls sideways on small screens instead of wrapping into the page.
|--------------------------------------------------------------------------
*/

function ReportTabs({ value, onChange }) {
  return (
    <div className="ui-card hide-scrollbar overflow-x-auto p-1.5">

      <div className="flex min-w-max gap-1.5">

        {REPORT_TABS.map((tab) => {

          const isActive = tab.value === value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-left transition-all duration-200 sm:px-5 sm:py-3 ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-muted hover:bg-surface-muted"
              }`}
            >

              <p className="text-sm font-semibold">{tab.label}</p>

              <p
                className={`mt-0.5 text-xs ${isActive ? "text-blue-100" : "text-ink-faint"}`}
              >
                {tab.description}
              </p>

            </button>
          );

        })}

      </div>

    </div>
  );
}

export default ReportTabs;
