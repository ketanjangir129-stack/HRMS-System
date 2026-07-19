import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployeeById, updateEmployee } from "../services/EmployeeService";

function EmployeesDetails() {
    const companyCode = localStorage.getItem("companyCode");
    const { id } = useParams();

    const [employee, setEmployee] = useState(null);

    // Which card is currently being edited + its working copy
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEmployee();
    }, []);

    const loadEmployee = async () => {
        const data = await getEmployeeById(companyCode, id);
        const formattedEmployee = {
            personalInfo: {
                name: data.basic?.name || "",
                email: data.basic?.email || "",
                mobile: data.basic?.mobile || "",

                gender: data.personal?.gender || "",
                dob: data.personal?.dob || "",

                address:
                    `${data.personal?.address || ""}, 
                    ${data.personal?.city || ""}, 
                    ${data.personal?.state || ""} 
                    ${data.personal?.pincode || ""}`.trim(),
            },

            employmentInfo: {
                employeeId: data.basic?.employeeId || "",
                department: data.basic?.department || "",
                designation: data.basic?.designation || "",
                joiningDate: data.personal?.joiningDate || "",
            },

            bankInfo: {
                bankName: data.bank?.bankName || "",
                accountNumber: data.bank?.accountNumber || "",
                ifscCode: data.bank?.ifscCode || "",
                branch: data.bank?.branchName || "",
            },

            documents: {
                aadhaar: data.documents?.aadhaarNumber || "",
                pan: data.documents?.panNumber || "",
                uan: data.documents?.uanNumber || "",
                esic: data.documents?.esicNumber || "",
            },

            account: {
                status: data.status || "Active",
            },
        };

        setEmployee(formattedEmployee);
    };

    const startEdit = (sectionId) => {
        setFormData({ ...(employee[sectionId] || {}) });
        setEditingSection(sectionId);
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setFormData({});
    };

    const handleFieldChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const saveSection = async (sectionId) => {
        setSaving(true);
        try {
            await updateEmployee(companyCode, id, { [sectionId]: formData });
            setEmployee((prev) => ({ ...prev, [sectionId]: formData }));
            setEditingSection(null);
        } catch (error) {
            console.error(error);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (!employee) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-500" />
                    <p className="font-medium">Loading employee…</p>
                </div>
            </div>
        );
    }

    // Build the initials for the avatar
    const initials =
        (employee.personalInfo?.name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("") || "?";

    const status = employee.account?.status || "Unknown";
    const isActive = status.toLowerCase() === "active";

    // Each card: section = key inside employee, fields carry the editable key.
    // readOnly fields are shown but never turned into inputs.
    const sections = [
        {
            section: "personalInfo",
            icon: "👤",
            title: "Personal Information",
            accent: "bg-indigo-50",
            fields: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "mobile", label: "Mobile" },
                { key: "gender", label: "Gender" },
                { key: "dob", label: "DOB" },
                { key: "address", label: "Address", full: true },
            ],
        },
        {
            section: "employmentInfo",
            icon: "💼",
            title: "Employment Information",
            accent: "bg-purple-50",
            fields: [
                { key: "employeeId", label: "Employee ID", readOnly: true },
                { key: "department", label: "Department" },
                { key: "designation", label: "Designation" },
                { key: "joiningDate", label: "Joining Date" },
                { key: "employeeType", label: "Employee Type" },
            ],
        },
        {
            section: "salaryInfo",
            icon: "💰",
            title: "Salary Information",
            accent: "bg-emerald-50",
            fields: [
                { key: "basicSalary", label: "Basic Salary" },
                { key: "bonus", label: "Bonus" },
                { key: "hra", label: "HRA" },
            ],
        },
        {
            section: "account",
            icon: "🔐",
            title: "Account Information",
            accent: "bg-amber-50",
            fields: [
                { key: "username", label: "Username" },
                { key: "password", label: "Password" },
                { key: "status", label: "Status" },
            ],
        },
        {
            section: "bankInfo",
            icon: "🏦",
            title: "Bank Information",
            accent: "bg-sky-50",
            fields: [
                { key: "bankName", label: "Bank Name" },
                { key: "branch", label: "Branch" },
                { key: "accountNumber", label: "Account Number" },
                { key: "ifscCode", label: "IFSC Code" },
            ],
        },
        {
            section: "documents",
            icon: "📂",
            title: "Documents",
            accent: "bg-rose-50",
            fields: [
                { key: "resume", label: "Resume" },
                { key: "aadhaar", label: "Aadhaar Number" },
                { key: "pan", label: "PAN Number" },
            ],
        },
    ];

    return (
        <div className="flex h-full justify-center">
            <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">

                {/* Gradient profile header — fixed */}
                <div className="shrink-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 px-8 py-8 text-white">
                    <div className="flex items-center gap-5">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-2 ring-white/30">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="truncate text-2xl font-bold">
                                    {employee.personalInfo?.name}
                                </h1>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                        isActive
                                            ? "bg-emerald-400/20 text-emerald-100"
                                            : "bg-rose-400/20 text-rose-100"
                                    }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            isActive ? "bg-emerald-300" : "bg-rose-300"
                                        }`}
                                    />
                                    {status}
                                </span>
                            </div>
                            <p className="mt-1 text-white/80">
                                {employee.employmentInfo?.designation || "—"}
                                {employee.employmentInfo?.department
                                    ? ` · ${employee.employmentInfo.department}`
                                    : ""}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                                <span>🆔 {employee.employmentInfo?.employeeId}</span>
                                <span>✉️ {employee.personalInfo?.email}</span>
                                <span>📞 {employee.personalInfo?.mobile}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body — only this area scrolls */}
                <div className="flex-1 space-y-6 overflow-y-auto bg-white p-8">
                    {sections.map((section) => {
                        const isEditing = editingSection === section.section;
                        return (
                            <section
                                key={section.section}
                                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm
                                           transition-all duration-200 hover:shadow-md"
                            >
                                {/* Card header with Edit / Save-Cancel */}
                                <div className="mb-5 flex items-center justify-between border-b pb-3">
                                    <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                                        <span
                                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${section.accent}`}
                                        >
                                            {section.icon}
                                        </span>
                                        {section.title}
                                    </h2>

                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={cancelEdit}
                                                disabled={saving}
                                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveSection(section.section)}
                                                disabled={saving}
                                                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                            >
                                                {saving ? "Saving…" : "Save"}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEdit(section.section)}
                                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                    {section.fields.map((field) => {
                                        const value = employee[section.section]?.[field.key];
                                        const editable = isEditing && !field.readOnly;
                                        return (
                                            <div
                                                key={field.key}
                                                className={field.full ? "col-span-2" : ""}
                                            >
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                    {field.label}
                                                </p>

                                                {editable ? (
                                                    <input
                                                        type="text"
                                                        value={formData[field.key] || ""}
                                                        onChange={(e) =>
                                                            handleFieldChange(
                                                                field.key,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                    />
                                                ) : (
                                                    <p className="mt-1 font-medium text-gray-800 break-words">
                                                        {value || (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default EmployeesDetails;