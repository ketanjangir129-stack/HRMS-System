import {
  PAYROLL_PENDING,
  PAYROLL_RUN_PERMISSIONS,
  PAYROLL_RUN_STATUS,
  roundMoney,
} from "./payrollConstants";

/*
|--------------------------------------------------------------------------
| Payroll Run
|--------------------------------------------------------------------------
| The month as a thing in its own right: what state it is in, what may still
| be done to it, and what its records add up to.
|
| Nothing here reads or writes anything. The service asks these questions
| before it touches the database and the dashboard asks the same ones before
| it enables a button, so a refused action and a disabled button can never
| disagree about why.
|
| The sequence a month moves through:
|
|   Pending -> Generated -> Approved -> Locked
|
| It only ever moves forwards. There is deliberately no unlock: the point of
| locking a month is that the figures it was paid on cannot be revised
| afterwards, and an unlock would make that a matter of who has the button.
| A month locked in error is corrected the way an accounting mistake is - by
| an adjustment in a later month, which leaves both the error and the fix on
| the record.
|--------------------------------------------------------------------------
*/

/*
| The order the states run in. Everything below compares stages rather than
| strings, so a state added between two existing ones needs no new checks.
*/

const RUN_STAGE = {
  [PAYROLL_PENDING]: 0,
  [PAYROLL_RUN_STATUS.GENERATED]: 1,
  [PAYROLL_RUN_STATUS.APPROVED]: 2,
  [PAYROLL_RUN_STATUS.LOCKED]: 3,
};

/*
| A month with no run node has never been generated, so it is pending. An
| unrecognised stored status is read as pending too rather than as something
| further along: treating rubbish as "approved" would hand out a lock button
| for a month nobody has run.
*/

export const getRunStatus = (run) => {
  const status = run?.status;

  return status && status in RUN_STAGE ? status : PAYROLL_PENDING;
};

const stageOf = (run) => RUN_STAGE[getRunStatus(run)];

export const isRunGenerated = (run) =>
  stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.GENERATED];

export const isRunApproved = (run) =>
  stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.APPROVED];

export const isRunLocked = (run) =>
  stageOf(run) >= RUN_STAGE[PAYROLL_RUN_STATUS.LOCKED];

/*
|--------------------------------------------------------------------------
| What May Be Done
|--------------------------------------------------------------------------
| Each of these answers `{ allowed, reason }` rather than a bare boolean. The
| reason is the sentence the dashboard puts in the button's tooltip and the
| service returns when it refuses, so the two are the same words.
|
| These are the *state* rules only. Whether the signed in user holds the
| permission is a separate question, asked separately, because the answers
| have to be told apart: "this month is locked" and "you are not allowed to
| do this" are different problems with different fixes.
*/

const allow = () => ({ allowed: true, reason: "" });

const refuse = (reason) => ({ allowed: false, reason });

/*
| Generating covers both the whole month run and a single employee, and both
| stop at the same place. A month that is only generated may still be added
| to, which is what fills in an employee who joined mid month or one whose
| salary structure was missing on the first pass.
*/

export const canGenerateRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is locked and cannot be generated again.");
  }

  if (isRunApproved(run)) {
    return refuse("This month has been approved. Generating is closed.");
  }

  return allow();
};

/*
| Re-running an employee who already has a snapshot is a stricter thing than
| filling in one who has none: it overwrites figures somebody may already
| have been shown. It is refused from approval onwards, same as any other
| write, and the message says which of the two it is.
*/

export const canRegenerateRun = canGenerateRun;

export const canApproveRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is locked.");
  }

  if (isRunApproved(run)) {
    return refuse("This month has already been approved.");
  }

  if (!isRunGenerated(run)) {
    return refuse("Generate the payroll before approving it.");
  }

  return allow();
};

export const canLockRun = (run) => {
  if (isRunLocked(run)) {
    return refuse("This month is already locked.");
  }

  if (!isRunApproved(run)) {
    return refuse("Approve the payroll before locking it.");
  }

  return allow();
};

