import {
  DEFAULT_ROLE_ACCESS,
  getDefaultRoleTree,
} from "./defaultRoleAccess";
import {
  MANAGED_ROLES,
  OWNER_ROLE,
  PERMISSION_PAGES,
  getPageDefinition,
  parsePermissionPath,
} from "./permissionConstants";

/*
|--------------------------------------------------------------------------
| Permission Utilities
|--------------------------------------------------------------------------
| Pure helpers. Nothing here reads Firebase and nothing here reads the signed
| in user: a role and an access tree go in, a boolean comes out. That is what
| lets the same three functions answer for the sidebar, the route guards, the
| panels inside a page and the Settings preview.
|
| Two rules hold everywhere:
|
|   Owner is never checked. It returns true before anything is read, so a
|   missing, empty or even deliberately falsified owner branch cannot lock the
|   account that owns the company out of it.
|
|   Anything unreadable falls back to the defaults rather than to `false`.
|   A company that has never opened Roles & Access, a permission an older
|   company never stored and a page added after the last save all have to keep
|   working, and denying them would take away access that was working
|   yesterday.
|--------------------------------------------------------------------------
*/

export const isOwnerRole = (role) => role === OWNER_ROLE;

export const isManagedRole = (role) => MANAGED_ROLES.includes(role);

/*
| A stored value only wins if it is actually a boolean. `undefined`, `null` and
| anything Firebase handed back in an older shape fall through to the default.
*/

const toBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : Boolean(fallback);

/*
|--------------------------------------------------------------------------
| Normalize
|--------------------------------------------------------------------------
| The stored tree merged over the defaults, for every managed role.
|
| Normalising once at the boundary is what keeps every read below a plain
| lookup: past this point a tree always has every page, every section and
| nothing but booleans, so no caller has to defend against a half written or
| out of date record.
|
| A page that used to have no sections and has since gained them may be stored
| as a bare boolean. That is read as the page's `enabled` flag and the new
| sections take their defaults, so the upgrade needs no migration.
*/

const normalizeRoleTree = (stored, role) => {

  const defaults = DEFAULT_ROLE_ACCESS[role] || {};

  return PERMISSION_PAGES.reduce((tree, page) => {

    const storedPage = stored?.[page.key];

    const defaultPage = defaults[page.key];

    if (!page.sections?.length) {

      tree[page.key] = toBoolean(
        typeof storedPage === "object" ? storedPage?.enabled : storedPage,
        defaultPage
      );

      return tree;

    }

    const isObject =
      storedPage !== null && typeof storedPage === "object";

    const enabled = toBoolean(
      isObject ? storedPage.enabled : storedPage,
      defaultPage?.enabled
    );

    tree[page.key] = page.sections.reduce(
      (node, section) => {

        node[section.key] = toBoolean(
          isObject ? storedPage[section.key] : undefined,
          defaultPage?.[section.key]
        );

        return node;

      },
      { enabled }
    );

    return tree;

  }, {});

};

export const normalizeRoleAccess = (stored) =>
  MANAGED_ROLES.reduce((access, role) => {

    access[role] = normalizeRoleTree(stored?.[role], role);

    return access;

  }, {});

/*
|--------------------------------------------------------------------------
| Page Access
|--------------------------------------------------------------------------
| A page the registry does not know about cannot be configured by the owner,
| so refusing it would hide it permanently with no way to switch it back on.
| It is allowed through instead.
*/

export const hasPageAccess = (access, role, pageKey) => {

  if (isOwnerRole(role)) return true;

  if (!role || !pageKey) return false;

  if (!getPageDefinition(pageKey)) return true;

  const node = access?.[role]?.[pageKey];

  if (node === undefined || node === null) {

    const fallback = DEFAULT_ROLE_ACCESS[role]?.[pageKey];

    return typeof fallback === "object"
      ? Boolean(fallback?.enabled)
      : Boolean(fallback);

  }

  return typeof node === "object"
    ? Boolean(node.enabled)
    : Boolean(node);

};

/*
|--------------------------------------------------------------------------
| Section Access
|--------------------------------------------------------------------------
| `"attendance.analytics"`, or a bare `"attendance"` which is answered as the
| page.
|
| The page is checked first and independently: a section left switched on
| under a page that was later switched off must not leak the panel back onto a
| screen the role can no longer open. Storage is kept consistent by the editor,
| but the read refuses to trust it.
*/

export const hasSectionAccess = (access, role, path) => {

  if (isOwnerRole(role)) return true;

  const { pageKey, sectionKey } = parsePermissionPath(path);

  if (!hasPageAccess(access, role, pageKey)) return false;

  if (!sectionKey) return true;

  const node = access?.[role]?.[pageKey];

  /*
  | A section the registry does not know about, or a page stored as a bare
  | boolean from before the section existed, is answered by the page it lives
  | in rather than refused.
  */
  if (!node || typeof node !== "object") return true;

  if (!(sectionKey in node)) {

    const fallback = DEFAULT_ROLE_ACCESS[role]?.[pageKey];

    return typeof fallback === "object" && sectionKey in fallback
      ? Boolean(fallback[sectionKey])
      : true;

  }

  return Boolean(node[sectionKey]);

};

/*
| One entry point for either kind of path, for callers that are handed a
| permission string and do not care which kind it is.
*/

