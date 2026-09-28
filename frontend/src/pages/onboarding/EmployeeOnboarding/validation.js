const isEmpty = (v) => !v || String(v).trim() === "";

const patterns = {
  mobile: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  aadhaar: /^\d{12}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
};

// Step 2: Personal Information
const validatePersonal = (data) => {
  const errors = {};

  if (isEmpty(data.fatherName)) errors.fatherName = "Father name is required";
  if (isEmpty(data.motherName)) errors.motherName = "Mother name is required";
  if (isEmpty(data.dob)) errors.dob = "Date of birth is required";
  if (isEmpty(data.gender)) errors.gender = "Gender is required";
  if (isEmpty(data.maritalStatus))
    errors.maritalStatus = "Marital status is required";

  if (isEmpty(data.personalMobile)) {
    errors.personalMobile = "Personal mobile number is required";
  } else if (!patterns.mobile.test(data.personalMobile)) {
    errors.personalMobile = "Enter a valid 10-digit mobile number";
  }

  if (
    !isEmpty(data.alternateMobile) &&
    !patterns.mobile.test(data.alternateMobile)
  ) {
    errors.alternateMobile = "Enter a valid 10-digit mobile number";
  }

  if (isEmpty(data.address)) errors.address = "Address is required";
  if (isEmpty(data.city)) errors.city = "City is required";
  if (isEmpty(data.state)) errors.state = "State is required";

  if (isEmpty(data.pincode)) {
    errors.pincode = "Pincode is required";
  } else if (!patterns.pincode.test(data.pincode)) {
    errors.pincode = "Enter a valid 6-digit pincode";
  }

  return errors;
};

// Step 3: Bank Details
const validateBank = (data) => {
  const errors = {};

  if (isEmpty(data.accountHolderName))
    errors.accountHolderName = "Account holder name is required";
  if (isEmpty(data.bankName)) errors.bankName = "Bank name is required";

  if (isEmpty(data.accountNumber)) {
    errors.accountNumber = "Account number is required";
  } else if (!/^\d{6,18}$/.test(data.accountNumber)) {
    errors.accountNumber = "Enter a valid account number";
  }

  if (isEmpty(data.confirmAccountNumber)) {
    errors.confirmAccountNumber = "Please confirm the account number";
  } else if (data.accountNumber !== data.confirmAccountNumber) {
    errors.confirmAccountNumber = "Account numbers do not match";
  }

  if (isEmpty(data.ifscCode)) {
    errors.ifscCode = "IFSC code is required";
  } else if (!patterns.ifsc.test(data.ifscCode.toUpperCase())) {
    errors.ifscCode = "Enter a valid IFSC code";
  }

  if (isEmpty(data.branchName)) errors.branchName = "Branch name is required";

  return errors;
};

// Step 4: KYC / Documents
const validateKyc = (data) => {
  const errors = {};

  if (isEmpty(data.aadhaarNumber)) {
    errors.aadhaarNumber = "Aadhaar number is required";
  } else if (!patterns.aadhaar.test(data.aadhaarNumber)) {
    errors.aadhaarNumber = "Enter a valid 12-digit Aadhaar number";
  }

  if (isEmpty(data.panNumber)) {
    errors.panNumber = "PAN number is required";
  } else if (!patterns.pan.test(data.panNumber.toUpperCase())) {
    errors.panNumber = "Enter a valid PAN number";
  }

  return errors;
};

// Returns a map of { field: message }. Empty object means the step is valid.
export const validateStep = (step, data) => {
  switch (step) {
    case 2:
      return validatePersonal(data);
    case 3:
      return validateBank(data);
    case 4:
      return validateKyc(data);
    default:
      return {};
  }
};
