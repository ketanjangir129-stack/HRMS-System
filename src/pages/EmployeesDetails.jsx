import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEmployeeById, updateEmployee } from "../services/EmployeeService";
import { getDepartments } from "../services/departmentService";
import { validateField } from "../utils/validation/validateField";
import { rules } from "../utils/validation/rules";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  Landmark,
  Mail,
  Pencil,
  Phone,
  UserRound,
  WalletCards,
} from "lucide-react";
 
function EmployeesDetails() {
    const companyCode = localStorage.getItem("companyCode");
    const { id } = useParams();
 
    const [employee, setEmployee] = useState(null);

    // Add Employee jaisa hi source — departments list + selected dept ke designations
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    // Which card is currently being edited + its working copy
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [loadError, setLoadError] = useState("");

    // Every section starts collapsed — the user opens what they need.
    const [expanded, setExpanded] = useState({});
    const [revealed, setRevealed] = useState({});

    // DOB picker mein future date select hi na ho
    const today = new Date().toISOString().split("T")[0];

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
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        const data = await getDepartments(companyCode);

        if (!data) {
            setDepartments([]);
            return;
        }

        const departmentArray = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
        }));

        setDepartments(departmentArray);
    };

    // Chune hue department ke hisaab se designation options set karo
    const loadDesignationsFor = (departmentName) => {
        const dept = departments.find((item) => item.name === departmentName);

        const designationArray = dept?.designations
            ? Object.keys(dept.designations).map((key) => ({
                id: key,
                ...dept.designations[key],
            }))
            : [];

        setDesignations(designationArray);
    };

    // Department badla → designation reset + uske naye options load
    const handleDepartmentChange = (value) => {
        setFormData((prev) => ({ ...prev, department: value, designation: "" }));
        setErrors((prev) => ({ ...prev, department: "" }));
        loadDesignationsFor(value);
    };

    const loadEmployee = async () => {
        setLoadError("");
        try {
        const data = await getEmployeeById(companyCode, id);

        // Employee mila hi nahi (galat id / delete ho gaya)]
        if (!data) {
            setLoadError("Employee not found.");
            return;
        }

        const formattedEmployee = {
            personalInfo: (() => {
                
                const { city, state, pincode, ...rest } = data.personalInfo || {};
                return {
                    ...rest,
                    name: data.personalInfo?.name || data.employmentInfo?.name || "",
                    email: data.personalInfo?.email || data.employmentInfo?.email || "",
                    mobile: data.personalInfo?.mobile || data.employmentInfo?.mobile || "",
                    gender: data.personalInfo?.gender || "",
                    dob: data.personalInfo?.dob || "",
                    address: [rest.address, city, state, pincode]
                        .map((part) => (part ? String(part).replace(/\s+/g, " ").trim() : ""))
                        .filter(Boolean)
                        .join(", ")
                        .replace(/(,\s*)+/g, ", ")
                        .trim(),
                };
            })(),


            employmentInfo: {
                ...data.employmentInfo,
                employeeId: data.employmentInfo?.employeeId || "",
                department: data.employmentInfo?.department || "",
                designation: data.employmentInfo?.designation || "",
                joiningDate: data.employmentInfo?.joiningDate || "",
            },

            bankInfo: (() => {
                // Purane naam (ifscCode/branchName) nikaal do taaki spread se dubara na aayein
                const { ifscCode, branchName, ...rest } = data.bankInfo || {};
                return {
                    ...rest,
                    bankName: rest.bankName || "",
                    accountNumber: rest.accountNumber || "",
                    ifsc: rest.ifsc || ifscCode || "",
                    branch: rest.branch || branchName || "",
                };
            })(),

            documents: (() => {
                // Purane naam (…Number) nikaal do taaki duplicate keys na banein
                const { aadhaarNumber, panNumber, uanNumber, esicNumber, ...rest } = data.documents || {};
                return {
                    ...rest,
                    aadhaar: rest.aadhaar || aadhaarNumber || "",
                    pan: rest.pan || panNumber || "",
                    uan: rest.uan || uanNumber || "",
                    esic: rest.esic || esicNumber || "",
                };
            })(),

            salaryInfo: data.salaryInfo || {},

            account: {
                ...data.account,
                status: data.account?.status || data.status || "Active",
            },
        };
 
        setEmployee(formattedEmployee);
        } catch (error) {
            console.error("Failed to load employee:", error);
            setLoadError("Failed to load employee. Please try again.");
        }
    };

    const startEdit = (sectionId) => {
        setFormData({ ...(employee[sectionId] || {}) });
        setEditingSection(sectionId);
        setExpanded((prev) => ({ ...prev, [sectionId]: true }));
        setErrors({});

        // Employment edit khulte hi maujooda department ke designations dikha do
        if (sectionId === "employmentInfo") {
            loadDesignationsFor(employee.employmentInfo?.department);
        }
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setFormData({});
        setErrors({});
    };

    const handleFieldChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        // Jis field ko user theek kar raha hai, uska error turant hata do
        setErrors((prev) => ({ ...prev, [key]: "" }));
    };

    const validateSection = (sectionId, data) => {
        const sectionErrors = {};

        Object.keys(data).forEach((key) => {
            if (!rules[key]) return; // is field ka koi rule nahi → skip

            const value = data[key];
            const isEmpty = !String(value ?? "").trim();

            // Optional field (rule required nahi) khaali ho to validate mat karo
            if (isEmpty && !rules[key].required) return;

            const error = validateField(key, value, { ...employee, [sectionId]: data });
            if (error) sectionErrors[key] = error;
        });

        return sectionErrors;
    };

    const saveSection = async (sectionId) => {
        // Save se pehle validate karo
        const validationErrors = validateSection(sectionId, formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return; // galti hai to save mat karo
        }

        setSaving(true);
        try {
            await updateEmployee(companyCode, id, { [sectionId]: formData });
            setEmployee((prev) => ({ ...prev, [sectionId]: formData }));
            setEditingSection(null);
            setErrors({});
        } catch (error) {
            console.error(error);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };
 
    // Load fail hua ya employee mila nahi → error + Retry (infinite spinner se bachne ke liye)
    if (loadError) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="font-medium text-red-600">{loadError}</p>
                    <button
                        onClick={loadEmployee}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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
                { key: "gender", label: "Gender", type:"select" , options:["Male", "Female", "Prefer not to say"] },
                { key: "dob", label: "DOB", type:"date" },
                { key: "address", label: "Address" },
            ],
        },
        {
            section: "employmentInfo",
            icon: BriefcaseBusiness,
            title: "Employment Information",
            accent: "bg-violet-50 text-violet-600",
            fields: [
                { key: "employeeId", label: "Employee ID", readOnly: true },
                { key: "department", label: "Department", type: "select" },
                { key: "designation", label: "Designation", type: "select" },
                { key: "joiningDate", label: "Joining Date", type: "date" },
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
            // Poora section sirf dekhne ke liye — koi Edit button nahi
            readOnly: true,
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
                    {/* Left: avatar + name/dept · Right: contact details */}
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-5">
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
                                <div className="mt-1 flex items-center text-white/80">
                                    {employee.employmentInfo?.department
                                        ? ` ${employee.employmentInfo.department} - `
                                        : ""}
                                    <p className="px-1 text-white/80">
                                        {employee.employmentInfo?.designation || "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 text-sm text-white/80 lg:items-end">
                            <span className="flex items-center gap-1.5">
                                <IdCard className="h-4 w-4 shrink-0" />
                                {employee.employmentInfo?.employeeId || "—"}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Phone className="h-4 w-4 shrink-0" />
                                {employee.personalInfo?.mobile || "—"}
                            </span>
                            <span className="flex min-w-0 items-center gap-1.5">
                                <Mail className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {employee.personalInfo?.email || "—"}
                                </span>
                            </span>
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
                    
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(section.section)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-4 text-left transition hover:bg-gray-100/80"
                                >
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

                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-400">
                                        {isOpen ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </span>
                                </button>

                                {isOpen && (
                                    <div className="px-6 py-4">
                                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                        {section.fields.map((field) => {
                                            const value = employee[section.section]?.[field.key];
                                            const editable =
                                                isEditing && !section.readOnly && !field.readOnly;
                                            const fieldId = `${section.section}.${field.key}`;
                                            const isHidden = field.masked && !revealed[fieldId];

                                            // Dropdown options:
                                            const selectOptions =
                                                field.key === "department"
                                                    ? departments.map((d) => d.name)
                                                    : field.key === "designation"
                                                    ? designations.map((d) => d.name)
                                                    : field.options || [];

                                            
                                            const handleSelectChange =
                                                field.key === "department"
                                                    ? (e) => handleDepartmentChange(e.target.value)
                                                    : (e) => handleFieldChange(field.key, e.target.value);
                                            return (
                                                <div
                                                    key={field.key}
                                                    className={`flex flex-col gap-1.5 ${field.full ? "sm:col-span-2" : ""}`}
                                                >
                                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                        {field.label}
                                                    </p>

                                                    {editable ? (
                                                        <>
                                                            {field.type === "select" ? (
                                                                <select
                                                                    value={formData[field.key] || ""}
                                                                    onChange={handleSelectChange}
                                                                    disabled={
                                                                        field.key === "designation" &&
                                                                        !formData.department
                                                                    }
                                                                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                                                                        errors[field.key]
                                                                            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                                                                            : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"
                                                                    }`}
                                                                >
                                                                    <option value="">
                                                                        Select {field.label}
                                                                    </option>
                                                                    {selectOptions.map((opt) => (
                                                                        <option key={opt} value={opt}>
                                                                            {opt}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={field.type === "date" ? "date" : "text"}
                                                                    max={field.key === "dob" ? today : undefined}
                                                                    value={formData[field.key] || ""}
                                                                    onChange={(e) =>
                                                                        handleFieldChange(
                                                                            field.key,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 ${
                                                                        errors[field.key]
                                                                            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                                                                            : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"
                                                                    }`}
                                                                />
                                                            )}
                                                            {errors[field.key] && (
                                                                <p className="text-xs text-red-500">
                                                                    {errors[field.key]}
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <p className="break-words text-sm font-medium text-gray-800">
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

                                    
                                        {!section.readOnly && (
                                        <div className="flex items-center justify-end gap-2 pt-4">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 disabled:opacity-60"
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
                                                <button
                                                    onClick={() => startEdit(section.section)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                                </button>
                                            )}
                                        </div>
                                        )}
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
 
