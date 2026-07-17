import DepartmentCard from "./DepartmentCard";

function DepartmentList({
    departments,
    companyCode,
    onEditDepartment,
    onAddDesignation,
    onEditDesignation,
}) {

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

            {Object.entries(
                departments
            ).map(
                ([departmentId, department]) => (
                    <DepartmentCard
                        key={departmentId}
                        companyCode={companyCode}
                        departmentId={departmentId}
                        department={department}
                        onEditDepartment={
                            onEditDepartment
                        }
                        onAddDesignation={
                            onAddDesignation
                        }
                        onEditDesignation={
                            onEditDesignation
                        }
                    />
                )
            )}

        </div>
    );
}

export default DepartmentList;