import {deleteDesignation,} from "../../services/departmentService";
import { toast } from "react-toastify";

function DesignationItem({
    companyCode,
    departmentId,
    designationId,
    designation,
    onEditDesignation,
}) {
    const handleDelete = async () => {
        const confirmDelete = window.confirm("Delete designation?");

        if (!confirmDelete) return;
        try {
            await deleteDesignation(
                companyCode,
                departmentId,
                designationId
            );
            toast.success("Designation deleted successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete designation.");
        }
    };

    return (
        <div className="flex items-center justify-between border border-gray-300 rounded-xl px-4 py-3 cursor-pointer">

            <span className="font-medium text-slate-700">
                {designation.name}
            </span>

            <div className="flex gap-2">

                <button
                    onClick={() =>
                        onEditDesignation(
                            departmentId,
                            designationId,
                            designation.name
                        )
                    }
                    className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 border-gray-300 cursor-pointer"
                >
                    Edit
                </button>

                <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                    Delete
                </button>

            </div>

        </div>
    );
}

export default DesignationItem;