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
  gender: {
    required: true,
    // Sirf wahi values jo dropdown deta hai
    pattern: /^(Male|Female|Prefer not to say)$/,
    message: "Please select a gender.",
  },
  // Add Employee form DOB nahi puchta — details page se bharna zaroori hai.
  dob: {
    required: true,
    // HTML date input value format: YYYY-MM-DD
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: "Please enter a valid date of birth.",
    // Aane wali date ya 18 saal se kam umar allowed nahi
    validate: (value) => {
      const dob = new Date(value);

      if (Number.isNaN(dob.getTime())) {
        return "Please enter a valid date of birth.";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dob > today) {
        return "Date of birth cannot be in the future.";
      }

      // 18th birthday nikaalo aur aaj se compare karo
      const eighteenth = new Date(dob);
      eighteenth.setFullYear(eighteenth.getFullYear() + 18);

      if (eighteenth > today) {
        return "Employee must be at least 18 years old.";
      }

      return "";
    },
  },
  address: {
    required: true,
    pattern: /^.{10,200}$/,
    message: "Address must be between 10 and 200 characters.",
  },
  departmentName: {
    required: true,
    pattern: /^[A-Za-z ]{2,50}$/,
    message: "Department name must contain only letters and be 2-50 characters.",
  },

  designationName: {
    required: true,
    pattern: /^[A-Za-z ]{2,50}$/,
    message: "Designation name must contain only letters and be 2-50 characters.",
  },

  // onboarding form fields
  joiningDate: {
    required: true,
    // HTML date input value format: YYYY-MM-DD
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: "Please enter a valid joining date.",
  },

  // bank info — details page ke Bank Information card se bharta hai
  bankName: {
    required: true,
    pattern: /^[A-Za-z][A-Za-z .&'-]{2,59}$/,
    message: "Enter a valid bank name.",
  },
  branch: {
    required: true,
    pattern: /^[A-Za-z0-9][A-Za-z0-9 .,&'()-]{1,59}$/,
    message: "Enter a valid branch name.",
  },
  accountNumber: {
    required: true,
    // Onboarding wizard jitna hi dheela (6-18 digits), taaki approve hue
    // records details page par edit karte waqt reject na hon
    pattern: /^\d{6,18}$/,
    message: "Account number must be 6-18 digits.",
  },
  ifsc: {
    required: true,
    // 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)
    pattern: /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/,
    message: "Enter a valid IFSC code (e.g. HDFC0001234).",
  },

  aadhaar: {
    required: true,
    // Onboarding wizard jaisa hi — koi bhi 12 digits
    pattern: /^\d{12}$/,
    message: "Aadhaar number must be 12 digits.",
  },
  pan: {
    required: true,
    // 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
    pattern: /^[A-Za-z]{5}\d{4}[A-Za-z]$/,
    message: "Enter a valid PAN (e.g. ABCDE1234F).",
  },

  // documents — resume sirf PDF (file name ya link, dono chalenge)
  resume: {
    required: false,
    pattern: /^\S.*\.pdf(\?\S*)?$/i,
    message: "Resume must be a PDF file (.pdf).",
  },

  employeeType: {
    required: true,
    // Human input like "Full Time", "Part-Time", "Contract".
    pattern: /^[A-Za-z][A-Za-z ]{1,49}(-[A-Za-z ]{1,49})?$/,
    message: "Enter a valid employee type.",
  },

  // task module — Tasks page ke create/edit form ke liye
  taskTitle: {
    required: true,
    // Letter ya digit se shuru, 5-100 characters
    pattern: /^[A-Za-z0-9][A-Za-z0-9 .,'()\-/&]{4,99}$/,
    message: "Task title must be 5-100 characters.",
  },

  taskAssignee: {
    required: true,
    message: "Please select an employee.",
  },

  taskDescription: {
    required: false,
    // Newline bhi allowed — isliye [\s\S]
    pattern: /^[\s\S]{0,500}$/,
    message: "Description cannot exceed 500 characters.",
  },

  taskDueDate: {
    required: true,
    // HTML date input value format: YYYY-MM-DD
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: "Please select a valid due date.",
    // Guzri hui date par task assign nahi ho sakta
    validate: (value) => {
      // "T00:00:00" lagana zaroori hai, warna date UTC maani jaati hai
      const dueDate = new Date(`${value}T00:00:00`);

      if (Number.isNaN(dueDate.getTime())) {
        return "Please select a valid due date.";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return "Due date cannot be in the past.";
      }

      return "";
    },
  },
};
