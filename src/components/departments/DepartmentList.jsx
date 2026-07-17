import Loader from "../common/Loader";
import DepartmentCard from "./DepartmentCard";

function DepartmentList({
    departments,
    companyCode,
    onEditDepartment,
    onAddDesignation,
    onEditDesignation,
    loading,
    expandedDepartment,
    toggleDepartment,
    filteredDepartments
}) {

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader text="Loading Departments"/>
            </div>
        );
    }

    if (
        Object.keys(
            departments || {}
        ).length === 0
    ) {
        return (
            <div className="bg-white border border-dashed rounded-2xl p-12 text-center">

                <h3 className="text-lg font-semibold text-slate-900">
                    No Departments Found
                </h3>

                <p className="text-slate-500 mt-2">
                    Create your first department.
                </p>

            </div>
        );
    }

    return (
        <div className="grid gap-3">
            {
                filteredDepartments.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">

                        <h3 className="text-lg font-semibold text-slate-900">
                            No Results Found
                        </h3>

                        <p className="text-slate-500 mt-2">
                            Try another search term.
                        </p>

                    </div>
                )
            }
            {filteredDepartments.map(
                ([departmentId, department]) => (
                    <DepartmentCard
                        key={departmentId}
                        companyCode={companyCode}
                        departmentId={departmentId}
                        department={department}
                        expandedDepartment={expandedDepartment}
                        toggleDepartment={toggleDepartment}
                        onEditDepartment={onEditDepartment}
                        onAddDesignation={onAddDesignation}
                        onEditDesignation={onEditDesignation}
                    />
                )
            )}

        </div>
    );
}

export default DepartmentList;