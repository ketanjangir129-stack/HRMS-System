# Authentication migration

## Why

`getCompanyByCode` was throwing `Permission denied` on every page load. The
database rejects unauthenticated reads, and HR/employee users had no Firebase
Auth session at all — `loginEmployee` read the employee record directly and
compared a plaintext password in JavaScript. `AuthContext` then issued that
read before it had checked whether anyone was signed in.

Making the old flow work would have required `companies/*/employees` to be
publicly readable, and those records held `account.password` in clear text. So
the fix is the other direction: give every role a real Firebase Auth identity
and write rules against `auth.uid`.

## What changed

| Area | Before | After |
| --- | --- | --- |
| Owner sign-in | Firebase Auth | unchanged |
| HR / employee sign-in | plaintext compare in JS | Firebase Auth |
| Passwords | `account.password` in the database | Firebase Auth only; the rules now refuse the field |
| Session restore | trusted `localStorage` | rebuilt from the Auth token |
| Rules | deny-all | per-company, per-role |

Employees still sign in with **company code + employee ID**. That pair is
mapped to a Firebase Auth address (`emp007@cmp001.hrms.local`) by
[employeeIdentity.js](src/utils/auth/employeeIdentity.js). The address is a
routing detail — never shown, never delivered to. Their real address stays in
`personalInfo.email`.

New nodes:

- `/companyCodes/{code}` → `ownerUid`. Lets registration check availability
  without reading a company the caller does not belong to yet.
- `/userIndex/{uid}` → `{ uid, companyCode, role, employeeId, status }`. The
  only thing connecting an Auth token to a company. Every rule reads it.

`localStorage` is still written, because roughly two dozen screens read
`companyCode` / `role` / `currentUser` from it. It is now a **mirror** of the
authenticated session — written only after a successful `loadSession`, wiped
otherwise. Nothing is granted on its say-so: the route guards read the context
and the rules read the token.

## Running it

Order matters. Steps 1 and 2 are safe to do in either order; step 3 must come
after step 1.

### 1. Deploy the rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only database,storage
```

`.firebaserc` points at `hrms-systems-70aa8`. To review before deploying,
paste [database.rules.json](database.rules.json) into the Rules tab of the
Realtime Database console and use the built-in simulator.

There is **no window where the database is open** — the migration in step 3 is
designed to run against these rules, not around them.

### 2. Deploy the app

The client and the rules have to move together. The old client cannot read
anything under the new rules, and the new client cannot sign an employee in
until they have an Auth account.

### 3. Migrate each company

Visit **`/migrate`** and enter the company code, owner email and owner
password. For every existing employee this:

1. creates the Firebase Auth account they never had,
2. writes their `/userIndex` row,
3. deletes `account.password` from the database.

Employees keep the password they already use. Firebase requires at least six
characters, so anything shorter is reset to the employee ID (suffixed with
`@hrms` if that is itself too short) — the page lists exactly who was reset,
once. Note them down before leaving.

The migration is re-runnable: every step checks for its own result first, so a
run that fails part way can just be repeated.

**Why this page exists outside the login flow:** until it has run, the owner
has no `/userIndex` row, so `loadSession` cannot build a session for them and
the normal login refuses the sign-in. The page therefore talks to Firebase Auth
directly and signs out again when done.

It bootstraps through the two writes the rules deliberately allow: claiming
`/companyCodes/{code}` while it is unclaimed, then writing the owner's
`/userIndex` row — which the rule accepts because it checks, server side, that
`companies/{code}/details/ownerUid` is already that uid.

### 4. Remove the migration route

Once every company is done, delete
[MigrateAuth.jsx](src/pages/authenticate/MigrateAuth.jsx),
[migrateAuth.js](src/utils/migration/migrateAuth.js) and the `/migrate` route
in [AppRoutes.jsx](src/routes/AppRoutes.jsx).

## The permission model

`/userIndex/{uid}` gives each rule the caller's company and role.

- **Every member** reads: company details, the employee directory, departments,
  holidays, tasks, attendance, leave, the permission matrix, HR policy.
- **Owner + HR** additionally read and write: salaries, salary history,
  payroll, onboarding, and the employee directory.
- **Owner only**: company details, attendance settings, the roles & access
  matrix.
- **Self-service carve-outs**: a member writes their own attendance day, their
  own leave request, their own `personalInfo` / `bankInfo`, and reads their own
  salary, salary history and payslip.

Read rules are attached to specific children rather than to
`companies/{code}`, because a read granted at a parent cascades to everything
underneath it — a single rule at the company node would have handed every
employee the payroll.

Nobody can promote themselves. A `userIndex` row claiming `owner` is accepted
only when the company already names that uid as its owner, and a manager
writing rows for others cannot set the role to `owner`.

## Known gaps

- **Storage rules can't check company membership.** Firebase Storage rules
  cannot read the Realtime Database, so
  [storage.rules](storage.rules) enforces sign-in, a 10 MB cap and
  `application/pdf` on resume uploads, but not which company the caller belongs
  to. Closing that needs custom claims on the Auth token, which needs the Admin
  SDK — a Cloud Function on user creation, or a small server.
- **Role and status are stored twice** — on the employee record where HR edits
  them, and on the `userIndex` row where the rules read them. Route those two
  fields through `updateEmployeeAccount` in
  [EmployeeService.js](src/services/EmployeeService.js), which writes both.
  Any screen that edits `account.role` or `account.status` some other way will
  leave a demoted HR with manager access.
- **Deleting an employee leaves their Auth account.** Removing the record and
  the `userIndex` row is enough to lock them out, since every rule needs the
  index. But the Auth account lingers, and re-adding the same employee ID will
  fail with "account already exists". Deleting it needs the Admin SDK.
- **The onboarding invite link is not reachable.** `createOnboardingRequest`
  builds `/onboarding/{companyCode}/{employeeId}`, but the route is
  `/onboarding/:requestId` and it sits behind `ProtectedRoute` with an
  HR-only permission. It was already broken before this work; the rules now
  treat onboarding as HR-only, which matches how it actually behaves.
