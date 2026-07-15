export const rules = {
  companyName: {
    required: true,
    pattern: /^[A-Za-z0-9&.,'()\- ]{3,100}$/,
    message: "Enter a valid company name."
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter a valid email."
  },
  phone: {
    required: true,
    pattern: /^[6-9]\d{9}$/,
    message: "Enter a valid mobile number."
  },
   ownerName: {
    required: true,
    pattern: /^[A-Za-z ]{3,50}$/,
    message: "Enter a valid owner name.",
  },
  password: {
    required: true,
    pattern:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&]).{8,20}$/,
    message:
      "Password must contain uppercase, lowercase, number and special character.",
  },
companyCode: {
    required: true,
    pattern: /^[A-Z0-9]{3,10}$/,
    message:
      "Company code must contain only uppercase letters and numbers.",
  },
};