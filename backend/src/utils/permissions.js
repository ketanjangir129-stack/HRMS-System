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

// permissionConstants.js ke pages se (frontend registry ka backend mirror).
// Legacy `hrPolicy` key companies configured before the rename ke liye.
const DEFAULTS = {
  employees: {
    enabled: { hr: true, manager: true, employee: false },
    add: { hr: true, manager: false, employee: false },
    details: { hr: true, manager: false, employee: false },
  },
  statutoryCompliance: {
    enabled: { hr: true, manager: false, employee: false },
    pf: { hr: true, manager: false, employee: false },
    esi: { hr: true, manager: false, employee: false },
    professionalTax: { hr: true, manager: false, employee: false },
    incomeTax: { hr: true, manager: false, employee: false },
    update: { hr: true, manager: false, employee: false },
  },
  hrPolicy: {
    enabled: { hr: true, manager: false, employee: false },
    pf: { hr: true, manager: false, employee: false },
    esi: { hr: true, manager: false, employee: false },
    professionalTax: { hr: true, manager: false, employee: false },
    incomeTax: { hr: true, manager: false, employee: false },
    update: { hr: true, manager: false, employee: false },
  },
  salary: {
    enabled: { hr: true, manager: false, employee: false },
    create: { hr: true, manager: false, employee: false },
    update: { hr: true, manager: false, employee: false },
  },
  payroll: {
    enabled: { hr: true, manager: false, employee: false },
    payslip: { hr: true, manager: false, employee: false },
    generate: { hr: true, manager: false, employee: false },
    approve: { hr: false, manager: false, employee: false },
    lock: { hr: false, manager: false, employee: false },
  },
   myPayroll: {
    enabled: { hr: true, manager: true, employee: true },
    summary: { hr: true, manager: true, employee: true },
    currentMonth: { hr: true, manager: true, employee: true },
    history: { hr: true, manager: true, employee: true },
    payslip: { hr: true, manager: true, employee: true },
  },

  // Attendance aur Leave bhi registry me hone chahiye — warna `if (!page)
  // return true` har role ko allow kar deta aur Roles & Access ignore hota.
  attendance: {
    enabled: { hr: true, manager: true, employee: true },
    summary: { hr: true, manager: true, employee: true },
    today: { hr: true, manager: true, employee: false },
    calendar: { hr: true, manager: true, employee: true },
    recentActivity: { hr: true, manager: true, employee: true },
    analytics: { hr: true, manager: true, employee: false },
    requests: { hr: true, manager: true, employee: true },
    myAttendance: { hr: true, manager: true, employee: true },
    daily: { hr: true, manager: true, employee: false },
    approvals: { hr: true, manager: true, employee: false },
    monthly: { hr: true, manager: true, employee: false },
    regularization: { hr: true, manager: true, employee: true },
    reports: { hr: true, manager: true, employee: false },
    import: { hr: false, manager: false, employee: false },
    settings: { hr: false, manager: false, employee: false },
  },

  leave: {
    enabled: { hr: true, manager: true, employee: true },
    balance: { hr: true, manager: true, employee: true },
    calendar: { hr: true, manager: true, employee: true },
    history: { hr: true, manager: true, employee: true },
    apply: { hr: true, manager: true, employee: true },
    approvals: { hr: true, manager: true, employee: false },
  },

  holidays: {
    enabled: { hr: true, manager: true, employee: true },
    calendar: { hr: true, manager: true, employee: true },
    upcoming: { hr: true, manager: true, employee: true },
    list: { hr: true, manager: true, employee: true },
    add: { hr: true, manager: false, employee: false },
    edit: { hr: true, manager: false, employee: false },
    delete: { hr: true, manager: false, employee: false },
  },

  onboarding: {
    enabled: { hr: true, manager: false, employee: false },
    create: { hr: true, manager: false, employee: false },
    requests: { hr: true, manager: false, employee: false },
    history: { hr: true, manager: false, employee: false },
  },
  tasks: {
    enabled: { hr: true, manager: true, employee: true },
    viewAll: { hr: true, manager: true, employee: false },
    progress: { hr: true, manager: true, employee: false },
    workload: { hr: true, manager: true, employee: false },
    urgent: { hr: true, manager: true, employee: false },
    recent: { hr: true, manager: true, employee: false },
    activity: { hr: true, manager: true, employee: true },
    create: { hr: true, manager: true, employee: false },
    createOwn: { hr: true, manager: true, employee: true },
    update: { hr: true, manager: true, employee: false },
    updateOwn: { hr: true, manager: true, employee: true },
    delete: { hr: true, manager: false, employee: false },
  },

  reimbursement: {
    enabled: { hr: true, manager: true, employee: true },
    apply: { hr: true, manager: true, employee: true },
    history: { hr: true, manager: true, employee: true },
    analytics: { hr: true, manager: false, employee: true },
    approvals: { hr: false, manager: false, employee: false },
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

  const node =
    stored?.[pageKey] ??
    // Backward compatibility: HR Policy was renamed to Statutory Compliance.
    (pageKey === "statutoryCompliance" ? stored?.hrPolicy : undefined);

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
