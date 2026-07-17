import DesignationItem from "./DesignationItem";
import {deleteDepartment,} from "../../services/departmentService";

function DepartmentCard({
    companyCode,
    departmentId,
    department,
    onEditDepartment,
    onAddDesignation,
    onEditDesignation,
}) {

    const handleDeleteDepartment = async () => {
        const confirmDelete =
            window.confirm(
                `Delete ${department.name} department?`
            );

        if (!confirmDelete) return;

        await deleteDepartment(
            companyCode,
            departmentId
        );
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

            <div className="flex justify-between items-start">

                <div>
                    <h2 className="text-xl font-semibold text-slate-900">
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
                        onClick={() =>
                            onEditDepartment(
                                departmentId,
                                department.name
                            )
                        }
                        className="px-3 py-2 border rounded-lg hover:bg-slate-50"
                    >
                        Edit
                    </button>

                    <button
                        onClick={
                            handleDeleteDepartment
                        }
                        className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                        Delete
                    </button>

                    <button
                        onClick={() =>
                            onAddDesignation(
                                departmentId
                            )
                        }
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Add Designation
                    </button>

                </div>

            </div>

            <div className="mt-5 space-y-3">

                {Object.entries(
                    department.designations || {}
                ).length === 0 ? (
                    <div className="text-sm text-slate-500 border rounded-xl p-4">
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

        </div>
    );
}

export default DepartmentCard;