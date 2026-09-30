import {
    ref,
    push,
    set,
    update,
    remove,
    onValue,
} from "firebase/database";
import { db } from "../firebase/firebase";
import {
    getDepartmentsApi,
    addDepartmentApi,
    addDesignationApi,
    editDepartmentApi,
    editDesignationApi,
    deleteDepartmentApi,
    deleteDesignationApi,
} from "./api/departmentApi"; 


//Department functions
const getDepartmentPath = (companyCode) =>
    `companies/${companyCode}/departments`;

// export const addDepartment = async (
//     companyCode,
//     name
// ) => {
//     const departmentRef = push(
//         ref(db, getDepartmentPath(companyCode))
//     );

//     await set(departmentRef, {
//         name,
//         createdAt: Date.now(),
//         designations: {},
//     });
// };

export const addDepartment = async (companyCode, name) => {
  let result;
  try {
    result = await addDepartmentApi(companyCode, name);
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to add department.");
  }
  return result.data; // { departmentId }
};



// export const updateDepartment = async (
//     companyCode,
//     departmentId,
//     name
// ) => {
//     await update(
//         ref(
//             db,
//             `${getDepartmentPath(
//                 companyCode
//             )}/${departmentId}`
//         ),
//         { name }
//     );
// };
export const updateDepartment = async (companyCode, departmentId, name) => {
  let result;
  try {
    result = await editDepartmentApi(companyCode, departmentId, name);
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to update department.");
  }
  return result.data; // { departmentId, name }
};




//Delete department API call
// export const deleteDepartment = async (
//     companyCode,
//     departmentId
// ) => {
//     await remove(
//         ref(
//             db,
//             `${getDepartmentPath(
//                 companyCode
//             )}/${departmentId}`
//         )
//     );
// };
export const deleteDepartment = async (companyCode, departmentId) => {
  let result;
  try {
    result = await deleteDepartmentApi(companyCode, departmentId);
  }catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to delete department.");
  }
    return result.data; // { departmentId}
};





//Desgination functions
// export const addDesignation = async (
//     companyCode,
//     departmentId,
//     designationName
// ) => {
//     const designationRef = push(
//         ref(
//             db,
//             `${getDepartmentPath(
//                 companyCode
//             )}/${departmentId}/designations`
//         )
//     );

//     await set(designationRef, {
//         name: designationName,
//     });
// };



export const addDesignation = async (companyCode,departmentId, designationName) => {
  let result;
  try {
    result = await addDesignationApi(companyCode, departmentId, designationName);
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to add designation.");
  }
  return result.data; // { designationId }
};



// export const updateDesignation = async (
//     companyCode,
//     departmentId,
//     designationId,
//     designationName
// ) => {
//     await update(
//         ref(
//             db,
//             `${getDepartmentPath(
//                 companyCode
//             )}/${departmentId}/designations/${designationId}`
//         ),
//         {
//             name: designationName,
//         }
//     );
// };

export const updateDesignation = async (companyCode, departmentId, designationId, designationName) => {
  let result;
  try {
    result = await editDesignationApi(companyCode, departmentId, designationId, designationName);
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to update designation.");
  }
  return result.data; // { designationId, name }
};


// export const deleteDesignation = async (
//     companyCode,
//     departmentId,
//     designationId
// ) => {
//     await remove(
//         ref(
//             db,
//             `${getDepartmentPath(
//                 companyCode
//             )}/${departmentId}/designations/${designationId}`
//         )
//     );
// };

export const deleteDesignation = async (companyCode, departmentId, designationId) => {
  let result;
  try {
    result = await deleteDesignationApi(companyCode, departmentId, designationId);
  }catch (error) {
    throw new Error("Unable to connect to the server. Please try again.", { cause: error });
  }
  if (!result?.success) {
    throw new Error(result?.message || "Failed to delete designation.");
  }
    return result.data; // { designationId}
};



