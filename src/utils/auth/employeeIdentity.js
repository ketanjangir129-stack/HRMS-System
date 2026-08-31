/*
|--------------------------------------------------------------------------
| Employee identity
|--------------------------------------------------------------------------
| HR and employees sign in with a company code and an employee ID, not an
| email — but Firebase Auth only issues a uid in exchange for a credential it
| understands. So each employee gets an email/password account whose address is
| derived from the two things they already type on the login form:
|
|   CMP001 + EMP007  ->  emp007@cmp001.hrms.local
|
| The address is a routing detail, never shown and never delivered to. The
| employee's real address stays in personalInfo.email. Because the mapping is
| pure, login needs no database read before authenticating — which is the whole
| point: the old flow had to read the employee record to check a password, and
| that read is exactly what the security rules now refuse.
|--------------------------------------------------------------------------
*/

// Kept as a constant so it can be recognised (and excluded) anywhere the app
// lists real employee addresses.
export const EMPLOYEE_EMAIL_DOMAIN = "hrms.local";

export const normalizeCompanyCode = (companyCode = "") =>
  String(companyCode).trim().toUpperCase();

export const normalizeEmployeeId = (employeeId = "") =>
  String(employeeId).trim().toUpperCase();

/*
| Firebase rejects an address with characters an email cannot carry, and our
| employee IDs are free text. Anything outside [a-z0-9] collapses to a dash so
| "EMP 007/A" and "EMP-007-A" cannot both be minted into the same address by
| accident — the ID is lowercased and stripped, not hashed, so the result stays
| readable in the Firebase console.
*/
const toEmailPart = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const buildEmployeeEmail = (companyCode, employeeId) => {
  const company = toEmailPart(companyCode);
  const employee = toEmailPart(employeeId);

  if (!company || !employee) {
    throw new Error("Company code and employee ID are required.");
  }

  return `${employee}@${company}.${EMPLOYEE_EMAIL_DOMAIN}`;
};

export const isEmployeeEmail = (email = "") =>
  String(email).toLowerCase().endsWith(`.${EMPLOYEE_EMAIL_DOMAIN}`);

/*
| The login form has one field for both kinds of user. An owner types an email
| address; everyone else types an employee ID. A literal "@" is the only thing
| that separates the two cases, which is the rule the old loginUser already used.
*/
export const isOwnerLogin = (userId = "") => String(userId).includes("@");

/*
| The starting password a new employee is given, which they are forced to
| change on first sign-in. It stays the employee ID, as it always was, so
| nothing HR tells a new joiner has to change.
|
| Firebase Auth rejects anything under six characters, and employee IDs are not
| required to be that long, so short ones are suffixed. Creation and migration
| both call this — they have to agree, or migrated employees cannot sign in
| with the password they were told.
*/
const MIN_PASSWORD_LENGTH = 6;

export const buildDefaultPassword = (employeeId) => {
  const id = normalizeEmployeeId(employeeId);

  return id.length >= MIN_PASSWORD_LENGTH ? id : `${id}@hrms`;
};
