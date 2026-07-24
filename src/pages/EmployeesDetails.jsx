import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployeeById, updateEmployee } from "../services/EmployeeService";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  Pencil,
  UserRound,
  WalletCards,
} from "lucide-react";
 
function EmployeesDetails() {
    const companyCode = localStorage.getItem("companyCode");
    const { id } = useParams();
 
    const [employee, setEmployee] = useState(null);
 
    // Which card is currently being edited + its working copy
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Every section starts collapsed — the user opens what they need.
    const [expanded, setExpanded] = useState({});
    const [revealed, setRevealed] = useState({});

    const toggleExpand = (sectionId) =>
        setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));

    const toggleReveal = (fieldId) =>
        setRevealed((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));

    // Keep the last 4 characters visible, mask the rest
    const maskValue = (value) => {
        const text = String(value);
        return text.length <= 4 ? "X".repeat(text.length) : "X".repeat(text.length - 4) + text.slice(-4);
    };
 
    useEffect(() => {
        loadEmployee();
    }, []);
 
    const loadEmployee = async () => {
        const data = await getEmployeeById(companyCode, id);
        const formattedEmployee = {
            personalInfo: {
                ...data.personalInfo,
                name: data.personalInfo?.name || data.employmentInfo?.name || "",
                email: data.personalInfo?.email || data.employmentInfo?.email || "",
                mobile: data.personalInfo?.mobile || data.employmentInfo?.mobile || "",
 
                gender: data.personalInfo?.gender || "",
                dob: data.personalInfo?.dob || "",
 
                address:
                    `${data.personalInfo?.address || ""},
                    ${data.personalInfo?.city || ""},
                    ${data.personalInfo?.state || ""}
                    ${data.personalInfo?.pincode || ""}`.trim(),
            },

            employmentInfo: {
                ...data.employmentInfo,
                employeeId: data.employmentInfo?.employeeId || data.basic?.employeeId || "",
                department: data.employmentInfo?.department || data.basic?.department || "",
                designation: data.employmentInfo?.designation || data.basic?.designation || "",
                joiningDate: data.employmentInfo?.joiningDate || "",
            },

            bankInfo: {
                ...data.bankInfo,
                bankName: data.bankInfo?.bankName || "",
                accountNumber: data.bankInfo?.accountNumber || "",
                ifsc: data.bankInfo?.ifsc || data.bankInfo?.ifscCode || "",
                branch: data.bankInfo?.branch || data.bankInfo?.branchName || "",
            },

            documents: {
                ...data.documents,
                aadhaar: data.documents?.aadhaar || data.documents?.aadhaarNumber || "",
                pan: data.documents?.pan || data.documents?.panNumber || "",
                uan: data.documents?.uan || data.documents?.uanNumber || "",
                esic: data.documents?.esic || data.documents?.esicNumber || "",
            },

            salaryInfo: data.salaryInfo || {},

            account: {
                ...data.account,
                status: data.status || "Active",
            },
        };
 
        setEmployee(formattedEmployee);
    };
 
    const startEdit = (sectionId) => {
        setFormData({ ...(employee[sectionId] || {}) });
        setEditingSection(sectionId);
        setExpanded((prev) => ({ ...prev, [sectionId]: true }));
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
            icon: UserRound,
            title: "Personal Information",
            accent: "bg-indigo-50 text-indigo-600",
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
            icon: BriefcaseBusiness,
            title: "Employment Information",
            accent: "bg-violet-50 text-violet-600",
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
            icon: WalletCards,
            title: "Salary Information",
            accent: "bg-emerald-50 text-emerald-600",
            fields: [
                { key: "basicSalary", label: "Basic Salary" },
                { key: "bonus", label: "Bonus" },
                { key: "hra", label: "HRA" },
            ],
        },
        {
            section: "account",
            icon: BadgeCheck,
            title: "Account Information",
            accent: "bg-amber-50 text-amber-600",
            fields: [
                { key: "username", label: "Username" },
                { key: "password", label: "Password", masked: true },
                { key: "status", label: "Status" },
            ],
        },
        {
            section: "bankInfo",
            icon: Landmark,
            title: "Bank Information",
            accent: "bg-sky-50 text-sky-600",
            fields: [
                { key: "bankName", label: "Bank Name" },
                { key: "branch", label: "Branch" },
                { key: "accountNumber", label: "Account Number", masked: true },
                { key: "ifsc", label: "IFSC Code" },
            ],
        },
        {
            section: "documents",
            icon: FileText,
            title: "Documents",
            accent: "bg-rose-50 text-rose-600",
            fields: [
                { key: "resume", label: "Resume" },
                { key: "aadhaar", label: "Aadhaar Number", masked: true },
                { key: "pan", label: "PAN Number", masked: true },
            ],
        },
    ];
 

    return (
        <div className="w-full space-y-6">
 
                {/* Gradient profile header */}
                <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 px-8 py-8 text-white shadow-lg">
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
                          <div className="mt-1 text-white/120 flex items-center">
                             {employee.employmentInfo?.department
                                    ? ` ${employee.employmentInfo.department} - `
                                    : ""}
                              <p className="px-1 text-white/80">
                         
                                {employee.employmentInfo?.designation || "—"}
                               
                            </p>
                          </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                                <span>🆔 {employee.employmentInfo?.employeeId}</span>
                                <span>✉️ {employee.personalInfo?.email}</span>
                                <span>📞 {employee.personalInfo?.mobile}</span>
                            </div>
                        </div>
                    </div>
                </div>
 
                {/* Cards */}
                <div className="space-y-5">
                    {sections.map((section) => {
                        const isEditing = editingSection === section.section;
                        const isOpen = !!expanded[section.section];
                        const Icon = section.icon;
                        return (
                            <section
                                key={section.section}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm
                                           transition-shadow duration-200 hover:shadow-md"
                            >
                                {/* Tinted header strip: title left, actions right */}
                                <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
                                    <h2 className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${section.accent}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            {section.title}
                                        </span>
                                    </h2>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {isEditing ? (
                                            <>
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
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(section.section)}
                                                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(section.section)}
                                                    aria-label={isOpen ? "Collapse" : "Expand"}
                                                    aria-expanded={isOpen}
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-400 transition hover:border-indigo-300 hover:text-indigo-600"
                                                >
                                                    {isOpen ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="divide-y divide-gray-100 px-6 py2">
                                        {section.fields.map((field) => {
                                            const value = employee[section.section]?.[field.key];
                                            const editable = isEditing && !field.readOnly;
                                            const fieldId = `${section.section}.${field.key}`;
                                            const isHidden = field.masked && !revealed[fieldId];
                                            return (
                                                <div
                                                    key={field.key}
                                                    className={field.full ? "sm:col-span-2 lg:col-span-3" : ""}
                                                >
                                                    <p className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-40">
                                                        {field.label}
                                                    </p>

                                                    {editable ? (
                                                        // <input className ="flex-1 text-right"
                                                        <input
                                                            type="text"
                                                            value={formData[field.key] || ""}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    field.key,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    ) : (
                                                        <div className="mt-1.5 flex items-center gap-2">
                                                            <p className="break-words font-medium text-gray-800">
                                                                {value ? (
                                                                    isHidden ? maskValue(value) : value
                                                                ) : (
                                                                    <span className="text-gray-300">—</span>
                                                                )}
                                                            </p>
                                                            {field.masked && value && (
                                                                <button
                                                                    onClick={() => toggleReveal(fieldId)}
                                                                    aria-label={isHidden ? "Show value" : "Hide value"}
                                                                    className="shrink-0 text-gray-400 transition hover:text-indigo-600"
                                                                >
                                                                    {isHidden ? (
                                                                        <Eye className="h-4 w-4" />
                                                                    ) : (
                                                                        <EyeOff className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
        </div>
    );
}
 
export default EmployeesDetails;
 
