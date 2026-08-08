import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import PermissionCheckbox from "./PermissionCheckbox";
import {
  FALLBACK_PERMISSION_ICON,
  PERMISSION_ICONS,
} from "./permissionIcons";
import { getPageCheckState } from "../../../utils/permissions/permissionUtils";

/*
|--------------------------------------------------------------------------
| Permission Group
|--------------------------------------------------------------------------
| One page and the sections inside it.
|
| The header box is both the page switch and the "all sections" switch, which
| is what makes the dash meaningful: ticked means the page and everything in
| it, the dash means the page is open but only some of it is, and empty means
| the page is gone. The counter next to it says the same thing in words, so
| the state is readable without opening the group.
|
| Sections stay visible and interactive while the page is off, but are dimmed
| and labelled, because a checkbox that vanishes when its parent is unticked
| makes the configuration underneath impossible to review. Ticking one pulls
| the page back on, which the cascade in `setPermission` takes care of.
|--------------------------------------------------------------------------
*/

function PermissionGroup({ page, tree, onToggle, disabled = false }) {

  const { enabled, checked, indeterminate } = getPageCheckState(
    tree,
    page.key
  );

  const sections = page.sections || [];

  const [open, setOpen] = useState(false);

  const enabledCount = sections.filter(
    (section) => Boolean(tree?.[page.key]?.[section.key])
  ).length;

  const Icon = PERMISSION_ICONS[page.key] || FALLBACK_PERMISSION_ICON;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
        enabled
          ? "border-slate-200 shadow-sm"
          : "border-slate-200/70 bg-slate-50/40"
      }`}
    >

      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">

        <PermissionCheckbox
          size="md"
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          onChange={(value) => onToggle(page.key, value)}
          ariaLabel={`${page.label} access`}
        />

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            enabled
              ? "bg-blue-50 text-blue-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <p
              className={`text-[15px] font-semibold ${
                enabled ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {page.label}
            </p>

            {sections.length > 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  enabled
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {enabled
                  ? `${enabledCount} of ${sections.length} sections`
                  : "Hidden"}
              </span>
            )}

          </div>

          {page.description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {page.description}
            </p>
          )}

        </div>

        {sections.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${page.label} sections`}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <FiChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

      </div>

      {/* Sections */}
      {open && sections.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:px-5">

          {!enabled && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              {page.label} is switched off, so none of these sections are
              shown. Ticking one will switch the page back on.
            </p>
          )}

          <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">

            {sections.map((section) => {

              const active = Boolean(tree?.[page.key]?.[section.key]);

              return (
                <label
                  key={section.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white ${
                    enabled ? "" : "opacity-60"
                  }`}
                >

                  <span className="mt-0.5">
                    <PermissionCheckbox
                      checked={active}
                      disabled={disabled}
                      onChange={(value) =>
                        onToggle(`${page.key}.${section.key}`, value)
                      }
                      ariaLabel={`${page.label} ${section.label}`}
                    />
                  </span>

                  <span className="min-w-0">

                    <span
                      className={`block text-sm font-medium ${
                        active ? "text-slate-800" : "text-slate-500"
                      }`}
                    >
                      {section.label}
                    </span>

                    {section.description && (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {section.description}
                      </span>
                    )}

                  </span>

                </label>
              );

            })}

          </div>

        </div>
      )}

    </div>
  );

}

export default PermissionGroup;
