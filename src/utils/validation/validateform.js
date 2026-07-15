import { validateField } from "./validatefield";

export const validateForm = (formData) => {
  const errors = {};

  Object.keys(formData).forEach((field) => {
    const error = validateField(
      field,
      formData[field],
      formData
    );

    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};