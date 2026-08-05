import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import DepartmentList from "../components/departments/DepartmentList";
import DepartmentModal from "../components/departments/DepartmentModal";
import DesignationModal from "../components/departments/DesignationModal";
import { validateField } from "../utils/validation/validateField";
import {searchDepartments,} from "../utils/search/searchDepartments";
import { useOutletContext } from "react-router-dom";
import { FiLayers, FiPlus, FiGrid, FiBriefcase } from "react-icons/fi";

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

    const totalDepartments = Object.keys(departments || {}).length;

    const totalDesignations = Object.values(departments || {}).reduce(
        (total, department) =>
            total + Object.keys(department.designations || {}).length,
        0
    );

    const stats = [
        {
            title: "Total Departments",
            value: totalDepartments,
            icon: <FiGrid />,
        },
        {
            title: "Total Designations",
            value: totalDesignations,
            icon: <FiBriefcase />,
        },
    ];

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
        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            {/* Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-3 sm:gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
                        <FiLayers className="text-white text-xl" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Departments
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 sm:text-base">
                            Manage departments and designations
                        </p>
                    </div>

                </div>

                {/* Stats + Action */}
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">

                    <div className="flex flex-wrap items-center justify-end gap-2">

                        {stats.map((stat) => (

                            <div
                                key={stat.title}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 whitespace-nowrap"
                            >

                                <span className="text-sm text-slate-400">
                                    {stat.icon}
                                </span>

                                <span className="text-xs font-medium text-slate-500">
                                    {stat.title}
                                </span>

                                <span className="text-sm font-semibold text-slate-900">
                                    {stat.value}
                                </span>

                            </div>

                        ))}

                    </div>

                    <button
                        onClick={() => {
                            setEditingDepartmentId(null);
                            setDepartmentName("");
                            setDepartmentModal(true);
                        }}
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 cursor-pointer whitespace-nowrap"
                    >
                        <FiPlus
                            size={18}
                            className="transition-transform duration-200 group-hover:rotate-90"
                        />
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