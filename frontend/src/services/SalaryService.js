import {db} from "../firebase/firebase";
import {
    ref, set, get, update, remove
} from "firebase/database";
import {getEmployees} from "./EmployeeService"
import { createSalaryApi, getSalaryApi, getAllSalariesApi, updateSalaryApi, importSalariesApi, exportSalariesApi, getSalaryRevisionsApi, getSalaryRevisionByIdApi } from "./api/salaryApi";

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
    // Backend read (GET /api/salary/:employeeId). Company comes from the
    // auth token; companyCode is kept for call-site compatibility.
    // Returns null when no salary exists, matching the previous
    // Firebase behaviour that SalaryForm relies on.
    const result = await getSalaryApi(employeeId);

    if (result?.success) {
        return result.data;
    }

    if (result?.code === "SALARY_NOT_FOUND") {
        return null;
    }

    throw new Error(result?.message || "Failed to fetch salary.");
};

export const getAllSalary = async (
    companyCode 
)=>{
    // Backend read (GET /api/salary/list). Company comes from the auth
    // token; companyCode is kept for call-site compatibility.
    const result = await getAllSalariesApi();

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to fetch salaries.");
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
    // Use the backend API for creating salary — it validates, calculates
    // statutory deductions server-side, and enforces permissions.
    try {
        const result = await createSalaryApi({
            employeeId: salary.employeeId,
            earnings: salary.earnings,
            deductions: salary.deductions,
            effectiveFrom: salary.effectiveFrom,
            status: salary.status,
        });
        return result;
    } catch (error) {
        console.error("Salary creation failed:", error);
        return {
            success: false,
            message: error?.message || "Failed to assign salary.",
        };
    }
};

/*
|--------------------------------------------------------------------------
| Bulk Import
|--------------------------------------------------------------------------
| Sends the rows an import has already checked to the backend in one call
| (POST /api/salary/import). The backend revalidates every row, reprices
| statutory deductions from the stored policy and writes each structure,
| so the preview totals are never trusted — only earnings, manual
| deductions, effectiveFrom and status travel.
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

    // Company comes from the auth token; companyCode is kept for call-site
    // compatibility.
    onProgress?.(0, rows.length);

    // Only the inputs travel — the backend reprices and totals server-side.
    const payload = rows.map((row) => ({
        employeeId: row.employeeId,
        earnings: row.earnings,
        deductions: row.deductions,
        effectiveFrom: row.effectiveFrom,
        status: row.status,
    }));

    const response = await importSalariesApi(payload, {
        updateExisting,
        updatedBy,
    });

    if (!response?.success) {
        throw new Error(response?.message || "The import could not be completed.");
    }

    const outcomes = new Map(
        (response.data?.results || []).map((result) => [result.rowIndex, result])
    );

    const results = rows.map((row, position) => {
        const result = outcomes.get(position);

        return {
            ...row,
            outcome: result?.outcome || "failed",
            message: result?.message || "Could not save this salary.",
        };
    });

    onProgress?.(rows.length, rows.length);

    return results;

};

/*
| Export — same salary record shape as the list read, fetched through the
| backend so the call is permission-gated. The Excel file itself is still
| built by `exportSalariesToExcel`, untouched.
*/
export const exportSalaries = async (
    companyCode,
    employeeIds = []
) => {
    // Company comes from the auth token; companyCode is kept for call-site
    // compatibility.
    const result = await exportSalariesApi(employeeIds);

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to export salaries.");
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
    // Backend revision (PATCH /api/salary/:employeeId). Company comes from
    // the auth token; companyCode is kept for call-site compatibility.
    // The backend reprices statutory deductions, archives the previous
    // structure to history, and replaces the live one.
    try {
        const result = await updateSalaryApi(employeeId, {
            earnings: newSalary?.earnings,
            deductions: newSalary?.deductions,
            effectiveFrom: newSalary?.effectiveFrom,
            status: newSalary?.status,
            updatedBy: updatedBy || null,
        });

        if (result?.success) {
            return {
                success: true,
                message: result.message || "Salary updated successfully.",
                data: result.data,
            };
        }

        return {
            success: false,
            message: result?.message || "Failed to update salary.",
        };
    } catch (error) {
        console.error("Salary update failed:", error);
        return {
            success: false,
            message: error?.message || "Failed to update salary.",
        };
    }
}
// a history record holds the salary before the change, so the structure a
// revision produced is the next newer record - or the live salary for the latest one
export const getSalaryRevisions = async (
    companyCode
) => {
    // Backend read (GET /api/salary/revisions). Company comes from the auth
    // token; companyCode is kept for call-site compatibility. Same enriched
    // shape the screen already renders.
    const result = await getSalaryRevisionsApi();

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to fetch salary revisions.");
};

export const getSalaryRevisionById = async (
    companyCode,
    employeeId
) => {
    // Backend read (GET /api/salary/revisions/:employeeId). Same per-row
    // shape as getSalaryRevisions, filtered to one employee.
    const result = await getSalaryRevisionByIdApi(employeeId);

    if (result?.success) {
        return result.data ?? [];
    }

    throw new Error(result?.message || "Failed to fetch salary revisions.");
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