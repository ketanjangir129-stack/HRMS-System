import { ref, get, set, update } from "firebase/database";
import { db } from "../../firebase/firebase";
import { getDefaultRoleTree } from "../../utils/permissions/defaultRoleAccess";
import {
  MANAGED_ROLES,
  parsePermissionPath,
  getPageDefinition,
  getSectionDefinition,
} from "../../utils/permissions/permissionConstants";
import {
  isManagedRole,
  sanitizeRoleTree,
  validateRoleTree,
} from "../../utils/permissions/permissionUtils";

/*
|--------------------------------------------------------------------------
| Role Access Service
|--------------------------------------------------------------------------
| The only place that talks to the role access branch of the database.
|
| companies/{companyCode}/settings/rolesAccess/{role}
|
| Only `hr` and `employee` are ever stored. Owner is not a record: it is
| answered as full access by the permission utilities before storage is read,
| so there is nothing here that could take it away.
|
| Reads never write. A company that has never opened Roles & Access simply has
| no node, and the caller falls back to the defaults; initialising the branch
| on a read would need write access from whoever happened to sign in first,
| which for HR and employee is exactly the access they should not have.
|
| Writes go through `sanitizeRoleTree` first, so what lands in Firebase is the
| registry's shape and nothing else.
|--------------------------------------------------------------------------
*/

const rolesAccessPath = (companyCode) =>
  `companies/${companyCode}/settings/rolesAccess`;

const rolePath = (companyCode, role) =>
  `${rolesAccessPath(companyCode)}/${role}`;

/*
|--------------------------------------------------------------------------
| Firebase Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in a toast.
*/

const describeError = (error, fallback) => {

  const code = String(
    error?.code || error?.message || ""
  ).toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to manage roles and access.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(
    describeError(error, fallback)
  );

};

/*
|--------------------------------------------------------------------------
| Get Role Access
|--------------------------------------------------------------------------
| Every configured role for a company, exactly as stored.
|
| A missing node is not an error: it is a company that has never configured
| anything, and `{}` is what says so. Normalising the record against the
| defaults is the caller's job, so the same raw read serves the runtime checks
| and the Settings editor.
*/

export const getRoleAccess = async (companyCode) => {

  try {

    if (!companyCode) return {};

    const snapshot = await get(
      ref(db, rolesAccessPath(companyCode))
    );

    return snapshot.exists() ? snapshot.val() || {} : {};

  } catch (error) {

    throw failWith(
      error,
      "Get Role Access Error",
      "Failed to load role permissions."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Get Role Access For Role
|--------------------------------------------------------------------------
| One role's stored branch. Returns `{}` for a missing record and for a role
| that is not managed, because neither is something a caller can act on.
*/

export const getRoleAccessForRole = async (companyCode, role) => {

  try {

    if (!companyCode || !isManagedRole(role)) return {};

    const snapshot = await get(
      ref(db, rolePath(companyCode, role))
    );

    return snapshot.exists() ? snapshot.val() || {} : {};

  } catch (error) {

    throw failWith(
      error,
      "Get Role Access Error",
      "Failed to load role permissions."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Update Role Access
|--------------------------------------------------------------------------
| One role's whole tree, written in a single `set`.
|
| The whole branch is replaced rather than merged: the draft on screen is the
| complete answer for that role, and merging would leave a permission the
| owner just switched off still present under a key the new tree no longer
| mentions.
*/

export const updateRoleAccess = async (
  companyCode,
  role,
  permissions
) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const error = validateRoleTree(role, permissions);

    if (error) {
      return {
        success: false,
        message: error,
      };
    }

    await set(
      ref(db, rolePath(companyCode, role)),
      sanitizeRoleTree(permissions, role)
    );

    return {
      success: true,
      role,
    };

  } catch (error) {

    throw failWith(
      error,
      "Update Role Access Error",
      "Failed to update permissions. Please try again."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Update Role Permission
|--------------------------------------------------------------------------
| A single permission, addressed by its dotted path.
|
| `"attendance"` writes the page's `enabled` flag; `"attendance.analytics"`
| writes the one section. The path is checked against the registry first, so a
| typo cannot create a key nothing reads.
|
| The Settings screen does not use this - it saves a role at a time so a run
| of clicks is one atomic write - but a caller that has to flip exactly one
| switch should not have to send the whole tree to do it.
*/

export const updateRolePermission = async (
  companyCode,
  role,
  path,
  value
) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    if (!isManagedRole(role)) {
      return {
        success: false,
        message: "Unknown role.",
      };
    }

    const { pageKey, sectionKey } = parsePermissionPath(path);

    const page = getPageDefinition(pageKey);

    if (!page) {
      return {
        success: false,
        message: "Unknown permission.",
      };
    }

    if (sectionKey && !getSectionDefinition(pageKey, sectionKey)) {
      return {
        success: false,
        message: "Unknown permission.",
      };
    }

    /*
    | A page with sections keeps its flag under `enabled`; a page without them
    | is the boolean itself.
    */
    const childPath = sectionKey
      ? `${pageKey}/${sectionKey}`
      : page.sections?.length
        ? `${pageKey}/enabled`
        : pageKey;

    await update(
      ref(db, rolePath(companyCode, role)),
      { [childPath]: Boolean(value) }
    );

    return {
      success: true,
      role,
      path,
    };

  } catch (error) {

    throw failWith(
      error,
      "Update Role Permission Error",
      "Failed to update permissions. Please try again."
    );

  }

};

/*
|--------------------------------------------------------------------------
| Reset Role Access To Defaults
|--------------------------------------------------------------------------
| The role's branch replaced with the defaults from the registry.
*/

export const resetRoleAccessToDefaults = async (
  companyCode,
  role
) => {

  if (!isManagedRole(role)) {
    return {
      success: false,
      message: "Unknown role.",
    };
  }

  return updateRoleAccess(
    companyCode,
    role,
    getDefaultRoleTree(role)
  );

};

/*
|--------------------------------------------------------------------------
| Initialize Role Access
|--------------------------------------------------------------------------
| Writes the defaults for every managed role, but only for a company that has
| nothing stored yet, so it can never overwrite a configuration.
|
| Nothing calls this on a read. It exists for an owner driven setup step, and
| for the case where a company wants its defaults materialised in the database
| rather than implied by their absence.
*/

export const initializeRoleAccess = async (companyCode) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const existing = await getRoleAccess(companyCode);

    if (Object.keys(existing).length > 0) {
      return {
        success: true,
        initialized: false,
      };
    }

    await set(
      ref(db, rolesAccessPath(companyCode)),
      MANAGED_ROLES.reduce((access, role) => {

        access[role] = sanitizeRoleTree(
          getDefaultRoleTree(role),
          role
        );

        return access;

      }, {})
    );

    return {
      success: true,
      initialized: true,
    };

  } catch (error) {

    throw failWith(
      error,
      "Initialize Role Access Error",
      "Failed to set up role permissions."
    );

  }

};
