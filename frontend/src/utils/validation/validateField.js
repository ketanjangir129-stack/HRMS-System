import { rules } from "./rules";

export const validateField = (name, value, formData = {}) => {
  const rule = rules[name];

  if (!rule) return "";

  const isEmpty = !String(value ?? "").trim();

  // Required validation
  if (rule.required && isEmpty) {
    return "This field is required.";
  }

  // Optional field khaali hai to aage ke checks skip
  if (isEmpty) return "";

  // Password match validation
  if (
    name === "confirmPassword" &&
    value !== formData.account.password
  ) {
    return "Passwords do not match.";
  }

  // Regex validation
  if (rule.pattern && !rule.pattern.test(value)) {
    return rule.message;
  }

  // Custom validation (e.g. dob ki age check) — pattern ke baad chalti hai
  if (rule.validate) {
    return rule.validate(value, formData) || "";
  }

  return "";
};