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
      <div className="flex items-center gap-2.5 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">

        <PermissionCheckbox
          size="md"
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          onChange={(value) => onToggle(page.key, value)}
          ariaLabel={`${page.label} access`}
        />

        {/*
        | The page icon is decoration next to a label that already names the
        | page, so it is the first thing to go when the row has to fit a phone
        | beside a checkbox, a counter and the expander.
        */}
        <div
          className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:flex ${
            enabled
              ? "bg-blue-50 text-blue-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

            <p
              className={`text-sm font-semibold sm:text-[15px] ${
                enabled ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {page.label}
            </p>

            {sections.length > 0 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 ${
                  enabled
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                {!enabled ? (
                  "Hidden"
                ) : (
                  <>
                    {/*
                    | "3 of 5 sections" is most of a phone's line width for a
                    | count, so the narrow screen gets the count alone.
                    */}
                    <span className="sm:hidden">
                      {enabledCount}/{sections.length}
                    </span>

                    <span className="hidden sm:inline">
                      {enabledCount} of {sections.length} sections
                    </span>
                  </>
                )}

              </span>
            )}

          </div>

          {/*
          | Two lines on a phone rather than an ellipsis: at this width a
          | truncated description is cut before it has said anything.
          */}
          {page.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:line-clamp-1">
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
        <div className="border-t border-slate-200 bg-slate-50/60 px-2.5 py-3 sm:px-5 sm:py-4">

          {!enabled && (
            <p className="mx-1 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
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
                  className={`flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-white sm:px-3 ${
                    enabled ? "" : "opacity-60"
                  }`}
                >

                  <span className="mt-0.5 shrink-0">
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
