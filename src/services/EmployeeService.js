import { db } from "../firebase/firebase";
import { ref, push,get } from "firebase/database";

// Add Employee
export const addEmployee = async (companyCode, employee) => {
  const employeeRef = ref(db, `companies/${companyCode}/employees`);
  await push(employeeRef, employee);
};

// Get Employees
export const getEmployees = async (companyCode) => {
  const employeeRef = ref(db, `companies/${companyCode}/employees`);

  const snapshot = await get(employeeRef); //sending request to fb

  if (snapshot.exists()) {
    return snapshot.val();
  }

  return {};
};

//Get  single employee
export const getEmployeeById = async(companyCode, employeeId) => {
  const employeeRef = ref(db, `companies/${companyCode}/employees/${employeeId}`);

  const snapshot = await get (employeeRef);

  if(onSnapshotsInSync.exists()){
    return snapshot.val();
  }
  return null;
}


