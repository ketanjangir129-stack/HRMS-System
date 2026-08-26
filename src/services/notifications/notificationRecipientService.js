import { ref, get } from "firebase/database";

import { db } from "../../firebase/firebase";

import {
  OWNER_ROLE,
} from "../../utils/permissions/permissionConstants";

import {
  ROLE,
} from "../../utils/attendance/attendanceConstants";

import {
  getDepartmentManager,
  toDepartmentKey,
} from "../../utils/permissions/departmentScope";


/*
|--------------------------------------------------------------------------
| Department Managers
|--------------------------------------------------------------------------
| The managers who run the department a request came out of.
|
| Read from the departments branch rather than from the employee, because
| that is where the appointment lives: an employee record says which
| department somebody is in, and the department node says who runs it.
|
| The result is checked back against the employee directory before it is
| used. A manager whose account was closed, or who was moved to another role
| without their departments being released, is still named on the node and
| would otherwise be sent a notification nobody will ever open.
*/

const getDepartmentManagerIds = async (
  companyCode,
  employees,
  employeeId
) => {

  const employee =
    employees?.[
      String(employeeId ?? "")
        .trim()
        .toUpperCase()
    ];

  const department =
    employee?.employmentInfo?.department;

  if (!department) {
    return [];
  }

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/departments`
    )
  );

  if (!snapshot.exists()) {
    return [];
  }

  const wanted = toDepartmentKey(department);

  return Object.values(snapshot.val() || {})
    .filter(
      (node) =>
        toDepartmentKey(node?.name) === wanted
    )
    .map(
      (node) =>
        getDepartmentManager(node)?.employeeId
    )
    .filter((managerId) => {

      if (!managerId) return false;

      const manager = employees?.[managerId];

      return (
        manager?.account?.status?.toLowerCase() === "active" &&
        manager?.account?.role?.toLowerCase() === ROLE.MANAGER
      );

    });

};


/*
|--------------------------------------------------------------------------
| Get HR / Approver Employee IDs
|--------------------------------------------------------------------------
| The owner is always a recipient, and is added here rather than looked for
| in the directory below: owners sign in through Firebase Auth and have no
| employee record at all, so no filter over `employees` can ever return one.
| Their notifications live under the fixed `owner` key, the same identity
| `getCurrentActor` already uses for everything else the owner does.
|
| Without it a company that has not appointed an HR yet would raise leave
| requests that nobody is ever told about, and the failure would be silent:
| an empty recipient list writes nothing and reports no error.
|
| `employeeId` is who the request is about. Given one, the managers of that
| employee's department are added: they are the people who will actually see
| the request in their queue, and telling only HR about a request HR is not
| the one reviewing is how a queue quietly fills up.
|
| It is optional, and omitting it returns exactly the list this function
| returned before department managers existed - which is what a company that
| has appointed none still gets either way.
*/

export const getLeaveApproverIds = async (
  companyCode,
  { employeeId = "" } = {}
) => {

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees`
    )
  );

  if (!snapshot.exists()) {
    return [OWNER_ROLE];
  }

  const employees =
    snapshot.val();

  const employeeApprovers = Object.entries(
    employees
  )
    .filter(
      ([, employee]) => {

        const role =
          employee?.account?.role
            ?.toLowerCase();

        const status =
          employee?.account?.status
            ?.toLowerCase();

        return (
          status === "active" &&
          (
            role === "hr" ||
            role === "owner"
          )
        );

      }
    )
    .map(
      ([employeeId]) =>
        employeeId
    );

  /*
  | A failed department read must not cost the request its HR notification,
  | so the managers are added if they can be resolved and skipped if they
  | cannot. The people who can always act on it are already on the list.
  */

  let managerApprovers = [];

  if (employeeId) {

    try {

      const requesterId = String(employeeId)
        .trim()
        .toUpperCase();

      /*
      | A manager raising a request for themselves is not one of its
      | approvers - it falls to HR - so they are not told to review it.
      */
      managerApprovers = (
        await getDepartmentManagerIds(
          companyCode,
          employees,
          employeeId
        )
      ).filter((managerId) => managerId !== requesterId);

    } catch (error) {

      console.error(
        "Failed to resolve department managers:",
        error
      );

    }

  }

  /*
  | De-duplicated, because an employee record carrying the `owner` role would
  | otherwise be notified twice, and a manager who is also an HR user would be
  | on both lists.
  */

  return Array.from(
    new Set([
      OWNER_ROLE,
      ...employeeApprovers,
      ...managerApprovers,
    ])
  );

};


/*
|--------------------------------------------------------------------------
| Get Every Employee Id
|--------------------------------------------------------------------------
| The recipient list for something announced to the whole company rather than
| routed to whoever has to act on it — a declared holiday concerns everybody,
| not just the approvers.
|
| Only active employees are included: a resigned or suspended account still
| sits in the directory, and writing to it would build up a box nobody ever
| opens.
|
| The owner is added the same way `getLeaveApproverIds` adds them, and for
| the same reason: owners sign in through Firebase Auth and have no employee
| record, so no filter over `employees` can ever return one.
*/

export const getAllEmployeeIds = async (
  companyCode
) => {

  if (!companyCode) {
    return [];
  }

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees`
    )
  );

  if (!snapshot.exists()) {
    return [OWNER_ROLE];
  }

  const employeeIds = Object.entries(
    snapshot.val()
  )
    .filter(
      ([, employee]) =>
        employee?.account?.status
          ?.toLowerCase() === "active"
    )
    .map(
      ([employeeId]) =>
        employeeId
    );

  return Array.from(
    new Set([
      OWNER_ROLE,
      ...employeeIds,
    ])
  );

};


/*
|--------------------------------------------------------------------------
| Employee Display Name
|--------------------------------------------------------------------------
| A leave request stores the employee id and nothing else; the name shown on
| the approval screens is joined in from the directory by the page itself.
| A notification is written by the service, far below that join, so the name
| is read here — otherwise every approver is told that "WV001" applied.
|
| An id that cannot be resolved returns an empty string rather than a
| placeholder, so the caller can fall back to the id it already has.
*/

export const getEmployeeName = async (
  companyCode,
  employeeId
) => {

  if (!companyCode || !employeeId) {
    return "";
  }

  /*
  | Employees are stored under the trimmed, upper-cased id, the same key
  | `addEmployee` and the employee login build.
  */

  const key = String(employeeId)
    .trim()
    .toUpperCase();

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/employees/${key}`
    )
  );

  if (!snapshot.exists()) {
    return "";
  }

  const employee = snapshot.val();

  return (
    employee?.personalInfo?.name ||
    employee?.employmentInfo?.name ||
    ""
  );

};