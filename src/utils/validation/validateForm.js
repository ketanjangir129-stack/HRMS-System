import { validateField } from "./validateField";

export const validateForm = (formData) => {
  const errors = {};

  Object.keys(formData).forEach((section) => {
    Object.keys(formData[section]).forEach((field) =>{
    const error = validateField(
      field,
      formData[section][field],
      formData
    );

    if (error) {
      errors[field] = error;
    }
  });
  });
  return errors;
};