import { ROLE } from "../attendance/attendanceConstants";
import { isOwnRow, isRowInScope } from "./departmentScope";

/*
|--------------------------------------------------------------------------
| Role Assignment
|--------------------------------------------------------------------------
| Who may change whose role, and to what.
|
| This is the third question in the same family as the other two files here,
| and is deliberately kept apart from both. Roles & Access answers "which
| screens may this role open"; `departmentScope` answers "whose rows may they
| act on"; this one answers "which role may they hand out". A manager can be
| given the Employees screen and their own department's rows and still have no
| business creating an HR account, so the reach of the edit is a fact of its
| own rather than something either of the other two can express.
|
| Pure, like its neighbours: an actor, a scope and a row go in, a boolean comes
| out. Nothing here reads Firebase or the signed in user, which is what lets
| the list, the modal and the service guard all read the same rule.
|
| Three rules hold everywhere:
|
|   Owner is never a target. It is not stored on an employee record and is not
|   in anybody's assignable set, so it can neither be granted nor taken away
|   from this screen.
|
|   Nobody edits their own role. An HR user demoting themselves would lock
|   themselves out of the screen they did it on, and a manager promoting
|   themselves is the escalation this whole file exists to prevent.
|
|   Nobody hands out a role they could not already reach. A manager runs a
|   department, so they may make somebody a manager or put them back to
|   employee - and that is the whole of it. HR and the owner keep the full set.
|--------------------------------------------------------------------------
*/

/*
| The roles each actor may assign. The set is also read as "the roles this
| actor may edit at all", so a manager cannot demote the HR user who happens
| to sit in their department either.
*/

export const ASSIGNABLE_ROLES = {
  [ROLE.OWNER]: [ROLE.HR, ROLE.MANAGER, ROLE.EMPLOYEE],
  [ROLE.HR]: [ROLE.HR, ROLE.MANAGER, ROLE.EMPLOYEE],
  [ROLE.MANAGER]: [ROLE.MANAGER, ROLE.EMPLOYEE],
};

export const getAssignableRoles = (actorRole) =>
  ASSIGNABLE_ROLES[actorRole] || [];

export const canAssignRoles = (actorRole) =>
  getAssignableRoles(actorRole).length > 0;

/*
| A stored record from before this screen existed may carry no role at all.
| It is read as an employee rather than refused, so the row is editable and
| the missing value can be corrected instead of being stuck.
*/

export const getEmployeeRole = (employee) =>
  employee?.role || employee?.account?.role || ROLE.EMPLOYEE;

/*
|--------------------------------------------------------------------------
| The Check
|--------------------------------------------------------------------------
| Whether the signed in user may change this row's role.
|
| The scope carries the actor's role and employee id, so a caller hands over
| the row it is about to draw and nothing else - the same shape `canReviewRow`
| takes, for the same reason.
|
| A manager is narrowed to their departments by the last line. Everybody who
| is not narrowed falls straight through it, so this behaves for the owner and
| for HR exactly as if the department scope were not involved at all.
*/

export const canEditEmployeeRole = (scope, employee) => {

  const assignable = getAssignableRoles(scope?.role);

  if (!assignable.length) return false;

  /*
  | The target's current role has to be one the actor could hand out. This is
  | what keeps the owner off the list and what stops a manager reaching an HR
  | record that happens to sit inside their department.
  */
  if (!assignable.includes(getEmployeeRole(employee))) return false;

  if (isOwnRow(scope, employee)) return false;

  if (!scope?.isScoped) return true;

  return isRowInScope(scope, employee);

};

/*
| Whether the change gives up the departments the employee was running.
|
| A demoted manager stays written on their department nodes unless somebody
| removes them, and the scope then resolves to departments run by an employee
| who is no longer a manager - which reads on screen as a department nobody
| runs but behaves as one they still do. The deactivate flow already releases
| them for the same reason; this says when a role change has to as well.
*/

export const releasesDepartments = (currentRole, nextRole) =>
  currentRole === ROLE.MANAGER && nextRole !== ROLE.MANAGER;

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
| Returns the first problem as a message, or null when the change can be
| saved. The modal reads it before submitting and the service reads it again
| before writing, so a role can never be set by a caller that skipped the UI.
*/

export const validateRoleChange = ({
  actorRole = "",
  nextRole = "",
  currentRole = "",
} = {}) => {

  const assignable = getAssignableRoles(actorRole);

  if (!assignable.length) {
    return "You are not allowed to change roles.";
  }

  if (!nextRole) {
    return "Select a role.";
  }

  if (!assignable.includes(nextRole)) {
    return "You are not allowed to assign that role.";
  }

  if (currentRole && !assignable.includes(currentRole)) {
    return "You are not allowed to change this employee's role.";
  }

  if (currentRole && currentRole === nextRole) {
    return "This is already their role.";
  }

  return null;

};