export const hasAccess = (access, role, path) =>
  hasSectionAccess(access, role, path);

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

/*
| The pages a role may open, in registry order. The sidebar filters its own
| menu against this rather than re-deriving the rule.
*/

export const getAccessiblePages = (access, role) =>
  PERMISSION_PAGES.filter((page) =>
    hasPageAccess(access, role, page.key)
  );

/*
| Where to send somebody who asked for a page they cannot open.
|
| The dashboard is the natural landing page, but it is a permission like any
| other and can be switched off, so the first page the role can actually open
| is used when it is. A role with nothing at all returns an empty string, and
| the guard shows the no access screen instead of redirecting in a circle.
*/

export const getFallbackPath = (access, role) => {

  if (isOwnerRole(role)) return "/dashboard";

  if (hasPageAccess(access, role, "dashboard")) return "/dashboard";

  return getAccessiblePages(access, role)[0]?.path || "";

};

/*
|--------------------------------------------------------------------------
| Editing
|--------------------------------------------------------------------------
| Used by the Settings draft only. Every function returns a new tree so React
| sees a change and nothing is mutated under a memo.
|--------------------------------------------------------------------------
*/

export const cloneRoleTree = (tree) => structuredClone(tree || {});

const setEverySection = (page, node, value) =>
  page.sections.reduce(
    (next, section) => {

      next[section.key] = value;

      return next;

    },
    { ...node, enabled: value }
  );

/*
| Parent and child are kept consistent as they are clicked, so the tree that
| is saved can never say "analytics is on inside an attendance page this role
| cannot open".
|
|   Turning a page off turns every section off with it.
|   Turning a page on turns every section on, which is what a single click on
|   the group header is understood to mean.
|   Turning a section on pulls its page on, because a section cannot be
|   reached without it.
|
| Turning the last section off deliberately leaves the page on: a page whose
| panels are all withheld is still a page the role may open.
*/

export const setPermission = (tree, path, value) => {

  const { pageKey, sectionKey } = parsePermissionPath(path);

  const page = getPageDefinition(pageKey);

  if (!page) return tree;

  const next = { ...tree };

  const enabled = Boolean(value);

  if (!page.sections?.length) {

    next[pageKey] = enabled;

    return next;

  }

  const node =
    tree?.[pageKey] && typeof tree[pageKey] === "object"
      ? tree[pageKey]
      : { enabled: Boolean(tree?.[pageKey]) };

  if (!sectionKey) {

    next[pageKey] = setEverySection(page, node, enabled);

    return next;

  }

  next[pageKey] = {
    ...node,
    [sectionKey]: enabled,
    enabled: enabled || node.enabled,
  };

  return next;

};

/*
| What the group header checkbox should render: on, off, or the dash that says
| the page is open but only some of its sections are.
*/

export const getPageCheckState = (tree, pageKey) => {

  const page = getPageDefinition(pageKey);

  const node = tree?.[pageKey];

  const enabled =
    typeof node === "object" ? Boolean(node?.enabled) : Boolean(node);

  if (!page?.sections?.length) {
    return { enabled, checked: enabled, indeterminate: false };
  }

  if (!enabled) {
    return { enabled: false, checked: false, indeterminate: false };
  }

  const on = page.sections.filter(
    (section) => Boolean(node?.[section.key])
  ).length;

  return {
    enabled: true,
    checked: on === page.sections.length,
    indeterminate: on < page.sections.length,
  };

};

/*
|--------------------------------------------------------------------------
| Storage Shape
|--------------------------------------------------------------------------
| A draft reduced to exactly the keys the registry declares, as booleans.
|
| Firebase rejects `undefined` and keeps whatever else it is handed forever,
| so a tree is rebuilt from the registry on the way out rather than written
| as it came off the screen. A page removed from the registry disappears from
| storage on the next save.
*/

export const sanitizeRoleTree = (tree, role) => {

  const defaults = getDefaultRoleTree(role);

  return PERMISSION_PAGES.reduce((clean, page) => {

    const node = tree?.[page.key];

    const isObject = node !== null && typeof node === "object";

    const enabled = toBoolean(
      isObject ? node.enabled : node,
      typeof defaults[page.key] === "object"
        ? defaults[page.key]?.enabled
        : defaults[page.key]
    );

    if (!page.sections?.length) {

      clean[page.key] = enabled;

      return clean;

    }

    clean[page.key] = page.sections.reduce(
      (section, definition) => {

        /*
        | A section under a disabled page is stored off, so the record says
        | the same thing the screen does.
        */
        section[definition.key] =
          enabled &&
          toBoolean(
            isObject ? node[definition.key] : undefined,
            defaults[page.key]?.[definition.key]
          );

        return section;

      },
      { enabled }
    );

    return clean;

  }, {});

};

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns the first problem as a message, or null when the tree can be saved.
*/

export const validateRoleTree = (role, tree) => {

  if (isOwnerRole(role)) {
    return "Owner permissions cannot be changed.";
  }

  if (!isManagedRole(role)) {
    return "Unknown role.";
  }

  if (!tree || typeof tree !== "object") {
    return "Permissions are missing.";
  }

  return null;

};

/*
| Whether the draft still matches what is stored, so Save and Cancel can be
| disabled while there is nothing to save.
*/

export const isSameRoleTree = (left, right) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
