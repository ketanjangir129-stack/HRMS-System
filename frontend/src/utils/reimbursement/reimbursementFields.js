import { REIMBURSEMENT_CATEGORIES } from "./reimbursementConstants";

// Category-specific expense fields. Keep these in sync with
// backend/src/services/reimbursementService.js.
export const TRAVEL_MODES = [
  "Bus",
  "Train",
  "Taxi",
  "Bike (Ola/Rapido/Uber)",
  "Truck",
];

export const FOOD_ORDER_TYPES = [
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

export const ONLINE_FOOD_PLATFORMS = ["Swiggy", "Zomato", "Other"];

export const FUEL_KM_PER_LITRE = 40;
export const METER_DIGITS = 5;
export const MAX_BILL_IMAGES = 10;

// Every row carries the union of fields so switching category can reset cleanly
// and a single validator can cover all categories.
export const createEmptyExpense = (category = "") => ({
  category,
  // Common
  billNo: "",
  billDate: "",
  amount: "",
  receiptUrls: [],
  note: "",
  // Travel
  travelFrom: "",
  travelTo: "",
  travelMode: "",
  // Food
  orderType: "",
  foodPlatform: "",
  vendorName: "",
  // Stay
  hotelName: "",
  stayDays: "",
  // Fuel
  meterStart: "",
  meterEnd: "",
  meterStartImg: "",
  meterEndImg: "",
  fuelRate: "",
});

// Meter readings are 5 digits; keep only the first five digits while typing.
export const normalizeMeterReading = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, METER_DIGITS);

export const isFiveDigitReading = (value) =>
  new RegExp(`^\\d{${METER_DIGITS}}$`).test(String(value ?? "").trim());

export const fuelMetrics = (row = {}) => {
  const start = Number(row.meterStart);
  const end = Number(row.meterEnd);
  const rate = Number(row.fuelRate);
  const readingsValid =
    isFiveDigitReading(row.meterStart) &&
    isFiveDigitReading(row.meterEnd) &&
    end > start;
  const distanceKm = readingsValid ? end - start : 0;
  const fuelLitres = Math.round((distanceKm / FUEL_KM_PER_LITRE) * 100) / 100;
  const cost = Number.isFinite(rate) && rate > 0
    ? Math.round(fuelLitres * rate * 100) / 100
    : 0;
  return { distanceKm, fuelLitres, cost };
};

const hasText = (value) => Boolean(String(value ?? "").trim());

export const validateExpenseRow = (row = {}) => {
  const errors = {};

  if (!row.category) {
    errors.category = "Select a category.";
    return errors;
  }
  if (!REIMBURSEMENT_CATEGORIES.includes(row.category)) {
    errors.category = "Choose a valid category.";
    return errors;
  }

  if (row.category === "Fuel") {
    if (!isFiveDigitReading(row.meterStart)) {
      errors.meterStart = "Enter the first 5 digits of the start meter reading.";
    }
    if (!isFiveDigitReading(row.meterEnd)) {
      errors.meterEnd = "Enter the first 5 digits of the end meter reading.";
    }
    if (
      !errors.meterStart &&
      !errors.meterEnd &&
      Number(row.meterEnd) <= Number(row.meterStart)
    ) {
      errors.meterEnd = "End reading must be greater than the start reading.";
    }
    if (!hasText(row.meterStartImg)) {
      errors.meterStartImg = "Attach the start meter photo.";
    }
    if (!hasText(row.meterEndImg)) {
      errors.meterEndImg = "Attach the end meter photo.";
    }
    if (!(Number(row.fuelRate) > 0)) {
      errors.fuelRate = "Enter the fuel rate per litre.";
    }
    if (!hasText(row.note)) {
      errors.note = "Give a reason for the fuel claim.";
    }
    return errors;
  }

  if (!(Number(row.amount) > 0)) errors.amount = "Enter an amount above zero.";
  const billImages = Array.isArray(row.receiptUrls) ? row.receiptUrls.filter(Boolean) : [];
  if (!billImages.length) {
    errors.receiptUrls =
      row.category === "Travel"
        ? "Attach at least one clear ticket image."
        : "Attach at least one bill image.";
  } else if (billImages.length > MAX_BILL_IMAGES) {
    errors.receiptUrls = `Attach at most ${MAX_BILL_IMAGES} images per bill.`;
  }

  if (row.category === "Travel") {
    if (!hasText(row.travelFrom)) errors.travelFrom = "Enter the travel origin.";
    if (!hasText(row.travelTo)) errors.travelTo = "Enter the travel destination.";
    if (!TRAVEL_MODES.includes(row.travelMode)) {
      errors.travelMode = "Select how you travelled.";
    }
    if (!row.billDate) errors.billDate = "Ticket date is required.";
  } else if (row.category === "Food") {
    if (!hasText(row.billNo)) errors.billNo = "Bill number is required.";
    if (!row.billDate) errors.billDate = "Bill date is required.";
    if (!FOOD_ORDER_TYPES.some((type) => type.key === row.orderType)) {
      errors.orderType = "Select online or offline order.";
    }
    if (row.orderType === "online") {
      if (!ONLINE_FOOD_PLATFORMS.includes(row.foodPlatform)) {
        errors.foodPlatform = "Select Swiggy, Zomato or Other.";
      }
      if (row.foodPlatform === "Other" && !hasText(row.vendorName)) {
        errors.vendorName = "Enter the platform name.";
      }
    }
    if (row.orderType === "offline" && !hasText(row.vendorName)) {
      errors.vendorName = "Enter the restaurant name.";
    }
  } else if (row.category === "Stay") {
    if (!hasText(row.hotelName)) errors.hotelName = "Hotel name is required.";
    if (!hasText(row.billNo)) errors.billNo = "Bill number is required.";
    if (!row.billDate) errors.billDate = "Bill date is required.";
    const days = Number(row.stayDays);
    if (!Number.isInteger(days) || days < 1) {
      errors.stayDays = "Stay duration must be at least 1 day.";
    }
  } else {
    if (!hasText(row.billNo)) errors.billNo = "Bill number is required.";
    if (!row.billDate) errors.billDate = "Bill date is required.";
  }

  return errors;
};
