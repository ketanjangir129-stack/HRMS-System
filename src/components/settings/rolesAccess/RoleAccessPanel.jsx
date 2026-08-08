import { useState } from "react";
import {
  FiAlertCircle,
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

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <FiShield size={20} />
          </div>

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Roles &amp; Access
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Choose which pages and sections each role can open.
            </p>

          </div>

        </div>

      </div>

      <div className="space-y-4 p-5 sm:p-6">

        {/* Owner notice */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

          <FiShield
            className="mt-0.5 shrink-0 text-emerald-600"
            size={16}
          />

          <p className="text-sm text-emerald-800">
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
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <FiAlertCircle
              className="mt-0.5 shrink-0 text-red-600"
              size={16}
            />

            <p className="text-sm text-red-700">
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
      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <p className="text-sm text-slate-500">
          {dirty
            ? "You have unsaved changes."
            : isDefault
              ? `${ROLE_LABELS[activeRole]} is using the default permissions.`
              : "All changes saved."}
        </p>

        <div className="flex flex-wrap items-center gap-3">

          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRotateCcw size={16} />
            Reset to Defaults
          </button>

          <button
            type="button"
            onClick={cancel}
            disabled={!dirty || saving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={16} />
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >

            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <FiSave size={16} />
                Save Changes
              </>
            )}

          </button>

        </div>

      </div>

    </div>
  );

}

export default RoleAccessPanel;
