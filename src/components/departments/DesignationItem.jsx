import { useState } from "react";
import {deleteDesignation,} from "../../services/departmentService";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

function DesignationItem({
    companyCode,
    departmentId,
    designationId,
    designation,
    onEditDesignation,
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteDesignation(
                companyCode,
                departmentId,
                designationId
            );
            toast.success("Designation deleted successfully.");
            setConfirmDelete(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete designation.");
        }
    };

    return (
        <div className="group/item flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50">

            <div className="flex min-w-0 items-center gap-3">

                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />

                <span className="truncate text-sm font-medium text-slate-700">
                    {designation.name}
                </span>

            </div>

            <div className="flex shrink-0 gap-2">

                <button
                    onClick={() =>
                        onEditDesignation(
                            departmentId,
                            designationId,
                            designation.name
                        )
                    }
                    title="Edit designation"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                    <FiEdit2 className="text-[14px]" />
                    Edit
                </button>

                <button
                    onClick={() => setConfirmDelete(true)}
                    title="Delete designation"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
                >
                    <FiTrash2 className="text-[14px]" />
                    Delete
                </button>

            </div>

            <ConfirmDeleteModal
                open={confirmDelete}
                title="Delete Designation"
                message="Are you sure you want to delete the designation"
                itemName={designation.name}
                onConfirm={handleDelete}
                onClose={() => setConfirmDelete(false)}
            />

        </div>
    );
}

export default DesignationItem;