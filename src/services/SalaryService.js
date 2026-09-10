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

/*
|--------------------------------------------------------------------------
| Bulk Import
|--------------------------------------------------------------------------
| Writes the rows an import has already checked.
|
| Nothing is validated here. By the time a row reaches this point it has been
| read, priced against the HR Policy and shown to somebody who pressed the
| button, so the only things that can still go wrong are the write itself and
| the structure having appeared since the file was checked.
|
| The rows are written one at a time rather than in a single multi-path
| update. An employee who already has a structure needs their current one
| copied into history before it is replaced, which is a read and two writes
| that cannot be folded into one call - and doing them in turn is what lets
| the screen count the rows off as they land.
|
| One row failing does not stop the rest. A run that gave up half way would
| leave somebody guessing which half, so every row is attempted and reported.
*/
export const importSalaries = async (
    companyCode,
    rows = [],
    {
        updateExisting = false,
        updatedBy = null,
        onProgress = null,
    } = {}
) => {

    const results = [];

    for (let position = 0; position < rows.length; position += 1) {

        const row = rows[position];

        const salary = {
            employeeId: row.employeeId,
            earnings: row.earnings,
            deductions: row.deductions,
            grossSalary: row.grossSalary,
            totalDeduction: row.totalDeduction,
            netSalary: row.netSalary,
            effectiveFrom: row.effectiveFrom,
            status: row.status,
        };

        try {

            /*
            | Asked again here rather than trusted from the preview: the file
            | may have been checked minutes ago, and somebody else assigning a
            | salary in between must not have it overwritten by an import that
            | still believes the employee has none.
            */
            const exists = await checkSalaryExists(
                companyCode,
                row.employeeId
            );

            if (exists && !updateExisting) {

                results.push({
                    ...row,
                    outcome: "skipped",
                    message: "Already has a salary structure.",
                });

            }

            else if (exists) {

                const result = await editSalary(
                    companyCode,
                    row.employeeId,
                    salary,
                    updatedBy
                );

                results.push({
                    ...row,
                    outcome: result.success ? "updated" : "failed",
                    message: result.message,
                });

            }

            else {

                await addSalary(companyCode, salary);

                results.push({
                    ...row,
                    outcome: "created",
                    message: "Salary assigned.",
                });

            }

        }
        catch (error) {

            console.error(error);

            results.push({
                ...row,
                outcome: "failed",
                message:
                    error?.message ||
                    "Could not save this salary.",
            });

        }

        onProgress?.(position + 1, rows.length);

    }

    return results;

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