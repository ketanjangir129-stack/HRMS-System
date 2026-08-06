import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEmployeeById,
  updateEmployee,
  updateEmployeeSection,
  uploadResume,
} from "../services/EmployeeService";
// import { getSalary } from "../services/SalaryService";
import { getDepartments } from "../services/departmentService";
import { validateField } from "../utils/validation/validateField";
import { rules } from "../utils/validation/rules";
import {
  ArrowLeft,
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
  Power,
  UserRound,
  X,
} from "lucide-react";

function EmployeesDetails() {
    const companyCode = localStorage.getItem("companyCode");
    const { id } = useParams();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);

    // Salary ab sidebar ke apne module se dikhti hai — is page par nahi.
    // undefined = load ho raha hai, null = assign nahi hui
    // const [salary, setSalary] = useState(undefined);

    // Activate / Deactivate ke waqt button disable rakhne ke liye
    const [statusUpdating, setStatusUpdating] = useState(false);

    // Add Employee jaisa hi source
    const [departments, setDepartments] = useState([]);

    // Which card is currently being edited + its working copy
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Documents card mein chuni hui PDF — Save par hi upload hoti hai
    const [resumeFile, setResumeFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [loadError, setLoadError] = useState("");

    // Save / status-change fail hone par upar dikhne wala banner (alert ki jagah)
    const [actionError, setActionError] = useState("");

    // Every section starts collapsed — the user opens what they need.
    const [expanded, setExpanded] = useState({});
    const [revealed, setRevealed] = useState({});

    // DOB picker mein future date select hi na ho
    const today = new Date().toISOString().split("T")[0];

    const toggleExpand = (sectionId) =>
        setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));

    const toggleReveal = (fieldId) =>
        setRevealed((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));

    // Salary card ke amounts — khaali ya galat value par dash dikhao
    // const formatAmount = (value) => {
    //     const amount = Number(value);
    //
    //     if (value === "" || value === null || value === undefined || Number.isNaN(amount)) {
    //         return <span className="text-gray-300">—</span>;
    //     }
    //
    //     return `₹ ${amount.toLocaleString("en-IN")}`;
    // };

    // Keep the last 4 characters visible, mask the rest
    const maskValue = (value) => {
        const text = String(value);
        return text.length <= 4 ? "X".repeat(text.length) : "X".repeat(text.length - 4) + text.slice(-4);
    };
 
    // const loadSalary = async () => {
    //     try {
    //         setSalary(await getSalary(companyCode, id));
    //     } catch (error) {
    //         console.error("Failed to load salary:", error);
    //         setSalary(null);
    //     }
    // };

    const loadDepartments = async () => {
        try {
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
        } catch (error) {
            // Pura page fail na ho — sirf dropdown khaali rahega
            console.error("Failed to load departments:", error);
            setDepartments([]);
        }
    };

    // Chune hue department ke designations — state nahi, derived value.
    // Isse departments baad me load hon tab bhi dropdown apne aap bhar jaata hai.
    const designations = useMemo(() => {
        const dept = departments.find((item) => item.name === formData.department);

        return dept?.designations
            ? Object.keys(dept.designations).map((key) => ({
                id: key,
                ...dept.designations[key],
            }))
            : [];
    }, [departments, formData.department]);

    // Department badla → designation reset (naye options apne aap aa jayenge)
    const handleDepartmentChange = (value) => {
        setFormData((prev) => ({ ...prev, department: value, designation: "" }));
        setErrors((prev) => ({ ...prev, department: "" }));
    };

    const loadEmployee = async () => {
        try {
        const data = await getEmployeeById(companyCode, id);

        // Employee mila hi nahi (galat id / delete ho gaya)
        if (!data) {
            setLoadError("Employee not found.");
            return;
        }

        setLoadError("");

        const formattedEmployee = {
            // Purane onboarding records me naam/email/mobile employmentInfo me the.
            // city/state/pincode ko address me jodte the — usse woh pehli hi save par
            // gayab ho jaate the, isliye ab alag fields hi rehte hain.
            personalInfo: {
                ...(data.personalInfo || {}),
                name: data.personalInfo?.name || data.employmentInfo?.name || "",
                email: data.personalInfo?.email || data.employmentInfo?.email || "",
                mobile: data.personalInfo?.mobile || data.employmentInfo?.mobile || "",
                gender: data.personalInfo?.gender || "",
                dob: data.personalInfo?.dob || "",
                address: data.personalInfo?.address || "",
            },

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

            // salaryInfo yahan jaan-boojh kar nahi rakha — salary sirf
            // companies/{code}/salaries/{employeeId} se aati hai

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

    // id badalne par (ek details page se doosre par jaana) sab dobara load ho
    useEffect(() => {
        loadEmployee();
        loadDepartments();
        // loadSalary();
    }, [id]);

    const startEdit = (sectionId) => {
        setFormData({ ...(employee[sectionId] || {}) });
        setEditingSection(sectionId);
        setExpanded((prev) => ({ ...prev, [sectionId]: true }));
        setErrors({});
        setResumeFile(null);
        setActionError("");
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setFormData({});
        setErrors({});
        setResumeFile(null);
    };

    // Resume sirf PDF, 5 MB tak — galat file turant reject
    const MAX_RESUME_SIZE = 5 * 1024 * 1024;

    const handleResumeChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            setResumeFile(null);
            return;
        }

        const isPdf =
            file.type === "application/pdf" || /\.pdf$/i.test(file.name);

        if (!isPdf) {
            e.target.value = "";
            setResumeFile(null);
            setErrors((prev) => ({ ...prev, resume: "Resume must be a PDF file (.pdf)." }));
            return;
        }

        if (file.size > MAX_RESUME_SIZE) {
            e.target.value = "";
            setResumeFile(null);
            setErrors((prev) => ({ ...prev, resume: "Resume must be smaller than 5 MB." }));
            return;
        }

        setResumeFile(file);
        setErrors((prev) => ({ ...prev, resume: "" }));
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
        const hasNewResume = sectionId === "documents" && !!resumeFile;

        // Nayi PDF chuni hai to purane link ki jagah uska naam validate karo
        const validationErrors = validateSection(
            sectionId,
            hasNewResume ? { ...formData, resume: resumeFile.name } : formData
        );
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return; // galti hai to save mat karo
        }

        setSaving(true);
        setActionError("");
        try {
            const sectionData = { ...formData };

            // Baaki fields sahi hain, ab hi file Storage pe bhejo
            if (hasNewResume) {
                sectionData.resume = await uploadResume(companyCode, id, resumeFile);
            }

            const result = await updateEmployeeSection(
                companyCode,
                id,
                sectionId,
                sectionData
            );

            // Email/mobile kisi aur employee ka nikla — us field par error dikhao
            if (!result.success) {
                setErrors((prev) => ({ ...prev, [result.field]: result.message }));
                return;
            }

            setEmployee((prev) => ({ ...prev, [sectionId]: result.data }));
            setEditingSection(null);
            setResumeFile(null);
            setErrors({});
        } catch (error) {
            console.error(error);
            // Edit mode khula rehta hai taaki user ki bhari hui value na khoye
            setActionError("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Deactivate karne par employee login nahi kar payega (authService Active hi maanta hai).
    // Isliye ye normal edit form ka hissa nahi hai — alag button + confirm.
    const toggleEmployeeStatus = async () => {
        const currentStatus = employee.account?.status || "Active";
        const nextStatus =
            currentStatus.toLowerCase() === "active" ? "Inactive" : "Active";

        const name = employee.personalInfo?.name || employee.employmentInfo?.employeeId || "this employee";

        const message =
            nextStatus === "Inactive"
                ? `Deactivate ${name}? They will no longer be able to log in to the portal.`
                : `Activate ${name}? They will be able to log in again.`;

        if (!window.confirm(message)) return;

        setStatusUpdating(true);
        setActionError("");
        try {
            // account node poora replace hota hai, isliye baaki fields saath bhejna zaroori hai
            const nextAccount = { ...employee.account, status: nextStatus };

            await updateEmployee(companyCode, id, { account: nextAccount });
            setEmployee((prev) => ({ ...prev, account: nextAccount }));
        } catch (error) {
            console.error("Failed to update status:", error);
            setActionError("Status update failed. Please try again.");
        } finally {
            setStatusUpdating(false);
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
                { key: "alternateMobile", label: "Alternate Mobile" },
                // Onboarding "Other" bhejta hai, Add Employee form "Prefer not to say" —
                // dono rakhe hain taaki edit par kisi ki value na ude
                { key: "gender", label: "Gender", type:"select" , options:["Male", "Female", "Other", "Prefer not to say"] },
                { key: "dob", label: "DOB", type:"date" },
                { key: "fatherName", label: "Father Name" },
                { key: "motherName", label: "Mother Name" },
                { key: "maritalStatus", label: "Marital Status", type: "select", options: ["Single", "Married", "Divorced", "Widowed"] },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "pincode", label: "Pincode" },
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
                { key: "department", label: "Department", type: "select" },
                { key: "designation", label: "Designation", type: "select" },
                { key: "joiningDate", label: "Joining Date", type: "date" },
                { key: "employeeType", label: "Employee Type" },
            ],
        },
        // Salary ab sidebar ke apne module se — yahan card nahi dikhta
        // {
        //     section: "salary",
        //     icon: WalletCards,
        //     title: "Salary Information",
        //     accent: "bg-emerald-50 text-emerald-600",
        //     custom: true,
        // },
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
                { key: "accountHolderName", label: "Account Holder Name" },
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
                { key: "resume", label: "Resume", type: "file" },
                { key: "aadhaar", label: "Aadhaar Number", masked: true },
                { key: "pan", label: "PAN Number", masked: true },
                { key: "uan", label: "UAN Number", masked: true },
                { key: "esic", label: "ESIC Number", masked: true },
            ],
        },
    ];
 

    return (
        <div className="w-full space-y-6">

                <button
                    type="button"
                    onClick={() => navigate("/employees")}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Employees
                </button>

                {actionError && (
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{actionError}</span>
                        <button
                            type="button"
                            onClick={() => setActionError("")}
                            aria-label="Dismiss error"
                            className="shrink-0 rounded p-1 transition hover:bg-red-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

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

                                    <button
                                        type="button"
                                        onClick={toggleEmployeeStatus}
                                        disabled={statusUpdating}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Power className="h-3.5 w-3.5" />
                                        {statusUpdating
                                            ? "Updating…"
                                            : isActive
                                            ? "Deactivate"
                                            : "Activate"}
                                    </button>
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

                                {/* Salary ab sidebar ke apne module se dikhti hai.
                                    Yahan ka summary card comment kar diya gaya hai —
                                    wapas chahiye to `salary` section (sections array),
                                    salary state, loadSalary aur formatAmount bhi uncomment karna.

                                {isOpen && section.custom === true && (
                                    <div className="px-6 py-4">
                                        {salary === undefined ? (
                                            <p className="text-sm text-gray-400">
                                                Loading salary…
                                            </p>
                                        ) : salary === null ? (
                                            <div className="flex flex-col items-start gap-3">
                                                <p className="text-sm text-gray-500">
                                                    Is employee ki salary abhi assign nahi hui hai.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/salarydashboard/salary/create/${id}`
                                                        )
                                                    }
                                                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                                                >
                                                    Assign Salary
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                                    {[
                                                        { label: "Basic", value: salary.earnings?.basic },
                                                        { label: "Gross Salary", value: salary.grossSalary },
                                                        { label: "Total Deduction", value: salary.totalDeduction },
                                                        { label: "Net Salary", value: salary.netSalary },
                                                    ].map((item) => (
                                                        <div key={item.label} className="flex flex-col gap-1.5">
                                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                                {item.label}
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-800">
                                                                {formatAmount(item.value)}
                                                            </p>
                                                        </div>
                                                    ))}

                                                    <div className="flex flex-col gap-1.5">
                                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                            Effective From
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-800">
                                                            {salary.effectiveFrom || (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5">
                                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                            Salary Status
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-800">
                                                            {salary.status || (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/salarydashboard/salary/edit/${id}`
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" /> Manage Salary
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                */}

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
                                                            {field.type === "file" ? (
                                                                <>
                                                                    <input
                                                                        type="file"
                                                                        accept="application/pdf"
                                                                        onChange={handleResumeChange}
                                                                        className={`w-full rounded-lg border bg-white text-sm text-gray-600 outline-none transition file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-gray-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100 ${
                                                                            errors[field.key]
                                                                                ? "border-red-400"
                                                                                : "border-gray-200"
                                                                        }`}
                                                                    />
                                                                    <p className="truncate text-xs text-gray-400">
                                                                        {resumeFile
                                                                            ? resumeFile.name
                                                                            : formData[field.key]
                                                                            ? "Ek resume pehle se uploaded hai — nayi PDF chunne par wo replace ho jayegi."
                                                                            : "Sirf PDF, 5 MB tak."}
                                                                    </p>
                                                                </>
                                                            ) : field.type === "select" ? (
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
                                                                    field.type === "file" &&
                                                                    /^https?:\/\//.test(value) ? (
                                                                        <a
                                                                            href={value}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-indigo-600 hover:underline"
                                                                        >
                                                                            View Resume (PDF)
                                                                        </a>
                                                                    ) : isHidden ? (
                                                                        maskValue(value)
                                                                    ) : (
                                                                        value
                                                                    )
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
 
