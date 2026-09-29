export const searchDepartments = (
    departments,
    searchTerm
) => {
    if (!searchTerm.trim()) {
        return Object.entries(
            departments || {}
        );
    }
    const query = searchTerm.trim().toLowerCase();

    return Object.entries(
        departments || {}
    ).filter(
        ([_, department]) => {

            const departmentMatch =
                department.name
                    ?.toLowerCase()
                    .includes(query);

            const designationMatch =Object.values(department.designations || {}).some(
                (designation) =>designation.name?.toLowerCase().includes(query)
            );
            return (
                departmentMatch ||
                designationMatch
            );
        }
    );
};