import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import DepartmentList from "../components/departments/DepartmentList";
import DepartmentModal from "../components/departments/DepartmentModal";
import DesignationModal from "../components/departments/DesignationModal";
import { validateField } from "../utils/validation/validateField";
import {searchDepartments,} from "../utils/search/searchDepartments";
import { useOutletContext } from "react-router-dom";

import {
    addDepartment,
    updateDepartment,
    addDesignation,
    updateDesignation,
    subscribeDepartments,
} from "../services/departmentService";

function Departments() {

    const companyCode = localStorage.getItem("companyCode");

    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState({});
    const [departmentModal, setDepartmentModal] = useState(false);
    const [designationModal, setDesignationModal] = useState(false);
    const [departmentName, setDepartmentName] = useState("");
    const [designationName, setDesignationName] = useState("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [editingDepartmentId, setEditingDepartmentId] = useState(null);
    const [editingDesignationId, setEditingDesignationId] = useState(null);
    const [expandedDepartment, setExpandedDepartment] = useState(null);
    const [departmentError, setDepartmentError] = useState("");
    const [designationError, setDesignationError] = useState("");
    const {search,setSearch,setSearchPlaceholder} = useOutletContext();

    useEffect(() => {
        const unsubscribe = subscribeDepartments(
            companyCode,
            (data) => {
                setDepartments(data);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, [companyCode]);

    //adding and editing deparment
    const handleDepartmentSave = async () => {
        const error = validateField("departmentName",departmentName);

        if (error) {
            setDepartmentError(error);
            return;
        }

        const exists = Object.values(
            departments || {}
        ).some((department) =>
            department.name.trim().toLowerCase() ===
            departmentName.trim().toLowerCase()
        );

        if (exists && !editingDepartmentId ) {
            setDepartmentError("Department already exists.");
            return;
        }
        try {
            if (editingDepartmentId) {

                await updateDepartment(
                    companyCode,
                    editingDepartmentId,
                    departmentName
                );
                toast.success("Department updated successfully.");
            } else {
                await addDepartment(
                    companyCode,
                    departmentName
                );
                toast.success("Department added successfully.");
            }

            setDepartmentError("");
            setDepartmentModal(false);
            setDepartmentName("");
            setEditingDepartmentId(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to save department.");
        }
    };

    const handleDesignationSave = async () => {

        const error = validateField("designationName",designationName);
        if (error) {
            setDesignationError(error);
            return;
        }
        const currentDepartment =departments[selectedDepartmentId];
        const exists = Object.values(
            currentDepartment
                ?.designations || {}
        ).some(
            (designation) =>
                designation.name.trim().toLowerCase() ===
                designationName.trim().toLowerCase()
        );

        if (exists && !editingDesignationId) {
            setDesignationError("Designation already exists.");
            return;
        }

        try {
            if (editingDesignationId) {
                await updateDesignation(
                    companyCode,
                    selectedDepartmentId,
                    editingDesignationId,
                    designationName
                );
                toast.success("Designation updated successfully.");

            } else {

                await addDesignation(
                    companyCode,
                    selectedDepartmentId,
                    designationName
                );
                toast.success("Designation added successfully.");
            }
            setDesignationError("");
            setDesignationModal(false);
            setDesignationName("");
            setEditingDesignationId(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to save designation.");
        }
    };

    const toggleDepartment = (departmentId) => {
        setExpandedDepartment((prev) =>
            prev === departmentId
                ? null
                : departmentId
        );
    };

    //filtering data
    const filteredDepartments = searchDepartments(
        departments,
        search
    );

    useEffect(() => {
        return () => {
            setSearch("");
        };
    }, []);
    useEffect(() => {
        setSearchPlaceholder("Search department or designation...");
        return () => {
            setSearchPlaceholder("Search...");
        };

    }, []);

    return (
        <div className="p-2">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

                <div>

                    <h1 className="text-3xl font-bold text-slate-900">
                        Departments
                    </h1>

                    <p className="text-slate-500 mt-1">
                        Manage departments and designations.
                    </p>

                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingDepartmentId(null);
                            setDepartmentName("");
                            setDepartmentModal(true);
                        }}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                    >
                        Add Department
                    </button>

                </div>

            </div>

            <DepartmentList
                loading={loading}
                departments={departments}
                companyCode={companyCode}
                expandedDepartment={expandedDepartment}
                toggleDepartment={toggleDepartment}
                filteredDepartments={filteredDepartments}
                onEditDepartment={(
                    departmentId,
                    departmentName
                ) => {

                    setEditingDepartmentId(departmentId);
                    setDepartmentName(departmentName);
                    setDepartmentModal(true);
                }}
                onAddDesignation={(
                    departmentId
                ) => {

                    setSelectedDepartmentId(departmentId);
                    setDesignationName("");
                    setEditingDesignationId(null);
                    setDesignationModal(true);
                }}
                onEditDesignation={(
                    departmentId,
                    designationId,
                    designationName
                ) => {

                    setSelectedDepartmentId(departmentId);
                    setEditingDesignationId(designationId);
                    setDesignationName(designationName);
                    setDesignationModal(true);
                }}
            />

            <DepartmentModal
                open={departmentModal}
                title={editingDepartmentId ? "Edit Department" : "Add Department"}
                value={departmentName}
                setValue={setDepartmentName}
                error={departmentError}
                onSave={handleDepartmentSave}
                onClose={() => {
                    setDepartmentModal(false);
                    setDepartmentError("");
                }}
            />

            <DesignationModal
                open={designationModal}
                title={editingDesignationId ? "Edit Designation" : "Add Designation"}
                value={designationName}
                setValue={setDesignationName}
                error={designationError}
                onSave={handleDesignationSave}
                onClose={() =>{
                    setDesignationModal(false);
                    setDesignationError("");
                }}
            />

        </div>
    );
}

export default Departments;