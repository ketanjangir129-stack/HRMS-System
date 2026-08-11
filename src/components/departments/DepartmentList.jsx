import Loader from "../common/Loader";
import DepartmentCard from "./DepartmentCard";
import { FiGrid, FiSearch } from "react-icons/fi";
import DepartmentSkeleton from "../../components/skeletons/DepartmentSkeleton";

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
            <DepartmentSkeleton />
        );
    }

    if (
        Object.keys(
            departments || {}
        ).length === 0
    ) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">

                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600 sm:h-14 sm:w-14 sm:text-2xl">
                    <FiGrid />
                </div>

                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                    No Departments Found
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    Create your first department to start organising roles and designations.
                </p>

            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {
                filteredDepartments.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">

                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400 sm:h-14 sm:w-14 sm:text-2xl">
                            <FiSearch />
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                            No Results Found
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
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