# Attendance Import — Database Rules & Authorization

This document accompanies the Attendance Import feature (`/attendance/import`).
It records what the feature enforces today, what the database currently cannot
enforce, and exactly what has to change before it can.

It exists because the honest answer to "are unauthorized imports prevented at
the database?" is **not yet**, and that is a fact about this project's
authentication model rather than about the import feature.

---

## 1. What the import feature enforces

| Layer | Mechanism | Enforced where |
|---|---|---|
| Which roles can open the page | `attendance.import` in `utils/permissions/permissionConstants.js`, guarded by `PermissionRoute` | Client |
| Which roles are offered the page | `useAttendanceQuickActions`, same permission | Client |
| Which employees a manager may import for | `departmentScope` re-applied per row in `matchImportRows` | Client |
| Which days may be overwritten | `applyExistingRecords` — leave-linked days are never overwritable, in any mode | Client |

The permission defaults to **off for HR, Manager and Employee**. Only the owner
has it without being granted it, and the owner grants it per role from
**Settings → Roles & Access**. This is the same posture as Attendance Settings.

A manager's department scope is a hard rejection, not a filter: a row for an
employee outside their departments becomes a row-level *error*, is counted as
such, appears in the error report, and can never be included in a write batch.

---

## 2. The conflict — why database rules cannot enforce this today

**Only the company owner has a Firebase Authentication session.**

- Owner: signs in via `signInWithEmailAndPassword` → has a real `auth.uid`.
- HR / Manager / Employee: sign in via `authService.loginEmployee()`, which
  **reads `companies/{companyCode}/employees/{employeeId}` and compares a
  password field client-side**, then stores the user object in `localStorage`.

For those three roles there is **no `auth` object in the database rules
context**. A rule cannot ask who they are, what role they hold, or which
departments they manage, because as far as the database is concerned nobody is
signed in.

Consequences:

1. A rule of `auth != null` on the attendance branch would **lock out HR,
   managers and employees entirely** — including punch in and punch out.
2. Because of (1), the attendance branch must currently be writable without
   authentication for the application to work at all.
3. Therefore **anyone who can reach the database URL can write attendance**,
   with or without this import feature. The import feature does not widen this;
   it inherits it.
4. Department-scoped manager rules are impossible to express: the rule has no
   identity to resolve a department from.

There is also **no rules file in this repository** — no `database.rules.json`,
`firebase.json` or `.firebaserc`. The deployed rules live only in the Firebase
console and are not under version control.

**This was not changed as part of the import feature.** Adding a rules file that
appeared to enforce roles while enforcing nothing would be worse than the
current state, because it would look like the problem had been solved.

---

## 3. What must change to enforce it properly

These are prerequisites, and each is a change to the authentication model rather
than to attendance:

1. **Give every user a Firebase Auth identity.** Custom tokens minted by a
   trusted backend are the usual route for an employee-ID-and-password login;
   Firebase Auth accounts per employee is the simpler one.
2. **Put role and company in custom claims** (`role`, `companyCode`), so a rule
   can read them without a database lookup. A role stored only in the database
   can be read by a rule via `root.child(...)`, but is then only as trustworthy
   as the write rules on the node holding it.
3. **Stop treating `localStorage` as authorization.** It is currently the only
   thing standing between an employee and an HR screen once the page has loaded.
4. **Commit the rules to this repository** so they can be reviewed and deployed
   with the code.

Until at least (1) and (2) are done, no rule can distinguish HR from Employee.

---

## 4. Proposed rules, once identities exist

Given `auth.token.role` and `auth.token.companyCode`, the attendance branch
becomes expressible. `$companyCode == auth.token.companyCode` is the clause that
stops the "change the company code in the URL" attack:

```json
{
  "rules": {
    "companies": {
      "$companyCode": {
        ".read": "auth != null && auth.token.companyCode == $companyCode",

        "attendance": {

          "records": {
            "$year": { "$month": { "$date": { "$employeeId": {
              ".write": "auth != null
                && auth.token.companyCode == $companyCode
                && (
                     auth.token.role == 'owner'
                  || auth.token.role == 'hr'
                  || (auth.token.role == 'manager'
                      && root.child('companies/' + $companyCode + '/employees/'
                          + $employeeId + '/employmentInfo/department').val()
                         == root.child('companies/' + $companyCode + '/departments/'
                          + auth.token.departmentId + '/name').val())
                  || (auth.token.employeeId == $employeeId
                      && !data.exists())
                )",

              "leaveRequestId": {
                ".validate": "!data.exists() || newData.val() == data.val()"
              }
            }}}}
          },

          "imports": {
            ".indexOn": ["uploadedAt"],
            "$importId": {
              ".write": "auth != null
                && auth.token.companyCode == $companyCode
                && (auth.token.role == 'owner' || auth.token.role == 'hr'
                    || auth.token.role == 'manager')",
              ".validate": "newData.hasChildren(['importId','uploadedBy','uploadedAt','status'])"
            }
          }
        }
      }
    }
  }
}
```

Notes on the above:

- **Employees can never import.** No branch of the write rule admits
  `role == 'employee'` for another employee's record, and their own is limited
  to creating a record that does not yet exist — a punch in, not a rewrite of
  history.
- **`leaveRequestId` is protected at the database**, mirroring what the importer
  refuses to do in the client. This is the one attendance invariant worth
  enforcing in two places: an overwritten leave link cannot be repaired by
  re-running anything, because `clearLeaveAttendance` finds days to release by
  exactly that field.
- **Manager scope is illustrative.** A manager can hold several departments,
  which a single `departmentId` claim cannot express. Doing it properly needs
  either a claim carrying a list, or a `departmentManagers/{employeeId}` index
  node the rule can read.
- **`.indexOn: ["uploadedAt"]` is required**, not optional. `getImportHistory`
  calls `orderByChild("uploadedAt")`; without the index Firebase downloads the
  whole node and sorts in the client, and logs a warning.

---

## 5. The one rule worth adding now

Even without authentication changes, `.indexOn` should be added for the import
history, because it affects behaviour rather than security:

```json
"companies": {
  "$companyCode": {
    "attendance": {
      "imports": { ".indexOn": ["uploadedAt"] }
    }
  }
}
```

---

## 6. Summary

| Requirement | Status |
|---|---|
| Only authorized roles see the import page | Enforced (client) |
| Employees cannot import | Enforced (client), **not** enforced at the database |
| Managers restricted to their departments | Enforced (client), **not** enforced at the database |
| Cannot import into another company | **Not** enforced — no identity to check against |
| Approved-leave days protected | Enforced (client); rule proposed above |
| Import history indexed | Not configured — see §5 |

The client-side enforcement is real and is applied at the row level before any
write is built. It is not a substitute for database rules, and this document
should be treated as an open item rather than a description of a finished
security model.
