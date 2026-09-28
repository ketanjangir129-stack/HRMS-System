import {
  APPROVER_ROLES,
  ROLE,
  UNSCOPED_APPROVER_ROLES,
} from "../attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Department Scope
|--------------------------------------------------------------------------
| Which records a signed in user may act on, as opposed to which screens they
| may open.
|
| Roles & Access answers the second question and only the second one: it is a
| company wide switch, so it can say "managers get the leave approvals screen"
| but it has no way to say "and only for their own departments". That second
| narrowing is what this file is, and the two are deliberately separate - a
| permission is a fact about a role, a scope is a fact about a row.
|
| Pure, like `permissionUtils`. A scope object and a row go in, a boolean comes
| out. Nothing here reads Firebase or the signed in user, which is what lets
| the same three functions answer for a table, a summary card, an action
| button and a service guard without any of them re-deriving the rule.
|
| Two rules hold everywhere:
|
|   Owner and HR are never narrowed. They review the whole company, so every
|   check returns true for them before a department is even looked at, and no
|   missing or malformed department record can take that away.
|
|   A manager never decides their own record. Their own attendance day, their
|   own correction and their own leave fall through to HR or the owner, which
|   is the difference between an approval and a self service button.
|--------------------------------------------------------------------------
*/

export const isManagerRole = (role) => role === ROLE.MANAGER;

/*
| Owner and HR: an approver whose reach is the whole company.
*/

export const isUnscopedRole = (role) =>
  UNSCOPED_APPROVER_ROLES.includes(role);

export const isApproverRole = (role) =>
  APPROVER_ROLES.includes(role);

/*
|--------------------------------------------------------------------------
| Department Names
|--------------------------------------------------------------------------
| Departments are stored under a push id and carry a name; an employee stores
| the name and not the id. So a scope is resolved id first - which is what
| keeps a renamed department attached to its manager - and then compared by
| name, because the name is the only thing the two sides share.
|
| The comparison is trimmed and lower cased. "Sales" typed into the employee
| form and " sales " left in an older record are the same department to
| everybody except a strict equality check.
*/

export const toDepartmentKey = (name) =>
  String(name ?? "").trim().toLowerCase();

/*
| The manager currently appointed on a department node, or null. Read through
| one helper so the stored shape is named in exactly one place.
*/

export const getDepartmentManager = (department) => {

  const manager = department?.manager;

  if (!manager?.employeeId) return null;

  return {
    employeeId: String(manager.employeeId).trim().toUpperCase(),
    name: manager.name || "",
    assignedAt: manager.assignedAt || 0,
  };

};

/*
| Every department the given employee manages, as `{ id, name }`, in name
| order. This is the "one manager, many departments" side of the relation:
| the department node holds a single manager, and a manager appears on as many
| of them as they have been given.
*/

export const getManagedDepartments = (departments = {}, employeeId = "") => {

  const id = String(employeeId ?? "").trim().toUpperCase();

  if (!id) return [];

  return Object.entries(departments || {})
    .filter(
      ([, department]) =>
        getDepartmentManager(department)?.employeeId === id
    )
    .map(([departmentId, department]) => ({
      id: departmentId,
      name: department?.name || "",
    }))
    .filter((department) => Boolean(department.name))
    .sort((a, b) => a.name.localeCompare(b.name));

};

/*
|--------------------------------------------------------------------------
| The Scope
|--------------------------------------------------------------------------
| Everything a caller needs to answer "may this row be touched", resolved once
| per session and handed around as a plain object.
|
| `isScoped` is the flag every check below reads first. It is true only for a
| manager, so for everybody else each function short circuits and behaves
| exactly as the screens did before this file existed.
*/

export const buildDepartmentScope = ({
  role = "",
  employeeId = "",
  departments = {},
} = {}) => {

  const scoped = isManagerRole(role);

  const managed = scoped
    ? getManagedDepartments(departments, employeeId)
    : [];

  return {

    role,

    employeeId: String(employeeId ?? "").trim().toUpperCase(),

    isScoped: scoped,

    departments: managed,

    names: managed.map((department) => department.name),

    keys: new Set(managed.map((department) => toDepartmentKey(department.name))),

    /*
    | A manager who has been given the role but not a department yet. The
    | screens read this to explain an empty queue instead of rendering a
    | blank table that looks like a failed load.
    */
    isUnassigned: scoped && managed.length === 0,

  };

};

/*
|--------------------------------------------------------------------------
| Reading The Scope
|--------------------------------------------------------------------------
| Every row these take is one already joined with the employee directory, so
| it carries `department` and `employeeId`. That join is what the attendance
| and leave screens do before they render anything, so the scope is applied to
| the same shape the table is about to draw rather than to a raw record that
| would have to be looked up again.
*/

export const isDepartmentInScope = (scope, department) => {

  if (!scope?.isScoped) return true;

  const key = toDepartmentKey(department);

  if (!key) return false;

  return scope.keys.has(key);

};

export const isRowInScope = (scope, row) =>
  isDepartmentInScope(scope, row?.department);

/*
| An employee's own record. Compared on the id the directory and every record
| store, upper cased on both sides because that is how employees are keyed.
*/

export const isOwnRow = (scope, row) => {

  const id = String(row?.employeeId ?? "").trim().toUpperCase();

  return Boolean(id) && id === scope?.employeeId;

};

/*
| Whether the signed in user may approve or reject this row.
|
| The role is checked here as well as the scope, so a caller can hand a row
| straight to this function instead of pairing it with an `isApprover` call of
| its own and getting the two out of step.
*/

export const canReviewRow = (scope, row) => {

  if (!isApproverRole(scope?.role)) return false;

  if (!scope?.isScoped) return true;

  if (isOwnRow(scope, row)) return false;

  return isRowInScope(scope, row);

};

/*
| The rows the signed in user may see at all, which is a wider list than the
| rows they may decide: a manager's own leave request is theirs to read and
| not theirs to approve, so it stays on the list with the buttons withheld.
*/

export const filterRowsInScope = (scope, rows = []) => {

  if (!scope?.isScoped) return rows;

  return rows.filter(
    (row) => isRowInScope(scope, row) || isOwnRow(scope, row)
  );

};

/*
| The same narrowing for a list that is a roster rather than a set of records
| - the employee picker on the manual attendance form, the directory, the
| denominator an attendance rate is measured against. A manager's own record
| is included: they are a member of the department they run.
*/

export const filterEmployeesInScope = (scope, employees = []) => {

  if (!scope?.isScoped) return employees;

  return employees.filter(
    (employee) =>
      isDepartmentInScope(scope, employee?.department) ||
      isOwnRow(scope, employee)
  );

};

/*
| The `{ [employeeId]: employee }` lookup narrowed the same way, for the
| reports that build their rows from the directory rather than from records.
*/

export const filterDirectoryInScope = (scope, directory = {}) => {

  if (!scope?.isScoped) return directory;

  return Object.fromEntries(
    Object.entries(directory).filter(
      ([, employee]) =>
        isDepartmentInScope(scope, employee?.department) ||
        isOwnRow(scope, employee)
    )
  );

};

/*
|--------------------------------------------------------------------------
| Describing The Scope
|--------------------------------------------------------------------------
| What the banner on a narrowed screen says. Past three departments the names
| are dropped for a count: a header is not the place for a list that wraps.
*/

export const describeScope = (scope) => {

  if (!scope?.isScoped) return "";

  const { names } = scope;

  if (!names.length) return "No departments assigned";

  if (names.length <= 3) return names.join(", ");

  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;

};
