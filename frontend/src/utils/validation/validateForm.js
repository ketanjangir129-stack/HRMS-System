import { validateField } from "./validateField";

export const validateForm = (formData) => {
  const errors = {};

  Object.entries(formData).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Nested section (e.g. personalInfo, employmentInfo).
      Object.entries(value).forEach(([field, fieldValue]) => {
        const error = validateField(field, fieldValue, formData);

        if (error) {
          errors[field] = error;
        }
      });
    } else {
      // Flat field.
      const error = validateField(key, value, formData);

      if (error) {
        errors[key] = error;
      }
    }
  });

  return errors;
};
