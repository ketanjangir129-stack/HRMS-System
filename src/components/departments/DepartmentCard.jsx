import { useState } from "react";
import DesignationItem from "./DesignationItem";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import {deleteDepartment,} from "../../services/departmentService";
import {FiChevronUp,FiChevronDown,FiEdit2,FiTrash2,FiPlus,FiBriefcase,} from "react-icons/fi";
import { toast } from "react-toastify";

function DepartmentCard({
    companyCode,
    departmentId,
    department,
    onEditDepartment,
    onAddDesignation,
    onEditDesignation,
    expandedDepartment,
    toggleDepartment
}) {

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDeleteDepartment = async () => {
        try {
            await deleteDepartment(
                companyCode,
                departmentId
            );
            toast.success("Department deleted successfully.");
            setConfirmDelete(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete department.");
        }
    };

    const designationCount = Object.keys(
        department.designations || {}
    ).length;

    const isExpanded = expandedDepartment === departmentId;

    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                <div className="flex items-start gap-3 sm:gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600">
                        {department.name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="min-w-0">

                        <button
                            onClick={() =>toggleDepartment(departmentId)}
                            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:text-blue-600 cursor-pointer sm:text-xl"
                        >
                            <span className="truncate">{department.name}</span>

                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 ${
                                    isExpanded ? "bg-blue-50 text-blue-600" : ""
                                }`}
                            >
                                {isExpanded
                                    ? <FiChevronUp /> : <FiChevronDown/>
                                }
                            </span>
                        </button>

                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <FiBriefcase className="text-[13px]" />
                            {designationCount}{" "}
                            Designation{designationCount === 1 ? "" : "s"}
                        </span>

                    </div>

                </div>
                <div className="flex flex-wrap items-center gap-2">



                    <button
                        onClick={() =>
                            onEditDepartment(
                                departmentId,
                                department.name
                            )
                        }
                        title="Edit department"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                    >
                        <FiEdit2 className="text-[15px]" />
                        Edit
                    </button>

                    <button
                        onClick={() => setConfirmDelete(true)}
                        title="Delete department"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
                    >
                        <FiTrash2 className="text-[15px]" />
                        Delete
                    </button>

                    <button
                        onClick={() =>
                            onAddDesignation(
                                departmentId
                            )
                        }
                        className="group/btn inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 cursor-pointer whitespace-nowrap"
                    >
                        <FiPlus className="text-[15px] transition-transform duration-200 group-hover/btn:rotate-90" />
                        Add Designation
                    </button>

                </div>

            </div>

            {
                isExpanded && (
                    <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">

                        {Object.entries(
                            department.designations || {}
                        ).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-sm text-slate-500">
                                No designations added yet.
                            </div>
                        ) : (
                            Object.entries(
                                department.designations || {}
                            ).map(
                                ([
                                    designationId,
                                    designation,
                                ]) => (
                                    <DesignationItem
                                        key={designationId}
                                        companyCode={companyCode}
                                        departmentId={departmentId}
                                        designationId={designationId}
                                        designation={designation}
                                        onEditDesignation={
                                            onEditDesignation
                                        }
                                    />
                                )
                            )
                        )}

                    </div>
                )
            }

            <ConfirmDeleteModal
                open={confirmDelete}
                title="Delete Department"
                message="Are you sure you want to delete the department"
                itemName={department.name}
                note="All designations inside this department will be removed. This action cannot be undone."
                onConfirm={handleDeleteDepartment}
                onClose={() => setConfirmDelete(false)}
            />

        </div>
    );
}

export default DepartmentCard;