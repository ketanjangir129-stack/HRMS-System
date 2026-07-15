import { rules } from "./rules";

export const validateField = (name, value, formData = {}) => {
  const rule = rules[name];

  if (!rule) return "";

  // Required validation
  if (rule.required && !value.trim()) {
    return "This field is required.";
  }

  // Password match validation
  if (
    name === "confirmPassword" &&
    value !== formData.password
  ) {
    return "Passwords do not match.";
  }

  // Regex validation
  if (rule.pattern && !rule.pattern.test(value)) {
    return rule.message;
  }

  return "";
};