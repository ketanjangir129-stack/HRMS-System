import {db} from "../firebase/firebase";
import {
    ref, set, get, update, remove
} from "firebase/database";
import {getEmployees} from "./EmployeeService"
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