/*
| Every write that is not one of the three above - marking an employee paid,
| deleting a snapshot - asks this instead. A locked month refuses all of them
| for the same reason and in the same words.
*/

export const canEditRun = (run) =>
  isRunLocked(run)
    ? refuse("This month is locked and can no longer be changed.")
    : allow();

/*
| The state rule and the signed in user's permission, answered as one.
|
| The permission is checked first and reported on its own. A user who is not
| allowed to lock payroll should be told that, not "approve the payroll
| first" - the second reads as though the button would work once somebody
| approves the month, and for them it never will.
*/

export const gatePayrollAction = (hasPermission, state, action) =>
  hasPermission
    ? state
    : refuse(`You do not have permission to ${action} payroll.`);

/*
|--------------------------------------------------------------------------
| Releasing A Payslip
|--------------------------------------------------------------------------
| A payslip is not published the moment it is calculated. It is released when
| the month is locked, which is the point at which the figures on it stop
| being able to change.
|
| The alternative would be to publish at generation, and it is worse in the
| way that matters: a generated month can still be re-run, so an employee who
| downloaded a payslip on the second of the month could be holding a
| different net figure from the one that was eventually paid. Nothing on the
| sheet says which it is, and there would be no way for them to tell.
|
| Whoever is running the month is exempt, because they have to be able to
| read a payslip in order to decide whether to approve it. That is what
| `isPayrollOperator` answers - it takes the section check the role access
| context already hands out, so the exemption follows whatever the owner
| configured rather than a role name written down here.
*/

export const isPayrollOperator = (canAccessSection) =>
  typeof canAccessSection === "function" &&
  PAYROLL_RUN_PERMISSIONS.some((permission) =>
    canAccessSection(permission)
  );

export const canViewPayslip = (run, isOperator = false) => {
  if (isRunLocked(run)) return allow();

  if (isOperator) return allow();

  return refuse(
    "This payslip has not been released yet. It becomes available once the month's payroll is locked."
  );
};

/*
|--------------------------------------------------------------------------
| Totals
|--------------------------------------------------------------------------
| What the month came to, folded out of the records that were just written.
|
| These are stored on the run rather than summed on every read, because they
| have to keep saying what the month was paid at. Re-summing them later would
| quietly follow a record that was corrected afterwards, and a locked month
| whose total moves is exactly the thing the lock exists to prevent.
|
| `totalGross` is the structures' monthly earnings and `totalNet` is what was
| actually paid, so the two differ by the deductions and the overtime rather
| than by the deductions alone. Both are kept: the gross is what the month
| cost on paper and the net is what left the account.
*/

export const buildRunTotals = (records = {}) => {
  const list = Object.values(records || {});

  const total = (read) =>
    roundMoney(
      list.reduce((sum, record) => sum + (Number(read(record)) || 0), 0)
    );

  return {
    totalEmployees: list.length,
    totalGross: total((record) => record?.calculation?.grossSalary),
    totalDeductions: total((record) => record?.calculation?.totalDeductions),
    totalNet: total((record) => record?.calculation?.netPayable),
  };
};

/*
|--------------------------------------------------------------------------
| Actor
|--------------------------------------------------------------------------
| Who did it, in the one shape every stamp on a run uses.
|
| `currentUser` is the whole employee record for HR and employees and a small
| object for the owner, so both shapes are read. Firebase rejects `undefined`,
| so every field falls back to a string.
*/

export const toPayrollActor = (currentUser) => ({
  employeeId:
    currentUser?.employmentInfo?.employeeId ||
    currentUser?.email ||
    "unknown",
  name:
    currentUser?.personalInfo?.name ||
    currentUser?.name ||
    "Unknown",
  role:
    currentUser?.account?.role ||
    currentUser?.role ||
    "unknown",
});
