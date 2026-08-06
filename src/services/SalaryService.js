import {db} from "../firebase/firebase";
import {
    ref, set, get, update, remove
} from "firebase/database";
import {getEmployees} from "./EmployeeService"
import { compile } from "tailwindcss";
import { add } from "firebase/firestore/pipelines";
export const addSalary = async (
    companyCode, 
    salary
) =>{
    await set(
        ref(
            db,`companies/${companyCode}/salaries/${salary.employeeId}`
        ),
        {
            ...salary,
            createdAt: Date.now(),
            updatedAt : Date.now(),
        }
    );;
}


export const getSalary = async (
    companyCode , 
    employeeId
)=>{
    const snapshot = await get(
        ref(
            db,`companies/${companyCode}/salaries/${employeeId}`
        )
    );
    if(!snapshot.exists()){
        return null;
    }
    return snapshot.val();
};

export const getAllSalary = async (
    companyCode 
)=>{
    const snapshot = await get(
        ref(
            db,`companies/${companyCode}/salaries`
        )
    );
    if(!snapshot.exists()){
        return [];
    }
    const data = snapshot.val();

    return  Object.keys(data).map((id)=>({
        employeeId: id, 
        ...data[id],
    }))
};


export const updateSalary = async (
    companyCode ,
    employeeId,
    salary
)=>{
    await update(
        ref(db,`companies/${companyCode}/salaries/${employeeId}`),
    {
        ...salary,
        updatedAt: Date.now(),
    }
     )
}

export const deleteSalary = async (
    companyCode,
    employeeId
)=>{
    await remove (ref(
        db,`companies/${companyCode}/salaries/${employeeId}`
    )
);
};


export const checkSalaryExists = async (
    companyCode,
    employeeId
) => {

    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}/salaries/${employeeId}`
        )
    );

    return snapshot.exists();

};

export const createSalary = async (
    companyCode,
    salary
) => {

    const exists = await checkSalaryExists(
        companyCode,
        salary.employeeId
    );

    if (exists) {

        return {

            success: false,

            message: "Salary already assigned."

        };

    }

    await addSalary(
        companyCode,
        salary
    );

    return {

        success: true,

        message: "Salary assigned successfully."

    };

};

export const getEmployeeWithSalaryStatus = async (
    companyCode
) =>{
    // get all employees
    const employees =  await getEmployees(companyCode);
    // get all assigned salaries 
    const salaries = await getAllSalary(companyCode)

    // create a lookup for the salary record 

    const salaryMap = {};
    salaries.forEach((salary)=>{
        salaryMap[salary.employeeId] = true;
    });
    // merge employee and salary data 
    return Object.keys(employees).map((employeeId)=>{
        const employee = employees[employeeId];
        return {
            employeeId, 
            name : employee.personalInfo?.name,
            department : employee.employmentInfo?.department,
            designation : employee.employmentInfo?.designation,
            salaryAssigned :salaryMap[employeeId] || false,
        }
    })
}
export const addSalaryHistory = async (
    companyCode, 
    employeeId,
    salary,
    updatedBy
)=>{
    const historyId = Date.now();
    await set(
       ref( db,
        `companies/${companyCode}/salaryHistory/${employeeId}/${historyId}`
    ),
    {
        ...salary,
        updatedBy,
        updatedAt: historyId,
    }
);
};


export const editSalary = async (
    companyCode,
    employeeId,
    newSalary,
    updatedBy
)=>{
    const currentSalary = await getSalary(
        companyCode,
        employeeId
    );
    if(!currentSalary){
        return {
            success: false,
            message : "Salary not found.",
        }
    }
    await addSalaryHistory(
        companyCode,
        employeeId,
        currentSalary,
        updatedBy
    );
    await updateSalary(
        companyCode,
        employeeId,
        newSalary
    );
    return{
        success : true,
        message : "Salary updated successfully."
    }
}
// a history record holds the salary before the change, so the structure a
// revision produced is the next newer record - or the live salary for the latest one
export const getSalaryRevisions = async (
    companyCode
) => {

    const [snapshot, salaries, employees] = await Promise.all([
        get(
            ref(
                db,
                `companies/${companyCode}/salaryHistory`
            )
        ),
        getAllSalary(companyCode),
        getEmployees(companyCode),
    ]);

    if (!snapshot.exists()) {

        return [];

    }

    const historyByEmployee = snapshot.val();

    const currentSalaries = {};

    salaries.forEach((salary) => {
        currentSalaries[salary.employeeId] = salary;
    });

    const revisions = [];

    Object.keys(historyByEmployee).forEach((employeeId) => {

        const records = Object.keys(
            historyByEmployee[employeeId]
        )
            .map((id) => ({
                id,
                ...historyByEmployee[employeeId][id],
            }))
            .sort(
                (a, b) =>
                    b.updatedAt - a.updatedAt
            );

        const employee = employees?.[employeeId];

        records.forEach((record, index) => {

            const current =
                index === 0
                    ? currentSalaries[employeeId]
                    : records[index - 1];

            revisions.push({

                id: `${employeeId}-${record.id}`,

                employeeId,

                employeeName:
                    employee?.personalInfo?.name || employeeId,

                department:
                    employee?.employmentInfo?.department || "—",

                designation:
                    employee?.employmentInfo?.designation || "—",

                revisionNumber: records.length - index,

                updatedAt: record.updatedAt,

                updatedBy: record.updatedBy,

                previous: record,

                current: current || null,

            });

        });

    });

    return revisions.sort(
        (a, b) =>
            b.updatedAt - a.updatedAt
    );

};
export const getSalaryHistory = async (
    companyCode,
    employeeId
) => {

    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}/salaryHistory/${employeeId}`
        )
    );

    if (!snapshot.exists()) {

        return [];

    }

    const data = snapshot.val();

    return Object.keys(data)
        .map((id) => ({

            id,

            ...data[id],

        }))
        .sort(
            (a, b) =>
                b.updatedAt - a.updatedAt
        );

};