import {
  MANAGED_ROLES,
  PERMISSION_PAGES,
} from "./permissionConstants";

/*
|--------------------------------------------------------------------------
| Default Role Access
|--------------------------------------------------------------------------
| What a role can reach before anybody has configured anything.
|
| The defaults are not written out by hand: they are folded out of the
| `defaults` declared next to each page and section in the registry. Declaring
| them in one place is what keeps a newly added page from silently defaulting
| to "hidden from everyone" and needing a second edit here to appear.
|
| A company with no `settings/rolesAccess` node runs entirely on this object,
| and so does any single permission an older company never stored.
|--------------------------------------------------------------------------
*/

/*
| A page with no sections is stored as a plain boolean. A page with sections
| is stored as `{ enabled, ...sections }`, matching the shape written to
| Firebase, so a default tree and a stored tree are always comparable.
*/

const buildRoleTree = (role) =>
  PERMISSION_PAGES.reduce((tree, page) => {

    const enabled = Boolean(page.defaults?.[role]);

    if (!page.sections?.length) {
      tree[page.key] = enabled;
      return tree;
    }

    tree[page.key] = page.sections.reduce(
      (node, section) => {

        node[section.key] = Boolean(section.defaults?.[role]);

        return node;

      },
      { enabled }
    );

    return tree;

  }, {});

export const DEFAULT_ROLE_ACCESS = MANAGED_ROLES.reduce(
  (access, role) => {

    access[role] = buildRoleTree(role);

    return access;

  },
  {}
);

/*
| A fresh copy, because the caller edits it: the Settings draft and every
| fallback below would otherwise share the one frozen object.
*/

export const getDefaultRoleTree = (role) =>
  structuredClone(DEFAULT_ROLE_ACCESS[role] || {});

export const getDefaultRoleAccess = () =>
  structuredClone(DEFAULT_ROLE_ACCESS);
