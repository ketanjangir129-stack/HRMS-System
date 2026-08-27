import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AssignManagerModal from "../components/departments/AssignManagerModal";
import DepartmentList from "../components/departments/DepartmentList";
import DepartmentModal from "../components/departments/DepartmentModal";
import DesignationModal from "../components/departments/DesignationModal";
import { validateField } from "../utils/validation/validateField";
import {searchDepartments,} from "../utils/search/searchDepartments";
import { useOutletContext } from "react-router-dom";
import { FiLayers, FiPlus, FiGrid, FiBriefcase, FiUserCheck } from "react-icons/fi";

import {
    addDepartment,
    updateDepartment,
    addDesignation,
    updateDesignation,
    subscribeDepartments,
    setDepartmentManager,
    clearDepartmentManager,
} from "../services/departmentService";
import { getEmployees } from "../services/EmployeeService";
import { ROLE } from "../utils/attendance/attendanceConstants";
import { getDepartmentManager } from "../utils/permissions/departmentScope";

function Departments() {

    const companyCode = localStorage.getItem("companyCode");

    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState({});
    const [departmentModal, setDepartmentModal] = useState(false);
    const [designationModal, setDesignationModal] = useState(false);
    const [departmentName, setDepartmentName] = useState("");
    const [designationName, setDesignationName] = useState("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [editingDepartmentId, setEditingDepartmentId] = useState(null);
    const [editingDesignationId, setEditingDesignationId] = useState(null);
    const [expandedDepartment, setExpandedDepartment] = useState(null);
    const [departmentError, setDepartmentError] = useState("");
    const [designationError, setDesignationError] = useState("");
    const {search,setSearch,setSearchPlaceholder} = useOutletContext();

    /*
        Manager assignment. The department being appointed to is held whole
        rather than by id, so the modal can name it and read the manager
        already on it without looking it up again.
    */
    const [managerTarget, setManagerTarget] = useState(null);
    const [managers, setManagers] = useState([]);
    const [savingManager, setSavingManager] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeDepartments(
            companyCode,
            (data) => {
                setDepartments(data);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, [companyCode]);

    /*
        Only employees who already hold the Manager role can be appointed:
        the approval scope is resolved from the role first and from the
        appointment second, so appointing anybody else would write a manager
        onto the department that no screen would ever act on.

        Read once, not subscribed. Roles change on the employee screens and
        this list is re-read whenever the page is opened, which is as fresh as
        a picker needs to be.
    */
    useEffect(() => {

        let cancelled = false;

        const loadManagers = async () => {

            try {

                const data = await getEmployees(companyCode);

                if (cancelled) return;

                setManagers(
                    Object.entries(data || {})
                        .filter(
                            ([, employee]) =>
                                employee?.account?.role === ROLE.MANAGER &&
                                employee?.account?.status === "Active"
                        )
                        .map(([key, employee]) => ({
                            employeeId:
                                employee?.employmentInfo?.employeeId || key,
                            name:
                                employee?.personalInfo?.name ||
                                employee?.employmentInfo?.name ||
                                "",
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );

            } catch (error) {

                if (cancelled) return;

                console.error("Failed to load managers:", error);

                setManagers([]);

            }

        };

        loadManagers();

        return () => {
            cancelled = true;
        };

    }, [companyCode]);

    //adding and editing deparment
    const handleDepartmentSave = async () => {
        const error = validateField("departmentName",departmentName);

        if (error) {
            setDepartmentError(error);
            return;
        }

        const exists = Object.values(
            departments || {}
        ).some((department) =>
            department.name.trim().toLowerCase() ===
            departmentName.trim().toLowerCase()
        );

        if (exists && !editingDepartmentId ) {
            setDepartmentError("Department already exists.");
            return;
        }
        try {
            if (editingDepartmentId) {

                await updateDepartment(
                    companyCode,
                    editingDepartmentId,
                    departmentName
                );
                toast.success("Department updated successfully.");
            } else {
                await addDepartment(
                    companyCode,
                    departmentName
                );
                toast.success("Department added successfully.");
            }

            setDepartmentError("");
            setDepartmentModal(false);
            setDepartmentName("");
            setEditingDepartmentId(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to save department.");
        }
    };

    const handleDesignationSave = async () => {

        const error = validateField("designationName",designationName);
        if (error) {
            setDesignationError(error);
            return;
        }
        const currentDepartment =departments[selectedDepartmentId];
        const exists = Object.values(
            currentDepartment
                ?.designations || {}
        ).some(
            (designation) =>
                designation.name.trim().toLowerCase() ===
                designationName.trim().toLowerCase()
        );

        if (exists && !editingDesignationId) {
            setDesignationError("Designation already exists.");
            return;
        }

        try {
            if (editingDesignationId) {
                await updateDesignation(
                    companyCode,
                    selectedDepartmentId,
                    editingDesignationId,
                    designationName
                );
                toast.success("Designation updated successfully.");

            } else {

                await addDesignation(
                    companyCode,
                    selectedDepartmentId,
                    designationName
                );
                toast.success("Designation added successfully.");
            }
            setDesignationError("");
            setDesignationModal(false);
            setDesignationName("");
            setEditingDesignationId(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to save designation.");
        }
    };

    /*
        Assigning and removing both go through one handler: the write differs,
        the toast and the closing do not. The list is a realtime subscription,
        so nothing is merged into state here - the card updates for everybody
        looking at the page and not only for whoever pressed the button.
    */
    const handleManagerSave = async (manager) => {

        if (!managerTarget) return;

        setSavingManager(true);

        try {

            const result = manager
                ? await setDepartmentManager(
                    companyCode,
                    managerTarget.id,
                    manager
                )
                : await clearDepartmentManager(
                    companyCode,
                    managerTarget.id
                );

            if (!result?.success) {
                toast.error(result?.message || "Failed to update the manager.");
                return;
            }

            toast.success(
                manager
                    ? `${manager.name || manager.employeeId} now manages ${managerTarget.department?.name}.`
                    : `Manager removed from ${managerTarget.department?.name}.`
            );

            setManagerTarget(null);

        } catch (error) {

            console.error(error);
            toast.error("Failed to update the manager.");

        } finally {

            setSavingManager(false);

        }

    };

    const toggleDepartment = (departmentId) => {
        setExpandedDepartment((prev) =>
            prev === departmentId
                ? null
                : departmentId
        );
    };

    //filtering data
    const filteredDepartments = searchDepartments(
        departments,
        search
    );

    const totalDepartments = Object.keys(departments || {}).length;

    const totalDesignations = Object.values(departments || {}).reduce(
        (total, department) =>
            total + Object.keys(department.designations || {}).length,
        0
    );

    /*
        Counted rather than listed: what matters at a glance is whether any
        department is running without somebody to approve its attendance and
        its leave, and the cards below say which ones.
    */
    const managedDepartments = useMemo(
        () =>
            Object.values(departments || {}).filter((department) =>
                Boolean(getDepartmentManager(department))
            ).length,
        [departments]
    );

    /*
        The tile hue is per figure and stays put, the same way the dashboard's
        quick links are keyed by colour: after a week the emerald tile IS the
        coverage number, and shuffling them would cost more than it gained.
    */
    const stats = [
        {
            title: "Total Departments",
            value: totalDepartments,
            icon: <FiGrid />,
            tile: "bg-indigo-100 text-indigo-600",
        },
        {
            title: "Total Designations",
            value: totalDesignations,
            icon: <FiBriefcase />,
            tile: "bg-violet-100 text-violet-600",
        },
        {
            title: "Managed",
            value: `${managedDepartments}/${totalDepartments}`,
            icon: <FiUserCheck />,
            tile: "bg-emerald-100 text-emerald-600",
        },
    ];

    useEffect(() => {
        return () => {
            setSearch("");
        };
    }, []);
    useEffect(() => {
        setSearchPlaceholder("Search department or designation...");
        return () => {
            setSearchPlaceholder("Search...");
        };

    }, []);

    return (
        <div className="flex-1 min-h-full">

            {/*
                Header

                Set the way the dashboard sets its own: the section name leads
                as a quiet eyebrow in the brand hue, and the page title gets the
                size rather than being boxed into a panel of its own.
            */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8">

                <div className="min-w-0">

                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
                        <FiLayers className="shrink-0" size={14} />
                        <span className="truncate">Organisation</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-ink wrap-break-word">
                        Departments
                    </h1>

                    <p className="mt-1 text-sm text-ink-subtle">
                        Manage departments and designations
                    </p>

                </div>

                <button
                    onClick={() => {
                        setEditingDepartmentId(null);
                        setDepartmentName("");
                        setDepartmentModal(true);
                    }}
                    className="ui-btn ui-btn-primary group font-semibold"
                >
                    <FiPlus
                        size={18}
                        className="transition-transform duration-200 group-hover:rotate-90"
                    />
                    Add Department
                </button>

            </div>

            {/*
                Stats

                One card per figure on the same grid the dashboard cards sit on,
                so the counts read as part of the page rather than as chips
                crowded into the corner of a header strip.
            */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-3 sm:gap-6">

                {stats.map((stat) => (

                    <div
                        key={stat.title}
                        className="ui-card flex items-center gap-4 p-4 sm:p-5"
                    >

                        <span className={`ui-tile ui-tile-sm text-lg ${stat.tile}`}>
                            {stat.icon}
                        </span>

                        <div className="min-w-0">

                            <p className="truncate text-xs font-medium text-ink-subtle">
                                {stat.title}
                            </p>

                            <p className="text-xl font-bold text-ink sm:text-2xl">
                                {stat.value}
                            </p>

                        </div>

                    </div>

                ))}

            </div>

            <DepartmentList
                loading={loading}
                departments={departments}
                companyCode={companyCode}
                expandedDepartment={expandedDepartment}
                toggleDepartment={toggleDepartment}
                filteredDepartments={filteredDepartments}
                onEditDepartment={(
                    departmentId,
                    departmentName
                ) => {

                    setEditingDepartmentId(departmentId);
                    setDepartmentName(departmentName);
                    setDepartmentModal(true);
                }}
                onAddDesignation={(
                    departmentId
                ) => {

                    setSelectedDepartmentId(departmentId);
                    setDesignationName("");
                    setEditingDesignationId(null);
                    setDesignationModal(true);
                }}
                onEditDesignation={(
                    departmentId,
                    designationId,
                    designationName
                ) => {

                    setSelectedDepartmentId(departmentId);
                    setEditingDesignationId(designationId);
                    setDesignationName(designationName);
                    setDesignationModal(true);
                }}
                onAssignManager={(
                    departmentId,
                    department
                ) => {

                    setManagerTarget({ id: departmentId, department });
                }}
            />

            <DepartmentModal
                open={departmentModal}
                title={editingDepartmentId ? "Edit Department" : "Add Department"}
                value={departmentName}
                setValue={setDepartmentName}
                error={departmentError}
                onSave={handleDepartmentSave}
                onClose={() => {
                    setDepartmentModal(false);
                    setDepartmentError("");
                }}
            />

            <DesignationModal
                open={designationModal}
                title={editingDesignationId ? "Edit Designation" : "Add Designation"}
                value={designationName}
                setValue={setDesignationName}
                error={designationError}
                onSave={handleDesignationSave}
                onClose={() =>{
                    setDesignationModal(false);
                    setDesignationError("");
                }}
            />

            {/* Keyed on the department, so opening a second card remounts the
                modal and its selection starts from that department's own
                manager rather than the previous one's. */}
            <AssignManagerModal
                key={managerTarget?.id || "none"}
                open={Boolean(managerTarget)}
                department={managerTarget?.department}
                managers={managers}
                saving={savingManager}
                onClose={() => setManagerTarget(null)}
                onSave={handleManagerSave}
                onRemove={() => handleManagerSave(null)}
            />

        </div>
    );
}

export default Departments;