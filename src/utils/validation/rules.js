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
  mobile: {
    required: true,
    pattern: /^[6-9]\d{9}$/,
    message: "Enter a valid mobile number."
  },
   ownerName: {
    required: true,
    pattern: /^[A-Za-z ]{3,50}$/,
    message: "Enter a valid owner name.",
  },
   name: {
    required: true,
    pattern: /^[A-Za-z ]{3,50}$/,
    message: "Enter a valid name.",
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
   employeeId: {
    required: true,
    pattern: /^[A-Za-z0-9_-]{3,20}$/,
    message:
      "Employee ID must be 3-20 characters and contain only letters, numbers, - or _.",
  },
    department: {
    required: true,
    message: "Please select a department.",
  },
   designation: {
    required: true,
    message: "Please select a designation.",
  },
  address: {
    required: true,
    pattern: /^.{10,200}$/,
    message: "Address must be between 10 and 200 characters.",
  },
};