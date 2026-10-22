const db = require("../config/firebase");
const employeeService = require("./employeeService");

const REIMBURSEMENT_ROOT = "reimbursements";

const CATEGORIES = ["Travel", "Food", "Stay", "Fuel", "Medical", "Other"];
const TYPES = ["single", "trip"];
const STATUSES = ["pending", "approved", "rejected"];
const MAX_EXPENSES_PER_TRIP = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Category-specific rules. Keep these in sync with
// frontend/src/utils/reimbursement/reimbursementFields.js.
const TRAVEL_MODES = ["Bus", "Train", "Taxi", "Bike (Ola/Rapido/Uber)", "Truck"];
const FOOD_ORDER_TYPES = ["online", "offline"];
const ONLINE_FOOD_PLATFORMS = ["Swiggy", "Zomato", "Other"];
const FUEL_KM_PER_LITRE = 40;
const METER_PATTERN = /^\d{5}$/;
const MAX_BILL_IMAGES = 10;

function fail(message, statusCode = 400, code = "BAD_REQUEST") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function companyRoot(companyCode) {
  if (!companyCode || typeof companyCode !== "string") {
    fail("A valid company code is required.", 400);
  }
  return `companies/${companyCode}`;
}

function claimsRef(companyCode) {
  return db.ref(`${companyRoot(companyCode)}/${REIMBURSEMENT_ROOT}`);
}

function claimRef(companyCode, claimId) {
  return db.ref(`${companyRoot(companyCode)}/${REIMBURSEMENT_ROOT}/${claimId}`);
}

function normalizeRole(user) {
  return String(user?.role || "").toLowerCase();
}

