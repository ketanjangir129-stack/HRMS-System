import {
    ref,
    push,
    set,
    update,
    remove,
    onValue,
    off,
} from "firebase/database";
import { db } from "../firebase/firebase";


//Department functions
const getDepartmentPath = (companyCode) =>
    `companies/${companyCode}/departments`;

export const addDepartment = async (
    companyCode,
    name
) => {
    const departmentRef = push(
        ref(db, getDepartmentPath(companyCode))
    );

    await set(departmentRef, {
        name,
        createdAt: Date.now(),
        designations: {},
    });
};

export const updateDepartment = async (
    companyCode,
    departmentId,
    name
) => {
    await update(
        ref(
            db,
            `${getDepartmentPath(
                companyCode
            )}/${departmentId}`
        ),
        { name }
    );
};

export const deleteDepartment = async (
    companyCode,
    departmentId
) => {
    await remove(
        ref(
            db,
            `${getDepartmentPath(
                companyCode
            )}/${departmentId}`
        )
    );
};

//Desgination functions
export const addDesignation = async (
    companyCode,
    departmentId,
    designationName
) => {
    const designationRef = push(
        ref(
            db,
            `${getDepartmentPath(
                companyCode
            )}/${departmentId}/designations`
        )
    );

    await set(designationRef, {
        name: designationName,
    });
};

export const updateDesignation = async (
    companyCode,
    departmentId,
    designationId,
    designationName
) => {
    await update(
        ref(
            db,
            `${getDepartmentPath(
                companyCode
            )}/${departmentId}/designations/${designationId}`
        ),
        {
            name: designationName,
        }
    );
};

export const deleteDesignation = async (
    companyCode,
    departmentId,
    designationId
) => {
    await remove(
        ref(
            db,
            `${getDepartmentPath(
                companyCode
            )}/${departmentId}/designations/${designationId}`
        )
    );
};

//fetching in realtime 
export const subscribeDepartments = (
    companyCode,
    callback
) => {

    const departmentsRef = ref(
        db,
        getDepartmentPath(companyCode)
    );

    onValue(
        departmentsRef,
        (snapshot) => {
            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );
        }
    );

    return () => off(departmentsRef);
};