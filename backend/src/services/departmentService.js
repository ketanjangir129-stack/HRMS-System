const db = require("../config/firebase");

const getDepartments = async (companyCode) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/departments`)
    .once("value");
  return snapshot.val() || {};
};

// Add a new department to the specified company
const addDepartment = async (companyCode, name) => {
  const deparmentsRef = db.ref(`companies/${companyCode}/departments`);

  const snapshot = await deparmentsRef.once("value");
  const existing = snapshot.val() || {};
  const normalizedName = name.trim().toLowerCase();

  const isDuplicate = Object.values(existing).some(
    (department) =>
      String(department?.name ?? "").trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    const error = new Error("Department already exists.");
    error.code = "DEPARTMENT_EXISTS";
    throw error;
  }

  const departmentRef = deparmentsRef.push();

  await departmentRef.set({
    name,
    createdAt: Date.now(),
    designations:{},
  });

  return {
    departmentId: departmentRef.key,
    name,
  };
}


//Add a new designation to the specified department of a company
const addDesignation = async (companyCode, departmentId, name) => {
  const designationsRef = db.ref(
    `companies/${companyCode}/departments/${departmentId}/designations`
  );

  // Check whether department exists
  const departmentSnapshot = await db
    .ref(`companies/${companyCode}/departments/${departmentId}`)
    .once("value");

  if (!departmentSnapshot.exists()) {
    const error = new Error("Department not found.");
    error.code = "DEPARTMENT_NOT_FOUND";
    throw error;
  }

  // Get existing designations
  const snapshot = await designationsRef.once("value");
  const existing = snapshot.val() || {};

  const normalizedName = name.trim().toLowerCase();

  // Check duplicate designation inside this department
  const isDuplicate = Object.values(existing).some(
    (designation) =>
      String(designation?.name ?? "").trim().toLowerCase() ===
      normalizedName
  );

  if (isDuplicate) {
    const error = new Error("Designation already exists.");
    error.code = "DESIGNATION_EXISTS";
    throw error;
  }

  // Create new designation
  const designationRef = designationsRef.push();

  await designationRef.set({
    name: name.trim(),
  });

  return {
    designationId: designationRef.key,
    name: name.trim(),
  };
};


// Edit (rename) an existing department of the specified company
const editDepartment = async (companyCode, departmentId, name) => {
  const departmentsRef = db.ref(`companies/${companyCode}/departments`);
  const departmentRef = departmentsRef.child(departmentId);

  // Check whether department exists
  const departmentSnapshot = await departmentRef.once("value");

  if (!departmentSnapshot.exists()) {
    const error = new Error("Department not found.");
    error.code = "DEPARTMENT_NOT_FOUND";
    throw error;
  }

  // Check duplicate name among the other departments
  const snapshot = await departmentsRef.once("value");
  const existing = snapshot.val() || {};
  const normalizedName = name.trim().toLowerCase();

  const isDuplicate = Object.entries(existing).some(
    ([id, department]) =>
      id !== departmentId &&
      String(department?.name ?? "").trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    const error = new Error("Department already exists.");
    error.code = "DEPARTMENT_EXISTS";
    throw error;
  }

  // update() only touches these fields; createdAt, designations and manager stay
  await departmentRef.update({
    name: name.trim(),
    updatedAt: Date.now(),
  });

  return {
    departmentId,
    name: name.trim(),
  };
};


const editDesignation = async (companyCode, departmentId, designationId, name) => {
  const designationsRef = db.ref(
    `companies/${companyCode}/departments/${departmentId}/designations`
  );
  const designationRef = designationsRef.child(designationId);

  // Check whether designation exists
  const designationSnapshot = await designationRef.once("value");

  if (!designationSnapshot.exists()) {
    const error = new Error("Designation not found.");
    error.code = "DESIGNATION_NOT_FOUND";
    throw error;
  }

  // Check duplicate name among the other designations
  const snapshot = await designationsRef.once("value");
  const existing = snapshot.val() || {};
  const normalizedName = name.trim().toLowerCase();

  const isDuplicate = Object.entries(existing).some(
    ([id, designation]) =>
      id !== designationId &&
      String(designation?.name ?? "").trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    const error = new Error("Designation already exists.");
    error.code = "DESIGNATION_EXISTS";
    throw error;
  }

  // Update the designation
  await designationRef.update({
    name: name.trim(),
    updatedAt: Date.now(),
  });

  return {
    designationId,
    name: name.trim(),
  };
};

// Delete a department from the specified company



module.exports = {
  getDepartments,
  addDepartment,
  addDesignation,
  editDepartment,
  editDesignation,
};