function isSameEmployee(a, b) {
  return Boolean(a && b) && String(a).toUpperCase() === String(b).toUpperCase();
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function getViewerEmployee(companyCode, user) {
  const rawId = String(user?.employeeId || "").trim();
  if (!rawId) return null;
  const upperId = rawId.toUpperCase();
  const viewer = await employeeService.getEmployeeById(companyCode, upperId);
  if (viewer) return viewer;
  if (upperId !== rawId) {
    return employeeService.getEmployeeById(companyCode, rawId);
  }
  return null;
}

// Only a Finance Manager decides claims. There is no finance role — roles stay
// owner / hr / manager / employee, so membership is read off the viewer's
// employee record (department + designation), never trusted from the token.
// Stricter than resignation's isFinanceMember: Finance Executives can see
// nothing here.
function isFinanceManager(employee) {
  if (!employee) return false;
  const department =
    employee?.employmentInfo?.department || employee?.department || "";
  const designation =
    employee?.employmentInfo?.designation || employee?.designation || "";
  return (
    normalizeKey(department) === "finance" &&
    normalizeKey(designation) === "finance manager"
  );
}

async function verifyFinanceManager(companyCode, user) {
  if (normalizeRole(user) === "owner") return true;
  const viewer = await getViewerEmployee(companyCode, user);
  if (isFinanceManager(viewer)) return true;
  fail("Only a Finance Manager can approve or reject reimbursements.", 403, "FORBIDDEN");
}

function validateDateKey(value, field) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    fail(`${field} must use YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    fail(`Invalid calendar date: ${value}.`);
  }
  return value;
}

function optionalText(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function requiredText(value, message, max = 120) {
  const text = String(value ?? "").trim();
  if (!text) fail(message);
  return text.slice(0, max);
}

function requiredImage(value, message) {
  const url = String(value ?? "").trim();
  if (!url) fail(message);
  return url.slice(0, 1000);
}

// Accepts the new receiptUrls array and the legacy single receiptUrl.
function billImageUrls(input) {
  const raw = Array.isArray(input?.receiptUrls)
    ? input.receiptUrls
    : input?.receiptUrl
      ? [input.receiptUrl]
      : [];
  const urls = raw.map((url) => String(url ?? "").trim()).filter(Boolean);
  if (urls.length > MAX_BILL_IMAGES) {
    fail(`A bill can have at most ${MAX_BILL_IMAGES} images.`);
  }
  return urls.map((url) => url.slice(0, 1000));
}

function validAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    fail(`${label}: amount must be greater than zero.`);
  }
  return Math.round(amount * 100) / 100;
}

function validateExpense(input, index) {
  const label = `Expense ${index + 1}`;
  if (!input || typeof input !== "object") fail(`${label} is invalid.`);
  const category = String(input.category || "").trim();
  if (!CATEGORIES.includes(category)) {
    fail(`${label}: category must be one of ${CATEGORIES.join(", ")}.`);
  }

  const expense = {
    expenseId: String(input.expenseId || `EXP_${Date.now()}_${index}`).slice(0, 60),
    category,
    billNo: optionalText(input.billNo, 80),
    billDate: "",
    amount: 0,
    receiptUrl: "",
    receiptUrls: [],
    note: optionalText(input.note || input.reason, 500),
    details: {},
  };

  if (category === "Travel") {
    const travelFrom = requiredText(input.travelFrom, `${label}: travel from is required.`);
    const travelTo = requiredText(input.travelTo, `${label}: travel to is required.`);
    const travelMode = String(input.travelMode || "").trim();
    if (!TRAVEL_MODES.includes(travelMode)) {
      fail(`${label}: travel using must be one of ${TRAVEL_MODES.join(", ")}.`);
    }
    expense.billDate = validateDateKey(input.billDate, `${label}: ticket date`);
    const receiptUrls = billImageUrls(input);
    if (!receiptUrls.length) fail(`${label}: at least one ticket image is required.`);
    expense.receiptUrls = receiptUrls;
    expense.receiptUrl = receiptUrls[0];
    expense.amount = validAmount(input.amount, label);
    expense.details = { travelFrom, travelTo, travelMode };
  } else if (category === "Food") {
    expense.billNo = requiredText(input.billNo, `${label}: bill number is required.`, 80);
    expense.billDate = validateDateKey(input.billDate, `${label}: bill date`);
    const orderType = String(input.orderType || "").trim().toLowerCase();
    if (!FOOD_ORDER_TYPES.includes(orderType)) {
      fail(`${label}: order type must be online or offline.`);
    }
    let foodPlatform = "";
    let vendorName = "";
    if (orderType === "online") {
      foodPlatform = String(input.foodPlatform || "").trim();
      if (!ONLINE_FOOD_PLATFORMS.includes(foodPlatform)) {
        fail(`${label}: ordered from must be Swiggy, Zomato or Other.`);
      }
      if (foodPlatform === "Other") {
        vendorName = requiredText(input.vendorName, `${label}: platform name is required.`);
      }
    } else {
      vendorName = requiredText(input.vendorName, `${label}: restaurant name is required.`);
    }
    expense.receiptUrls = billImageUrls(input);
    if (!expense.receiptUrls.length) fail(`${label}: at least one bill image is required.`);
    expense.receiptUrl = expense.receiptUrls[0];
    expense.amount = validAmount(input.amount, label);
    expense.details = { orderType, foodPlatform, vendorName };
  } else if (category === "Stay") {
    const hotelName = requiredText(input.hotelName, `${label}: hotel name is required.`);
    expense.billNo = requiredText(input.billNo, `${label}: bill number is required.`, 80);
    expense.billDate = validateDateKey(input.billDate, `${label}: bill date`);
    const stayDays = Number(input.stayDays);
    if (!Number.isInteger(stayDays) || stayDays < 1) {
      fail(`${label}: stay duration must be at least 1 day.`);
    }
    expense.receiptUrls = billImageUrls(input);
    if (!expense.receiptUrls.length) fail(`${label}: at least one bill image is required.`);
    expense.receiptUrl = expense.receiptUrls[0];
    expense.amount = validAmount(input.amount, label);
    expense.details = { hotelName, stayDays };
  } else if (category === "Fuel") {
    const meterStart = String(input.meterStart || "").trim();
    const meterEnd = String(input.meterEnd || "").trim();
    if (!METER_PATTERN.test(meterStart)) {
      fail(`${label}: start meter reading must be the first 5 digits.`);
    }
    if (!METER_PATTERN.test(meterEnd)) {
      fail(`${label}: end meter reading must be the first 5 digits.`);
    }
    if (Number(meterEnd) <= Number(meterStart)) {
      fail(`${label}: end meter reading must be greater than the start reading.`);
    }
    const meterStartImg = requiredImage(
      input.meterStartImg,
      `${label}: start meter image is required.`
    );
    const meterEndImg = requiredImage(
      input.meterEndImg,
      `${label}: end meter image is required.`
    );
    const fuelRate = Number(input.fuelRate);
    if (!Number.isFinite(fuelRate) || fuelRate <= 0) {
      fail(`${label}: fuel rate must be greater than zero.`);
    }
    if (!expense.note) fail(`${label}: a reason is required.`);
    const distanceKm = Number(meterEnd) - Number(meterStart);
    const fuelLitres = Math.round((distanceKm / FUEL_KM_PER_LITRE) * 100) / 100;
    expense.amount = Math.round(fuelLitres * fuelRate * 100) / 100;
    expense.details = {
      meterStart,
      meterEnd,
      meterStartImg,
      meterEndImg,
      fuelRate,
      distanceKm,
      fuelLitres,
      kmPerLitre: FUEL_KM_PER_LITRE,
    };
  } else {
    // Medical / Other keep the generic bill layout.
    expense.billNo = requiredText(input.billNo, `${label}: bill number is required.`, 80);
    expense.billDate = validateDateKey(input.billDate, `${label}: bill date`);
    expense.receiptUrls = billImageUrls(input);
    if (!expense.receiptUrls.length) {
      fail(`${label}: at least one bill / receipt image is required.`);
    }
    expense.receiptUrl = expense.receiptUrls[0];
    expense.amount = validAmount(input.amount, label);
  }

  return expense;
}

function validatePayload(payload) {
  const body = payload || {};
  const type = normalizeKey(body.type);
  if (!TYPES.includes(type)) fail('Claim type must be "single" or "trip".');

  const expensesInput = Array.isArray(body.expenses) ? body.expenses : [];
  if (type === "single") {
    if (expensesInput.length !== 1) fail("A single claim needs exactly one expense.");
    const category = String(body.category || expensesInput[0]?.category || "").trim();
    if (!CATEGORIES.includes(category)) {
      fail(`Category must be one of ${CATEGORIES.join(", ")}.`);
    }
    const expense = validateExpense({ ...expensesInput[0], category }, 0);
    return {
      type,
      category: expense.category,
      title: String(body.title || `${expense.category} expense`).trim().slice(0, 120),
      tripFrom: "",
      tripTo: "",
      expenses: [expense],
      totalAmount: expense.amount,
    };
  }

  if (expensesInput.length < 1) fail("A trip claim needs at least one expense.");
  if (expensesInput.length > MAX_EXPENSES_PER_TRIP) {
    fail(`A trip claim can hold at most ${MAX_EXPENSES_PER_TRIP} expenses.`);
  }
  const title = String(body.title || "").trim();
  if (!title) fail("A trip claim needs a title (e.g. Mumbai client visit).");
  const tripFrom = body.tripFrom ? validateDateKey(body.tripFrom, "Trip start date") : "";
  const tripTo = body.tripTo ? validateDateKey(body.tripTo, "Trip end date") : "";
  if (tripFrom && tripTo && tripTo < tripFrom) {
    fail("The trip end date cannot be before the start date.");
  }
  const expenses = expensesInput.map((item, index) => validateExpense(item, index));
  const totalAmount = Math.round(expenses.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  return {
    type,
    category: "Mixed",
    title: title.slice(0, 120),
    tripFrom,
    tripTo,
    expenses,
    totalAmount,
  };
}

function employeeSnapshot(employee, user) {
  const personal = employee?.personalInfo || {};
  const employment = employee?.employmentInfo || {};
  return {
    employeeName:
      personal.name || employment.name || user?.name || user?.employeeId || "Employee",
    department: employment.department || employee?.department || "",
    designation: employment.designation || employee?.designation || "",
  };
}

async function createClaim({ companyCode, user, payload }) {
  if (!user?.employeeId) fail("Authenticated employee not found.", 403, "FORBIDDEN");
  const normalized = validatePayload(payload);
  const viewer = await getViewerEmployee(companyCode, user).catch(() => null);
  const snapshot = employeeSnapshot(viewer, user);

  const claimId = `RBMS_${db.ref().push().key}`;
  const now = Date.now();
  const claim = {
    claimId,
    companyCode,
    employeeId: String(user.employeeId).toUpperCase(),
    ...snapshot,
    ...normalized,
    status: "pending",
    submittedAt: now,
    updatedAt: now,
    decidedAt: null,
    decidedBy: "",
    rejectReason: "",
  };
  await claimRef(companyCode, claimId).set(claim);
  return { success: true, claimId, claim };
}

async function listClaims({ companyCode, user }) {
  const snap = await claimsRef(companyCode).once("value");
  const root = snap.val() || {};
  const all = Object.values(root).filter((item) => item && typeof item === "object");

  // Employee sees own claims only. Finance Managers and the owner see all.
  if (normalizeRole(user) === "owner") {
    return all.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }
  const viewer = await getViewerEmployee(companyCode, user).catch(() => null);
  if (isFinanceManager(viewer)) {
    return all.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }
  const selfId = String(user?.employeeId || "").toUpperCase();
  return all
    .filter((item) => String(item.employeeId || "").toUpperCase() === selfId)
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

async function getClaim({ companyCode, user, claimId }) {
  if (!claimId) fail("Claim ID is required.");
  const snap = await claimRef(companyCode, claimId).once("value");
  const claim = snap.val();
  if (!claim) fail("Reimbursement claim not found.", 404, "NOT_FOUND");

  if (normalizeRole(user) === "owner") return claim;
  const viewer = await getViewerEmployee(companyCode, user).catch(() => null);
  if (isFinanceManager(viewer)) return claim;
  if (isSameEmployee(claim.employeeId, user?.employeeId)) return claim;
  fail("You are not authorized to view this claim.", 403, "FORBIDDEN");
}

async function transitionClaim({ companyCode, claimId, callback }) {
  const ref = claimRef(companyCode, claimId);
  let refused = null;
  const result = await ref.transaction((current) => {
    refused = null;
    if (current === null) return null;
    try {
      return callback(current);
    } catch (error) {
      refused = error;
      return;
    }
  });
  if (refused) throw refused;
  if (!result.snapshot.exists()) fail("Reimbursement claim not found.", 404, "NOT_FOUND");
  if (!result.committed) {
    fail("The claim was changed by another user. Refresh and retry.", 409, "CONFLICT");
  }
  return result.snapshot.val();
}

function approverName(user) {
  return (
    user?.name ||
    user?.personalInfo?.name ||
    user?.employmentInfo?.name ||
    user?.employeeId ||
    "Finance Manager"
  );
}

async function approveClaim({ companyCode, user, claimId, remarks = "" }) {
  await verifyFinanceManager(companyCode, user);
  const updated = await transitionClaim({
    companyCode,
    claimId,
    callback: (current) => {
      if (String(current.status) !== "pending") {
        fail("Only pending claims can be approved.", 409, "CONFLICT");
      }
      return {
        ...current,
        status: "approved",
        decidedBy: approverName(user),
        decidedAt: Date.now(),
        updatedAt: Date.now(),
        rejectReason: "",
        approverRemarks: String(remarks || "").trim().slice(0, 500),
      };
    },
  });
  return { success: true, claim: updated };
}

async function rejectClaim({ companyCode, user, claimId, reason }) {
  await verifyFinanceManager(companyCode, user);
  // Whole-claim rejection: one mismatch rejects the entire trip claim.
  const rejectReason = String(reason || "").trim();
  if (!rejectReason) fail("A rejection reason is required.");
  const updated = await transitionClaim({
    companyCode,
    claimId,
    callback: (current) => {
      if (String(current.status) !== "pending") {
        fail("Only pending claims can be rejected.", 409, "CONFLICT");
      }
      return {
        ...current,
        status: "rejected",
        decidedBy: approverName(user),
        decidedAt: Date.now(),
        updatedAt: Date.now(),
        rejectReason: rejectReason.slice(0, 500),
      };
    },
  });
  return { success: true, claim: updated };
}

async function getSummary({ companyCode, user }) {
  const claims = await listClaims({ companyCode, user });
  const summary = claims.reduce(
    (acc, claim) => {
      const amount = Number(claim.totalAmount) || 0;
      acc.totalClaims += 1;
      acc.totalAmount += amount;
      if (claim.status === "pending") {
        acc.pendingClaims += 1;
        acc.pendingAmount += amount;
      } else if (claim.status === "approved") {
        acc.approvedClaims += 1;
        acc.approvedAmount += amount;
      } else if (claim.status === "rejected") {
        acc.rejectedClaims += 1;
        acc.rejectedAmount += amount;
      }
      const key = claim.type === "trip" ? "trip" : "single";
      acc.byType[key].claims += 1;
      acc.byType[key].amount += amount;
      return acc;
    },
    {
      totalClaims: 0,
      totalAmount: 0,
      pendingClaims: 0,
      pendingAmount: 0,
      approvedClaims: 0,
      approvedAmount: 0,
      rejectedClaims: 0,
      rejectedAmount: 0,
      byType: { single: { claims: 0, amount: 0 }, trip: { claims: 0, amount: 0 } },
      byCategory: {},
    }
  );
  for (const claim of claims) {
    for (const expense of claim.expenses || []) {
      const cat = expense.category || "Other";
      summary.byCategory[cat] = summary.byCategory[cat] || { claims: 0, amount: 0 };
      summary.byCategory[cat].amount += Number(expense.amount) || 0;
      summary.byCategory[cat].claims += 1;
    }
  }
  summary.totalAmount = Math.round(summary.totalAmount * 100) / 100;
  summary.pendingAmount = Math.round(summary.pendingAmount * 100) / 100;
  summary.approvedAmount = Math.round(summary.approvedAmount * 100) / 100;
  summary.rejectedAmount = Math.round(summary.rejectedAmount * 100) / 100;
  return summary;
}

module.exports = {
  CATEGORIES,
  TYPES,
  STATUSES,
  createClaim,
  listClaims,
  getClaim,
  approveClaim,
  rejectClaim,
  getSummary,
  isFinanceManager,
};