//fetching in realtime
// Isko seedha component se nahi bulana hai: store/departmentsSlice ek hi
// listener rakhta hai aur saare screens usi ko share karte hain.
// onValue ka apna unsubscribe lautate hain — off(ref) us ref ke saare
// listeners hata deta, sirf is wale ko nahi.
export const subscribeDepartments = (
    companyCode,
    callback,
    onError
) =>
    onValue(
        ref(db, getDepartmentPath(companyCode)),
        (snapshot) => {
            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );
        },
        (error) => onError?.(error)
    );


//getDepartments API call
export const getDepartments = async (companyCode) => {
  let result;

  try {
    result = await getDepartmentsApi(companyCode);
  } catch (error) {
    console.error("Get departments API error:", error);
    throw new Error("Unable to connect to the server. Please try again.", {
      cause: error,
    });
  }

  if (!result?.success) {
    throw new Error(result?.message || "Failed to load departments.");
  }
  return result.data || {};
};

/*
|--------------------------------------------------------------------------
| Department Manager
|--------------------------------------------------------------------------
| Who runs a department, stored on the department itself:
|
|   companies/{code}/departments/{departmentId}/manager
|     { employeeId, name, assignedAt }
|
| It is kept here rather than as a list of departments on the employee for
| two reasons. "A department has one manager" is a fact about the department,
| and holding it here is what makes that structurally true instead of a rule
| some screen has to remember to enforce. And a manager running several
| departments simply appears on several nodes, so the one-to-many side needs
| no second record that could drift out of step with this one.
|
| The name is stored beside the id purely so a card can be drawn without
| loading the whole employee directory first. The id is what every check
| reads; the name is refreshed on each assignment and is never compared.
|--------------------------------------------------------------------------
*/

const managerPath = (companyCode, departmentId) =>
    `${getDepartmentPath(companyCode)}/${departmentId}/manager`;

export const setDepartmentManager = async (
    companyCode,
    departmentId,
    manager
) => {

    const employeeId = String(manager?.employeeId ?? "")
        .trim()
        .toUpperCase();

    if (!employeeId) {
        return {
            success: false,
            message: "Select a manager to assign.",
        };
    }

    try {

        await set(
            ref(db, managerPath(companyCode, departmentId)),
            {
                employeeId,
                name: manager?.name || "",
                assignedAt: Date.now(),
            }
        );

        return { success: true };

    } catch (error) {

        console.error("Set Department Manager Error:", error);

        return {
            success: false,
            message: "Failed to assign the manager. Please try again.",
        };

    }

};

export const clearDepartmentManager = async (
    companyCode,
    departmentId
) => {

    try {

        await remove(
            ref(db, managerPath(companyCode, departmentId))
        );

        return { success: true };

    } catch (error) {

        console.error("Clear Department Manager Error:", error);

        return {
            success: false,
            message: "Failed to remove the manager. Please try again.",
        };

    }

};

/*
| Every department an employee was managing, released in one write.
|
| Called when somebody stops being a manager - their role is changed, or their
| account is closed. Without it the department node keeps pointing at them and
| the scope resolves to a set of departments run by an employee who is no
| longer a manager, which reads on screen as a department nobody runs but
| behaves as one they still do.
|
| A multi-path update rather than a delete per department, so a manager of six
| departments is released atomically and cannot be left owning half of them.
*/

export const releaseManagerFromDepartments = async (
    companyCode,
    employeeId
) => {

    const id = String(employeeId ?? "").trim().toUpperCase();

    if (!companyCode || !id) {
        return { success: true, released: 0 };
    }

    try {

        const departments = await getDepartments(companyCode);

        const updates = Object.entries(departments || {})
            .filter(
                ([, department]) =>
                    String(department?.manager?.employeeId ?? "")
                        .trim()
                        .toUpperCase() === id
            )
            .reduce((paths, [departmentId]) => {

                paths[`${departmentId}/manager`] = null;

                return paths;

            }, {});

        const released = Object.keys(updates).length;

        if (released === 0) {
            return { success: true, released: 0 };
        }

        await update(
            ref(db, getDepartmentPath(companyCode)),
            updates
        );

        return { success: true, released };

    } catch (error) {

        console.error("Release Manager Error:", error);

        return {
            success: false,
            message: "Failed to release the manager's departments.",
        };

    }

};