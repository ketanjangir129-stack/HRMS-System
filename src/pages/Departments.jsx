import { useEffect, useState } from "react";
import DepartmentModal from "../components/departments/DepartmentModal";
import DesignationModal from "../components/departments/DesignationModal";

import {
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    subscribeDepartments,
} from "../services/departmentService";

function Departments() {

    const companyCode = localStorage.getItem("companyCode");
    const [departments, setDepartments] = useState({});
    const [departmentModal, setDepartmentModal] = useState(false);
    const [designationModal, setDesignationModal] = useState(false);
    const [departmentName, setDepartmentName] = useState("");
    const [designationName, setDesignationName] = useState("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [editingDepartmentId, setEditingDepartmentId] = useState(null);
    const [editingDesignationId, setEditingDesignationId] = useState(null);


    useEffect(() => {
        const unsubscribe =
            subscribeDepartments(
                companyCode,
                (data) => {
                    setDepartments(data);
                }
            );
        return unsubscribe;
    }, [companyCode]);

    const handleDepartmentSave = async () => {
        if (!departmentName.trim()) return;

        if (editingDepartmentId) {
            await updateDepartment(
                companyCode,
                editingDepartmentId,
                departmentName
            );
        } else {
            await addDepartment(
                companyCode,
                departmentName
            );
        }
        setDepartmentModal(false);
        setDepartmentName("");
        setEditingDepartmentId(null);
    };

    const handleDesignationSave = async () => {
        if (!designationName.trim()) return;

        if (editingDesignationId) {
            await updateDesignation(
                companyCode,
                selectedDepartmentId,
                editingDesignationId,
                designationName
            );
        } else {
            await addDesignation(
                companyCode,
                selectedDepartmentId,
                designationName
            );
        }
        setDesignationModal(false);
        setDesignationName("");
        setEditingDesignationId(null);

    };

    return (
        <div className="p-2">

            <div className="flex items-center justify-between mb-8">

                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Departments
                    </h1>

                    <p className="text-slate-500 mt-1">
                        Manage departments and designations.
                    </p>
                </div>

                <button
                    onClick={() => {
                        setEditingDepartmentId(null);
                        setDepartmentName("");
                        setDepartmentModal(true);
                    }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl"
                >
                    Add Department
                </button>

            </div>

            <div className="grid gap-5">

                {Object.entries(departments).map(
                    ([departmentId, department]) => (
                        <div
                            key={departmentId}
                            className="bg-white border border-slate-200 rounded-2xl p-5"
                        >

                            <div className="flex justify-between items-start">

                                <div>

                                    <h2 className="text-xl font-semibold">
                                        {department.name}
                                    </h2>

                                    <p className="text-sm text-slate-500 mt-1">
                                        {
                                            Object.keys(
                                                department.designations || {}
                                            ).length
                                        }{" "}
                                        Designations
                                    </p>

                                </div>

                                <div className="flex gap-2">

                                    <button
                                        onClick={() => {
                                            setEditingDepartmentId(
                                                departmentId
                                            );

                                            setDepartmentName(
                                                department.name
                                            );

                                            setDepartmentModal(true);
                                        }}
                                        className="px-3 py-2 border rounded-lg"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={async () => {
                                            const confirmDelete =
                                                window.confirm(
                                                    "Delete department?"
                                                );

                                            if (!confirmDelete)
                                                return;

                                            await deleteDepartment(
                                                companyCode,
                                                departmentId
                                            );

                                            loadDepartments();
                                        }}
                                        className="px-3 py-2 border rounded-lg text-red-600"
                                    >
                                        Delete
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSelectedDepartmentId(
                                                departmentId
                                            );

                                            setDesignationName("");

                                            setEditingDesignationId(
                                                null
                                            );

                                            setDesignationModal(
                                                true
                                            );
                                        }}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                                    >
                                        Add Designation
                                    </button>

                                </div>

                            </div>

                            <div className="mt-5 space-y-3">

                                {Object.entries(
                                    department.designations || {}
                                ).map(
                                    ([
                                        designationId,
                                        designation,
                                    ]) => (
                                        <div
                                            key={designationId}
                                            className="flex items-center justify-between border rounded-xl px-4 py-3"
                                        >

                                            <span>
                                                {
                                                    designation.name
                                                }
                                            </span>

                                            <div className="flex gap-2">

                                                <button
                                                    onClick={() => {
                                                        setSelectedDepartmentId(
                                                            departmentId
                                                        );

                                                        setEditingDesignationId(
                                                            designationId
                                                        );

                                                        setDesignationName(
                                                            designation.name
                                                        );

                                                        setDesignationModal(
                                                            true
                                                        );
                                                    }}
                                                    className="px-3 py-1 border rounded-lg"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        const confirmDelete =
                                                            window.confirm(
                                                                "Delete designation?"
                                                            );

                                                        if (
                                                            !confirmDelete
                                                        )
                                                            return;

                                                        await deleteDesignation(
                                                            companyCode,
                                                            departmentId,
                                                            designationId
                                                        );

                                                        loadDepartments();
                                                    }}
                                                    className="px-3 py-1 border rounded-lg text-red-600"
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>

                        </div>
                    )
                )}

            </div>

            <DepartmentModal
                open={departmentModal}
                title={
                    editingDepartmentId
                        ? "Edit Department"
                        : "Add Department"
                }
                value={departmentName}
                setValue={setDepartmentName}
                onSave={handleDepartmentSave}
                onClose={() =>
                    setDepartmentModal(false)
                }
            />

            <DesignationModal
                open={designationModal}
                title={
                    editingDesignationId
                        ? "Edit Designation"
                        : "Add Designation"
                }
                value={designationName}
                setValue={setDesignationName}
                onSave={handleDesignationSave}
                onClose={() =>
                    setDesignationModal(false)
                }
            />

        </div>
    );
}

export default Departments;
