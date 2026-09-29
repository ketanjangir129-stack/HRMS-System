const db = require("../config/firebase");

const getDepartments = async (companyCode) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/departments`)
    .once("value");

  return snapshot.val() || {};
};

const addDepartment = async (companyCode, departmentData) => {
  const deparmentsRef = db.ref(`companies/${companyCode}/departments`);

  const departmentRef = deparmentsRef.push();

  await departmentRef.set({
    name,
    createdAt: new Date(),
    designation:{},
  });

  return {
    departmentId: departmentRef.key,
  };

}

module.exports = {
  getDepartments,
  addDepartment,
};