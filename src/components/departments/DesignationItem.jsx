import {
    deleteDesignation,
} from "../../services/departmentService";

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
        await deleteDesignation(
            companyCode,
            departmentId,
            designationId
        );
    };

    return (
        <div className="flex items-center justify-between border rounded-xl px-4 py-3">

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
                    className="px-3 py-1.5 border rounded-lg hover:bg-slate-50"
                >
                    Edit
                </button>

                <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                    Delete
                </button>

            </div>

        </div>
    );
}

export default DesignationItem;