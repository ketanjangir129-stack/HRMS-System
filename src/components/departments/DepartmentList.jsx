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
}) {

    if (loading) {
        return (
            <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center">

                <svg
                    className="animate-spin h-8 w-8 text-blue-600"
                    viewBox="0 0 24 24"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="opacity-25"
                    />

                    <path
                        fill="currentColor"
                        className="opacity-75"
                        d="M12 2a10 10 0 00-10 10h4a6 6 0 016-6V2z"
                    />
                </svg>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Loading Departments...
                </h3>

                <p className="mt-1 text-slate-500">
                    Please wait while we fetch department data.
                </p>

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
        <div className="grid gap-5">

            {Object.entries(departments).map(
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