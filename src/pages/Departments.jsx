import { useEffect, useState } from "react";
import DepartmentList from "../components/departments/DepartmentList";
import DepartmentModal from "../components/departments/DepartmentModal";
import DesignationModal from "../components/departments/DesignationModal";

import {
    addDepartment,
    updateDepartment,
    addDesignation,
    updateDesignation,
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
                setDepartments
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
                        setDepartmentName("");
                        setEditingDepartmentId(null);
                        setDepartmentModal(true);
                    }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700"
                >
                    Add Department
                </button>

            </div>

            <DepartmentList
                departments={departments}
                companyCode={companyCode}
                onEditDepartment={(
                    departmentId,
                    departmentName
                ) => {

                    setEditingDepartmentId(
                        departmentId
                    );

                    setDepartmentName(
                        departmentName
                    );

                    setDepartmentModal(true);
                }}
                onAddDesignation={(
                    departmentId
                ) => {

                    setSelectedDepartmentId(
                        departmentId
                    );

                    setDesignationName("");

                    setEditingDesignationId(
                        null
                    );

                    setDesignationModal(true);
                }}
                onEditDesignation={(
                    departmentId,
                    designationId,
                    designationName
                ) => {

                    setSelectedDepartmentId(
                        departmentId
                    );

                    setEditingDesignationId(
                        designationId
                    );

                    setDesignationName(
                        designationName
                    );

                    setDesignationModal(true);
                }}
            />

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