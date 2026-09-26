/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
| src/utils/permissions/ ka behaviour, waisa ka waisa — hasPageAccess aur
| hasSectionAccess ka port. Woh files ESM hain aur ye backend CommonJS,
| isliye seedha require nahi hotin.
|
| Source of truth Owner ka Roles & Access hi hai (Firebase mein stored).
| Neeche wale DEFAULTS uski nakal hain, sirf us company ke liye jisne
| Roles & Access kabhi kholi hi nahi — tab frontend bhi registry ke
| defaults par chalta hai. Registry mein `employees` page ke defaults
| badlein to yahan bhi badlo, warna dono chup-chaap alag ho jayenge.
*/
const OWNER_ROLE = "owner";

// permissionConstants.js ke `employees` page se
const DEFAULTS = {
  employees: {
    enabled: { hr: true, manager: true, employee: false },
    add: { hr: true, manager: false, employee: false },
  },
};

const isOwnerRole = (role) => role === OWNER_ROLE;

// Stored value tabhi jeetti hai jab wo sach mein boolean ho
const toBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : Boolean(fallback);

const hasPermission = (stored, role, path) => {
  if (isOwnerRole(role)) return true;

  if (!role || !path) return false;

  const [pageKey, sectionKey] = String(path).split(".");

  const page = DEFAULTS[pageKey];

  // Registry me na ho to refuse nahi karte — frontend bhi allow karta hai,
  // warna aisa page hamesha ke liye chhup jaata jise owner wapas kar hi na sake
  if (!page) return true;

  const node = stored?.[pageKey];

  const pageAllowed =
    node === undefined || node === null
      ? Boolean(page.enabled?.[role])
      : typeof node === "object"
        ? Boolean(node.enabled)
        : Boolean(node);

  // Page band hai to uska section bhi band — stored section true ho tab bhi
  if (!pageAllowed) return false;

  if (!sectionKey) return true;

  /*
  | Frontend normalizeRoleTree pehle stored ko defaults ke upar merge karta
  | hai, phir section padhta hai. Yahan wahi do case hain: page object ho to
  | stored section (boolean ho tabhi) jeetta hai, warna section ka default —
  | page stored hi na ho ya purani shape me bare boolean ho, dono me.
  */
  const storedSection =
    node && typeof node === "object" ? node[sectionKey] : undefined;

  return toBoolean(storedSection, page[sectionKey]?.[role]);
};

module.exports = {
  hasPermission,
  isOwnerRole,
};
