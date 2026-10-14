import { ref, get, set } from "firebase/database";
import { db } from "../../firebase/firebase";
import {
  normalizeStatutoryCompliance,
  toStoredESIPolicy,
  toStoredIncomeTaxPolicy,
  toStoredPFPolicy,
  toStoredProfessionalTaxPolicy,
  validateESIPolicy,
  validateIncomeTaxPolicy,
  validatePFPolicy,
  validateProfessionalTaxPolicy,
} from "../../utils/statutoryCompliance/statutoryComplianceConstants";

/*
|--------------------------------------------------------------------------
| Statutory Compliance Service
|--------------------------------------------------------------------------
| The only place that talks to the statutory compliance branch of the database.
|
| companies/{companyCode}/settings/statutoryCompliance/{pf|esi}
|
| Reads never write. A company that has never opened the Statutory Compliance
| screen simply has no node, and the read answers with the defaults from the
| policy constants; initialising the branch on a read would need write access
| from whoever happened to open the page first.
|
| Writes go through the policy constants first, so what lands in Firebase is
| the declared shape as numbers and booleans and nothing else.
|
| PF and ESI are written separately, each behind its own Save button, because
| they are two policies that happen to share a screen - saving one should not
| commit half-finished edits to the other.
|--------------------------------------------------------------------------
*/

const statutoryCompliancePath = (companyCode) =>
  `companies/${companyCode}/settings/statutoryCompliance`;

const legacyHRPolicyPath = (companyCode) =>
  `companies/${companyCode}/settings/hrPolicy`;

const policyPath = (companyCode, key) =>
  `${statutoryCompliancePath(companyCode)}/${key}`;

/*
|--------------------------------------------------------------------------
| Firebase Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in a toast.
*/

const describeError = (error, fallback) => {

  const code = String(
    error?.code || error?.message || ""
  ).toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to manage statutory compliance policies.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(
    describeError(error, fallback)
  );

};

/*
|--------------------------------------------------------------------------
| Get Statutory Compliance
|--------------------------------------------------------------------------
| Both policies, already merged over the defaults, so a caller never has to
| ask whether a company has configured anything.
|
| Falls back to the legacy `settings/hrPolicy` node so companies configured
| before the rename keep their rules without a migration.
*/

export const getStatutoryCompliance = async (companyCode) => {

  try {

    if (!companyCode) {
      return normalizeStatutoryCompliance(null);
    }

    const snapshot = await get(
      ref(db, statutoryCompliancePath(companyCode))
    );

    if (snapshot.exists()) {
      return normalizeStatutoryCompliance(snapshot.val());
    }

    const legacySnapshot = await get(
      ref(db, legacyHRPolicyPath(companyCode))
    );

    return normalizeStatutoryCompliance(
      legacySnapshot.exists() ? legacySnapshot.val() : null
    );

  }

  catch (error) {

    throw failWith(
      error,
      "Get Statutory Compliance Error",
      "Failed to load statutory compliance policies."
    );

  }

};

// Legacy alias: HR Policy was renamed to Statutory Compliance.
export const getHRPolicy = getStatutoryCompliance;

/*
|--------------------------------------------------------------------------
| Save
|--------------------------------------------------------------------------
| One policy at a time, validated here as well as on the screen: the page can
| be edited into a valid looking state and still be saved by a caller that
| skipped the form, and a rate is not something to take on trust.
|
| The branch is replaced rather than merged - the draft is the complete answer
| for that policy, and merging would leave a key the shape no longer mentions
| sitting in the record.
|
| The saved record is returned so the screen can hold it as the new baseline
| without a second read.
*/

const savePolicy = async ({
  companyCode,
  key,
  draft,
  validate,
  toStored,
  context,
  fallbackMessage,
}) => {

  try {

    if (!companyCode) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    const errors = validate(draft);

    const [firstError] = Object.values(errors);

    if (firstError) {
      return {
        success: false,
        message: firstError,
        errors,
      };
    }

    const policy = toStored(draft);

    await set(
      ref(db, policyPath(companyCode, key)),
      policy
    );

    return {
      success: true,
      policy,
    };

  }

  catch (error) {

    throw failWith(error, context, fallbackMessage);

  }

};

export const updatePFPolicy = (companyCode, draft) =>
  savePolicy({
    companyCode,
    key: "pf",
    draft,
    validate: validatePFPolicy,
    toStored: toStoredPFPolicy,
    context: "Update PF Policy Error",
    fallbackMessage: "Failed to save the PF policy. Please try again.",
  });

export const updateESIPolicy = (companyCode, draft) =>
  savePolicy({
    companyCode,
    key: "esi",
    draft,
    validate: validateESIPolicy,
    toStored: toStoredESIPolicy,
    context: "Update ESI Policy Error",
    fallbackMessage: "Failed to save the ESI policy. Please try again.",
  });

export const updateProfessionalTaxPolicy = (companyCode, draft) =>
  savePolicy({
    companyCode,
    key: "professionalTax",
    draft,
    validate: validateProfessionalTaxPolicy,
    toStored: toStoredProfessionalTaxPolicy,
    context: "Update Professional Tax Policy Error",
    fallbackMessage:
      "Failed to save the Professional Tax policy. Please try again.",
  });

export const updateIncomeTaxPolicy = (companyCode, draft) =>
  savePolicy({
    companyCode,
    key: "incomeTax",
    draft,
    validate: validateIncomeTaxPolicy,
    toStored: toStoredIncomeTaxPolicy,
    context: "Update Income Tax Policy Error",
    fallbackMessage: "Failed to save the Income Tax policy. Please try again.",
  });
