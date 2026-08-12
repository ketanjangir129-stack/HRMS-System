import { FiUserCheck, FiUsers } from "react-icons/fi";

import {
  MANAGED_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "../../../utils/permissions/permissionConstants";

/*
|--------------------------------------------------------------------------
| Role Tabs
|--------------------------------------------------------------------------
| The two roles that can be configured.
|
| Owner is not one of them and is never rendered here. It is stated once, as a
| notice above the tabs, rather than shown as a disabled tab that invites a
| click: there is nothing behind it to open.
|--------------------------------------------------------------------------
*/

const ROLE_ICONS = {
  hr: FiUserCheck,
  employee: FiUsers,
};

function RoleTabs({ activeRole, onChange, dirty = false }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">

      {MANAGED_ROLES.map((role) => {

        const Icon = ROLE_ICONS[role] || FiUsers;

        const active = role === activeRole;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={active}
            className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:gap-4 sm:p-4 ${
              active
                ? "border-blue-600 bg-blue-50/60 shadow-sm shadow-blue-600/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:h-11 sm:w-11 ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              }`}
            >
              <Icon className="text-lg sm:text-xl" />
            </div>

            <div className="min-w-0 flex-1">

              {/*
              | Wrapping, so the Unsaved badge drops under the role name on a
              | narrow tab instead of squeezing it.
              */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

                <p
                  className={`text-sm font-semibold sm:text-base ${
                    active ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </p>

                {/*
                | Only marked on the tab being edited: the draft belongs to the
                | open role, so an unsaved change can never be sitting behind
                | the other one.
                */}
                {active && dirty && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    Unsaved
                  </span>
                )}

              </div>

              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                {ROLE_DESCRIPTIONS[role]}
              </p>

            </div>

          </button>
        );

      })}

    </div>
  );
}

export default RoleTabs;
