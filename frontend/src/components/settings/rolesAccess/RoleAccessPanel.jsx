import { useState } from "react";
import {
  FiAlertCircle,
  FiChevronDown,
  FiRotateCcw,
  FiSave,
  FiShield,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";

import PermissionGroup from "./PermissionGroup";
import RoleTabs from "./RoleTabs";
import RoleAccessSkeleton from "../../skeletons/RoleAccessSkeleton";
import useRoleAccessEditor from "../../../hooks/useRoleAccessEditor";
import {
  MANAGED_ROLES,
  PERMISSION_PAGES,
  ROLE_LABELS,
} from "../../../utils/permissions/permissionConstants";

/*
|--------------------------------------------------------------------------
| Roles & Access
|--------------------------------------------------------------------------
| The owner's control over what HR and employees can reach.
|
| One role is edited at a time, against a draft the hook holds. Nothing is
| written until Save, so a run of clicks is one write rather than twenty, and
| Cancel is a real undo rather than twenty more.
|
| A switch of role while the draft is dirty is refused instead of silently
| discarding it - the draft belongs to the open role and cannot come with it.
|--------------------------------------------------------------------------
*/

function RoleAccessPanel() {

  const [activeRole, setActiveRole] = useState(MANAGED_ROLES[0]);

  const [open, setOpen] = useState(false);

  const {
    draft,
    dirty,
    isDefault,
    loading,
    error,
    saving,
    togglePermission,
    cancel,
    resetToDefaults,
    save,
  } = useRoleAccessEditor(activeRole);

  const handleRoleChange = (role) => {

    if (role === activeRole) return;

    if (dirty) {
      toast.info(
        "Save or cancel your changes before switching roles."
      );
      return;
    }

    setActiveRole(role);

  };

  const handleSave = async () => {

    const result = await save();

    /*
    | An empty message is the duplicate submission guard answering: a second
    | click while the first save is still running is not a failure and has
    | nothing to report.
    */
    if (!result?.message) return;

    if (result.success) {
      toast.success(result.message);
      return;
    }

    toast.error(result.message);

  };

  const handleReset = () => {

    resetToDefaults();

    toast.info(
      `Default ${ROLE_LABELS[activeRole]} permissions loaded. Save to apply them.`
    );

  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/*
      | Header
      |
      | Also the switch that opens the panel, so the section sits closed on a
      | page that will grow past it rather than filling the screen with the
      | whole permission matrix before anybody asks for it.
      */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:gap-4 sm:px-6 sm:py-5 ${
          open ? "border-b border-slate-200" : ""
        }`}
      >

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
          <FiShield className="text-lg sm:text-xl" />
        </div>

        <div className="min-w-0 flex-1">

          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Roles &amp; Access
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Choose which pages and sections each role can open.
          </p>

        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 sm:h-9 sm:w-9">
          <FiChevronDown
            size={20}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>

      </button>

      {open && (
      <>

      <div className="space-y-4 p-4 sm:p-6">

        {/* Owner notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">

          <FiShield
            className="mt-0.5 shrink-0 text-emerald-600"
            size={16}
          />

          <p className="text-xs text-emerald-800 sm:text-sm">
            <span className="font-semibold">Owner</span> has full access and
            cannot be restricted.
          </p>

        </div>

        {/*
        | A failed read leaves the defaults on screen rather than an empty
        | matrix, so this says the boxes below are the defaults and not the
        | company's saved configuration - which matters, because saving would
        | write them.
        */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">

            <FiAlertCircle
              className="mt-0.5 shrink-0 text-red-600"
              size={16}
            />

            <p className="text-xs text-red-700 sm:text-sm">
              {error} Showing the default permissions until it can be loaded
              again.
            </p>

          </div>
        )}

        {loading ? (

          <RoleAccessSkeleton />

        ) : (

          <>

            <RoleTabs
              activeRole={activeRole}
              onChange={handleRoleChange}
              dirty={dirty}
            />

            <div className="space-y-3">

              {PERMISSION_PAGES.map((page) => (
                <PermissionGroup
                  key={page.key}
                  page={page}
                  tree={draft}
                  onToggle={togglePermission}
                  disabled={saving}
                />
              ))}

            </div>

          </>

        )}

      </div>

      {/*
      | Actions
      |
      | Sticky, because the list is long enough that Save would otherwise sit
      | below the fold from the moment the first box is ticked.
      */}
      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">

        <p className="text-xs text-slate-500 sm:text-sm">
          {dirty
            ? "You have unsaved changes."
            : isDefault
              ? `${ROLE_LABELS[activeRole]} is using the default permissions.`
              : "All changes saved."}
        </p>

        {/*
        | On a phone the three actions are a two column grid rather than a
        | wrapped row: reset and cancel share a line and Save takes a full
        | width line of its own, so the action that matters is a whole thumb
        | target instead of whatever width is left at the end of a wrap.
        |
        | `col-span-2` is a grid property, so it is simply ignored once the
        | container becomes the inline flex row from `sm` up.
        */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
          >

            <FiRotateCcw size={16} className="shrink-0" />

            {/*
            | The full label does not fit half of a 360px line without
            | wrapping to two rows, and the icon already carries the meaning.
            */}
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset to Defaults</span>

          </button>

          <button
            type="button"
            onClick={cancel}
            disabled={!dirty || saving}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
          >
            <FiX size={16} className="shrink-0" />
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || loading}
            className="col-span-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
          >

            {saving ? (
              <>
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <FiSave size={16} className="shrink-0" />
                Save Changes
              </>
            )}

          </button>

        </div>

      </div>

      </>
      )}

    </div>
  );

}

export default RoleAccessPanel;
