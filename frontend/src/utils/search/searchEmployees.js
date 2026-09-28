export const searchEmployees = (employees,searchTerm) => {
    if (!searchTerm.trim()) {
        return employees;
    }

    const query = searchTerm.trim().toLowerCase();

    return employees.filter(
        (employee) =>
            employee.name
                ?.toLowerCase()
                .includes(query) ||

            employee.employeeId
                ?.toLowerCase()
                .includes(query) ||

            employee.department
                ?.toLowerCase()
                .includes(query) ||

            employee.designation
                ?.toLowerCase()
                .includes(query)
    );
};