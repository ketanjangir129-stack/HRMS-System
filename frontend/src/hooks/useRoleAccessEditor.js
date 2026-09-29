import { useCallback, useMemo, useRef, useState } from "react";

import useAuth from "./useAuth";
import useRoleAccess from "./useRoleAccess";
import { updateRoleAccess } from "../services/settings/roleAccessService";
import { getDefaultRoleTree } from "../utils/permissions/defaultRoleAccess";
import { ROLE_LABELS } from "../utils/permissions/permissionConstants";
import {
  cloneRoleTree,
  isSameRoleTree,
  setPermission,
  validateRoleTree,
} from "../utils/permissions/permissionUtils";

/*
|--------------------------------------------------------------------------
| Role Access Editor
|--------------------------------------------------------------------------
| The draft one role is edited against on the Settings screen.
|
| Nothing is written while the boxes are being ticked. A run of clicks is one
| edit to one draft and one write when Save is pressed, which is both cheaper
| and recoverable: Cancel puts the stored configuration back, and a page left
| half edited never reaches the database.
|
| The draft is re-seeded whenever the stored tree changes, which is what makes
| a successful save settle: the write is followed by a reload, the reload
| replaces the tree, and the draft matches it again so the screen goes clean.
|--------------------------------------------------------------------------
*/

const useRoleAccessEditor = (role) => {

  const { company } = useAuth();

  const {
    access,
    loading,
    error,
    reload,
  } = useRoleAccess();

  const companyCode = company?.companyCode;

  const saved = access?.[role];

  const [draft, setDraft] = useState(
    () => cloneRoleTree(saved)
  );

  const [saving, setSaving] = useState(false);

  /*
  | `saving` is state, so two clicks landing in the same tick would both read
  | it as false and both write. The ref is what actually blocks the second one.
  */
  const savingRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Re-seed
  |--------------------------------------------------------------------------
  | The draft is rebuilt when the role changes, so switching tabs shows that
  | role's configuration rather than the previous one's edits, and when the
  | stored tree changes, which is what lets a save settle: the write is
  | followed by a reload, the reload lands here, and the draft matches the
  | record again so the screen goes clean.
  |
  | Done during render against the values it was last seeded from rather than
  | in an effect. React discards this pass and re-runs immediately, so the
  | screen never paints the previous role's boxes on the way through - an
  | effect would let that frame through first.
  |
  | `access` only changes identity when the record does, so an unrelated
  | re-render cannot discard work in progress.
  */

  const [seed, setSeed] = useState({ access, role });

  if (seed.access !== access || seed.role !== role) {

    setSeed({ access, role });

    setDraft(cloneRoleTree(access?.[role]));

  }

  const dirty = useMemo(
    () => !isSameRoleTree(draft, saved),
    [draft, saved]
  );

  const isDefault = useMemo(
    () => isSameRoleTree(draft, getDefaultRoleTree(role)),
    [draft, role]
  );

  const togglePermission = useCallback((path, value) => {

    setDraft((current) => setPermission(current, path, value));

  }, []);

  /*
  | Both of these only touch the draft. Reset loads the defaults in so they can
  | be reviewed and adjusted before they are committed, and neither takes
  | effect until Save.
  */

  const cancel = useCallback(() => {

    setDraft(cloneRoleTree(saved));

  }, [saved]);

  const resetToDefaults = useCallback(() => {

    setDraft(getDefaultRoleTree(role));

  }, [role]);

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  | Returns `{ success, message }` rather than raising a toast, so the screen
  | keeps saying what happened and the hook keeps deciding what is allowed -
  | the same split every other module here uses.
  */

  const save = useCallback(async () => {

    if (savingRef.current) {
      return { success: false, message: "" };
    }

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const invalid = validateRoleTree(role, draft);

    if (invalid) {
      return { success: false, message: invalid };
    }

    savingRef.current = true;

    setSaving(true);

    try {

      const result = await updateRoleAccess(
        companyCode,
        role,
        draft
      );

      if (!result?.success) {

        return {
          success: false,
          message:
            result?.message ||
            "Failed to update permissions. Please try again.",
        };

      }

      /*
      | The reload is what settles the screen: it replaces the stored tree with
      | what was actually written, which re-seeds the draft and clears the
      | dirty state. It also republishes the configuration to the sidebar and
      | the guards, so an owner editing their own company sees the effect
      | immediately.
      */
      reload();

      return {
        success: true,
        message: `${ROLE_LABELS[role] || role} permissions updated successfully.`,
      };

    } catch (saveError) {

      console.error("Failed to save role access:", saveError);

      return {
        success: false,
        message:
          saveError?.message ||
          "Failed to update permissions. Please try again.",
      };

    } finally {

      savingRef.current = false;

      setSaving(false);

    }

  }, [companyCode, role, draft, reload]);

  return {

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

  };

};

export default useRoleAccessEditor;
