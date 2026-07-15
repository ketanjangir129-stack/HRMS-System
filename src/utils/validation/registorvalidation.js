import {
  companyNameRegex,
  companyCodeRegex,
  ownerNameRegex,
  emailRegex,
  phoneRegex,
  passwordRegex,
} from "./validation";

export const validateRegisterForm = (formData) => {
  const errors = {};

  if (!companyNameRegex.test(formData.companyName.trim())) {
    errors.companyName = "Enter a valid company name.";
  }

  if (!companyCodeRegex.test(formData.companyCode.trim())) {
    errors.companyCode =
      "Company code must be 3-10 uppercase letters or numbers.";
  }

  if (!ownerNameRegex.test(formData.ownerName.trim())) {
    errors.ownerName = "Enter a valid owner name.";
  }

  if (!emailRegex.test(formData.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!phoneRegex.test(formData.phone.trim())) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  if (!passwordRegex.test(formData.password)) {
    errors.password =
      "Password must be 8-20 characters with uppercase, lowercase, number, and special character.";
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};