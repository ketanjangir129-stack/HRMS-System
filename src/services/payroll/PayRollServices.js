import { db } from "../firebase/firebase"
import { ref, get, set, remove, update } from "firebase/database";
import { getEmployees } from "../EmployeeService";
export const checkPayrollExists = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}/payroll/${payrollMonth}/${employeeId}`
        )
    );
    return snapshot.exists();
};

export const getPayroll = async (
    companyCode,
    payrollMonth,
    employeeId
) => {
    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}/payroll/${payrollMonth}/${employeeId}`

        )
    );
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.val();
}

export const getEmployeeWithPayrollStatus = async (
    companyCode,
    payrollMonth
) => {
    const employees = await getEmployees(companyCode);
    const employeeList = Object.keys(employees).map(id => ({
        employeeId: id,
        ...employees[id]
    }));
    const result = await Promise.all(
        employeeList.map(async (employee) => {
            const payrollGenrated =
                await checkPayrollExists(
                    companyCode,
                    payrollMonth,
                    employee.employeeId
                );
            return {
                employeeId: employee.employeeId,
                name: employee.personalInfo?.name,
                department: employee.employmentInfo?.department,
                designation: employee.employmentInfo?.designation,
                payrollGenerated
            };
        })
    );
    return result;
}