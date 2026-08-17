/*
|--------------------------------------------------------------------------
| Salary Tabs
|--------------------------------------------------------------------------
| The two halves of the salary module — the register that structures are
| created and revised on, and the history of every revision made — switched
| between rather than navigated between.
|
| The list is handed in already filtered by permission, so a tab a role
| cannot open is not rendered at all. A single remaining tab has nothing to
| switch to, so the bar hides itself instead of showing one dead control.
|
| Segmented rather than underlined: on a phone the two labels take the whole
| width as a pair of pills, which is a bigger tap target than a text link and
| keeps the active one obvious without a moving indicator.
|--------------------------------------------------------------------------
*/

function SalaryTabs({ tabs = [], activeTab, onChange }) {

    if (tabs.length < 2) return null;

    return (

        <div
            role="tablist"
            aria-label="Salary sections"
            className="flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:p-2"
        >

            {tabs.map((tab) => {

                const isActive = tab.key === activeTab;

                return (

                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.key)}
                        title={tab.description}
                        className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 sm:px-5 ${isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            }`}
                    >

                        <span className="shrink-0 text-base">
                            {tab.icon}
                        </span>

                        <span className="truncate">
                            {tab.label}
                        </span>

                    </button>

                );

            })}

        </div>

    );

}

export default SalaryTabs;
