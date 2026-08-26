import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEmployeeById,
  updateEmployee,
  updateEmployeeRole,
  updateEmployeeSection,
  uploadResume,
} from "../services/EmployeeService";
// import { getSalary } from "../services/SalaryService";
import {
  getDepartments,
  releaseManagerFromDepartments,
} from "../services/departmentService";
import { validateField } from "../utils/validation/validateField";
import { ROLE } from "../utils/attendance/attendanceConstants";
import { ROLE_LABELS } from "../utils/permissions/permissionConstants";
import {
  canEditEmployeeRole,
  getAssignableRoles,
} from "../utils/permissions/roleAssignment";
import { rules } from "../utils/validation/rules";
import useRoleAccess from "../hooks/useRoleAccess";
import useManagerScope from "../hooks/useManagerScope";
import Loader from "../components/common/Loader";
import EditRoleModal from "../components/employees/EditRoleModal";
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Hash,
  Heart,
  IdCard,
  KeyRound,
  Landmark,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  ShieldCheck,
  Smartphone,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Role Badge
|--------------------------------------------------------------------------
| The portal role as a pill on the Account card. HR and Manager are tinted
| because they carry authority somebody reading this card is looking for;
| Employee is the neutral majority. Owner is here for completeness only - it
| is never stored on an employee record.
*/

const ROLE_BADGES = {
  [ROLE.OWNER]: "bg-violet-50 text-violet-700",
  [ROLE.HR]: "bg-indigo-50 text-indigo-700",
  [ROLE.MANAGER]: "bg-amber-50 text-amber-700",
  [ROLE.EMPLOYEE]: "bg-slate-100 text-slate-600",
};

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

    /*
    |----------------------------------------------------------------------
    | Role Editing
    |----------------------------------------------------------------------
    | Two separate questions, the same way the rest of the app asks them.
    |
    | `employees.editRole` says whether the signed in role has the right at
    | all, and is the owner's to withhold from Settings like any other. The
    | department scope then says whose record they may use it on: a manager is
    | narrowed to the employees of the departments they run, and to the roles
    | they could hand out - which `roleAssignment` answers, not this page.
    */
    const { canAccessSection } = useRoleAccess();

    const { scope, loading: scopeLoading } = useManagerScope();

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [roleSaving, setRoleSaving] = useState(false);
    const [roleError, setRoleError] = useState("");

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

    const [revealed, setRevealed] = useState({});

    // Overview sab cards dikhata hai, baaki tabs sirf apna section
    const [activeTab, setActiveTab] = useState("overview");

    // DOB picker mein future date select hi na ho
    const today = new Date().toISOString().split("T")[0];

    const toggleReveal = (fieldId) =>
        setRevealed((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));

    // "2003-10-30" ko "30 Oct 2003" bana do — parse na ho to value jaisi ki waisi
    const formatDate = (value) => {
        if (!value) return value;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

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
                /*
                | A record saved before roles existed carries none. It is read
                | as an employee rather than left blank, so the card shows
                | what the portal actually treats them as.
                */
                role: data.account?.role || ROLE.EMPLOYEE,
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

            // Ek deactivate hua manager ab bhi department node par likha rehta
            // hai. Us department ka koi approver nahi bachta, par screen par
            // wo "managed" hi dikhta hai — isliye deactivate ke saath uske
            // departments chhod diye jaate hain aur owner unhe dobara assign
            // kar sakta hai.
            if (
                nextStatus === "Inactive" &&
                employee.account?.role === ROLE.MANAGER
            ) {
                await releaseManagerFromDepartments(
                    companyCode,
                    employee.employmentInfo?.employeeId || id
                );
            }

            setEmployee((prev) => ({ ...prev, account: nextAccount }));
        } catch (error) {
            console.error("Failed to update status:", error);
            setActionError("Status update failed. Please try again.");
        } finally {
            setStatusUpdating(false);
        }
    };

    /*
    | The role change itself. Like the status toggle above it, this is not part
    | of a normal section edit: it decides what the portal lets somebody do
    | rather than what their record says, so it has its own dialog and its own
    | write, and the account node's username, password and status are left
    | exactly where they were.
    |
    | The service releases the departments of a demoted manager and re-checks
    | the rules before it writes, so a refusal is reported here rather than
    | assumed away.
    */
    const saveRole = async (nextRole) => {

        setRoleSaving(true);
        setRoleError("");

        try {

            const result = await updateEmployeeRole(
                companyCode,
                id,
                nextRole,
                scope.role
            );

            // The dialog stays open on a refusal, so the reason is read beside
            // the choice that caused it rather than after it has been lost.
            if (!result.success) {
                setRoleError(result.message || "Failed to update the role.");
                return;
            }

            setEmployee((prev) => ({
                ...prev,
                account: { ...prev.account, role: nextRole },
            }));

            setRoleModalOpen(false);

            // Saved, but their old departments still point at them. The banner
            // is the only place that would otherwise say so.
            if (result.warning) {
                setActionError(result.warning);
            }

        } catch (error) {
            console.error("Failed to update role:", error);
            setRoleError("Failed to update the role. Please try again.");
        } finally {
            setRoleSaving(false);
        }

    };

    // Load fail hua ya employee mila nahi → error + Retry (infinite spinner se bachne ke liye)
    if (loadError) {
        return (
            <div className="p-0 sm:p-2">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center shadow-sm sm:px-6 sm:py-16">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <AlertTriangle className="h-7 w-7" />
                    </div>

                    <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                        Failed to Load
                    </h3>

                    <p className="mt-2 max-w-sm text-sm text-slate-500">
                        {loadError}
                    </p>

                    <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                        <button
                            onClick={() => navigate("/employees")}
                            className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                        >
                            Back to Employees
                        </button>

                        <button
                            onClick={loadEmployee}
                            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                            Retry
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="p-0 sm:p-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 shadow-sm sm:px-6">
                    <Loader text="Loading employee..." />
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

    /*
    | The roles this user may hand out, and whether this particular record is
    | one of theirs to change. The scope has to have finished loading first:
    | a manager's departments arrive a moment after the page does, and offering
    | the pencil before then would put it on a record they may not touch.
    */
    const assignableRoles = canAccessSection("employees.editRole")
        ? getAssignableRoles(scope.role)
        : [];

    const canEditRole =
        !scopeLoading &&
        assignableRoles.length > 0 &&
        canEditEmployeeRole(scope, {
            employeeId: employee.employmentInfo?.employeeId || id,
            department: employee.employmentInfo?.department,
            role: employee.account?.role,
        });

    // Each card: section = key inside employee, fields carry the editable key.
    // readOnly fields are shown but never turned into inputs.
    const sections = [
        {
            section: "personalInfo",
            icon: UserRound,
            title: "Personal Information",
            tabLabel: "Personal",
            subtitle: "Identity, contact and address details.",
            accent: "bg-blue-50 text-blue-600",
            fields: [
                { key: "name", label: "Full Name", icon: UserRound },
                { key: "email", label: "Email", icon: Mail },
                { key: "mobile", label: "Mobile", icon: Phone },
                { key: "alternateMobile", label: "Alternate Mobile", icon: Smartphone },
                // Onboarding "Other" bhejta hai, Add Employee form "Prefer not to say" —
                // dono rakhe hain taaki edit par kisi ki value na ude
                { key: "gender", label: "Gender", icon: Users, type:"select" , options:["Male", "Female", "Other", "Prefer not to say"] },
                { key: "dob", label: "Date of Birth", icon: Calendar, type:"date" },
                { key: "fatherName", label: "Father Name", icon: UserRound },
                { key: "motherName", label: "Mother Name", icon: UserRound },
                { key: "maritalStatus", label: "Marital Status", icon: Heart, type: "select", options: ["Single", "Married", "Divorced", "Widowed"] },
                { key: "city", label: "City", icon: MapPin },
                { key: "state", label: "State", icon: MapPin },
                { key: "pincode", label: "Pincode", icon: Hash },
                { key: "address", label: "Address", icon: MapPin, full: true },
            ],
        },
        {
            section: "employmentInfo",
            icon: BriefcaseBusiness,
            title: "Employment Information",
            tabLabel: "Employment",
            subtitle: "Role, department and joining details.",
            accent: "bg-violet-50 text-violet-600",
            fields: [
                { key: "employeeId", label: "Employee ID", icon: IdCard, readOnly: true },
                { key: "department", label: "Department", icon: Building2, type: "select" },
                { key: "designation", label: "Designation", icon: Briefcase, type: "select" },
                { key: "joiningDate", label: "Joining Date", icon: CalendarDays, type: "date" },
                { key: "employeeType", label: "Employee Type", icon: Clock },
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
            tabLabel: "Account",
            subtitle: "Portal login credentials and access status.",
            accent: "bg-amber-50 text-amber-600",
            // Poora section sirf dekhne ke liye — koi Edit button nahi
            readOnly: true,
            fields: [
                { key: "username", label: "Username", icon: AtSign },
                { key: "password", label: "Password", icon: KeyRound, masked: true },
                { key: "status", label: "Status", icon: ShieldCheck, pill: true },
                /*
                | The one thing on this card that is not a credential. The
                | username and the password are what somebody signs in with and
                | stay view only; the role is what the portal lets them do once
                | they are in, and is changed from the pencil on this row - the
                | same slot the masked fields put their reveal button in.
                */
                {
                    key: "role",
                    label: "Role",
                    icon: UserCog,
                    type: "role",
                    action: canEditRole
                        ? {
                            label: "Change role",
                            onClick: () => {
                                setRoleError("");
                                setRoleModalOpen(true);
                            },
                        }
                        : null,
                },
            ],
        },
        {
            section: "bankInfo",
            icon: Landmark,
            title: "Bank Information",
            tabLabel: "Bank",
            subtitle: "Account used for salary disbursement.",
            accent: "bg-sky-50 text-sky-600",
            fields: [
                { key: "accountHolderName", label: "Account Holder Name", icon: UserRound },
                { key: "bankName", label: "Bank Name", icon: Landmark },
                { key: "branch", label: "Branch", icon: MapPin },
                { key: "accountNumber", label: "Account Number", icon: CreditCard, masked: true },
                { key: "ifsc", label: "IFSC Code", icon: Hash },
            ],
        },
        {
            section: "documents",
            icon: FileText,
            title: "Documents",
            tabLabel: "Documents",
            subtitle: "Statutory numbers and uploaded resume.",
            accent: "bg-rose-50 text-rose-600",
            fields: [
                { key: "resume", label: "Resume", icon: FileText, type: "file" },
                { key: "aadhaar", label: "Aadhaar Number", icon: IdCard, masked: true },
                { key: "pan", label: "PAN Number", icon: CreditCard, masked: true },
                { key: "uan", label: "UAN Number", icon: Hash, masked: true },
                { key: "esic", label: "ESIC Number", icon: ShieldCheck, masked: true },
            ],
        },
    ];

    // Overview = saare cards, baaki har tab apna ek section
    const tabs = [
        { id: "overview", label: "Overview", icon: LayoutGrid },
        ...sections.map((item) => ({
            id: item.section,
            label: item.tabLabel,
            icon: item.icon,
        })),
    ];

    const visibleSections = sections.filter((item) => item.section === activeTab);

    // Overview do columns me batta hai: chhote summary cards right sidebar me,
    // lambe detail cards left main column me.
    const SIDEBAR_SECTIONS = ["employmentInfo", "account"];

    const overviewSide = sections.filter((item) =>
        SIDEBAR_SECTIONS.includes(item.section)
    );

    const overviewMain = sections.filter(
        (item) => !SIDEBAR_SECTIONS.includes(item.section)
    );
 

    // Header ke right side ki quick info — icon tile + label + value
    const metaItems = [
        {
            icon: Phone,
            label: "Mobile",
            value: employee.personalInfo?.mobile,
        },
        {
            icon: Mail,
            label: "Email",
            value: employee.personalInfo?.email,
        },
        {
            icon: CalendarDays,
            label: "Joined on",
            value: formatDate(employee.employmentInfo?.joiningDate),
        },
    ];

    // Naam ke neeche dikhne wale chips — khaali value wale chip nahi bante
    const headerChips = [
        {
            label: employee.employmentInfo?.employeeId,
            className: "bg-blue-50 text-blue-700",
        },
        {
            label: employee.employmentInfo?.designation,
            className: "bg-slate-100 text-slate-600",
        },
        {
            label: employee.employmentInfo?.department,
            className: "bg-slate-100 text-slate-600",
        },
    ].filter((chip) => chip.label);

    return (
        <div className="p-0 space-y-4 sm:p-2 sm:space-y-5">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5">

                    <button
                        type="button"
                        onClick={() => navigate("/employees")}
                        className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        {/* Short label keeps this on the same row as the status
                            button on a phone. */}
                        <span className="sm:hidden">Back</span>
                        <span className="hidden sm:inline">Back to Employees</span>
                    </button>

                    <button
                        type="button"
                        onClick={toggleEmployeeStatus}
                        disabled={statusUpdating}
                        className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isActive
                                ? "border-rose-200 text-rose-600 hover:bg-rose-50 focus:ring-rose-300"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-300"
                        }`}
                    >
                        <Power className="h-4 w-4" />
                        {statusUpdating
                            ? "Updating…"
                            : isActive
                            ? "Deactivate"
                            : "Activate"}
                    </button>

                </div>

                {actionError && (
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

                        <span className="flex min-w-0 items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="font-medium">{actionError}</span>
                        </span>

                        <button
                            type="button"
                            onClick={() => setActionError("")}
                            aria-label="Dismiss error"
                            className="shrink-0 cursor-pointer rounded-lg p-1 transition-colors hover:bg-red-100"
                        >
                            <X className="h-4 w-4" />
                        </button>

                    </div>
                )}

                {/* Profile header + tabs */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 xl:flex-row xl:items-center xl:justify-between">

                        <div className="flex min-w-0 flex-row items-center gap-4 sm:items-center">

                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-md shadow-blue-600/25 sm:h-20 sm:w-20 sm:text-2xl">
                                {initials}
                            </div>

                            <div className="min-w-0">

                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                                    <h1 className="min-w-0 truncate text-lg font-bold text-slate-900 sm:text-2xl">
                                        {employee.personalInfo?.name || "Unnamed Employee"}
                                    </h1>

                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                            isActive
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-rose-50 text-rose-700"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                isActive ? "bg-emerald-500" : "bg-rose-500"
                                            }`}
                                        />
                                        {status}
                                    </span>

                                </div>

                                <div className="mt-2.5 flex flex-wrap items-center gap-2">

                                    {headerChips.map((chip) => (
                                        <span
                                            key={chip.label}
                                            className={`inline-flex max-w-full items-center truncate rounded-lg px-2.5 py-1 text-xs font-semibold ${chip.className}`}
                                        >
                                            {chip.label}
                                        </span>
                                    ))}

                                </div>

                            </div>

                        </div>

                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">

                            {metaItems.map((item) => {
                                const MetaIcon = item.icon;

                                return (
                                    <div
                                        key={item.label}
                                        className="flex min-w-0 items-center gap-3"
                                    >

                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <MetaIcon className="h-4 w-4" />
                                        </span>

                                        <div className="min-w-0">

                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {item.value || (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </p>

                                            <p className="truncate text-xs text-slate-400">
                                                {item.label}
                                            </p>

                                        </div>

                                    </div>
                                );
                            })}

                        </div>

                    </div>

                    {/* Tabs — scrollbar app ke baaki hisson ki tarah chhupa hua hai */}
                    <div className="hide-scrollbar overflow-x-auto border-t border-slate-200">

                        <nav className="flex min-w-max items-center gap-1 px-3 sm:px-5">

                            {tabs.map((tab) => {
                                const TabIcon = tab.icon;
                                const isTabActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        aria-current={isTabActive ? "page" : undefined}
                                        className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                                            isTabActive
                                                ? "border-blue-600 text-blue-600"
                                                : "border-transparent text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        <TabIcon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}

                        </nav>

                    </div>

                </div>

                {/* Cards */}
                {activeTab === "overview" ? (

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">

                        <div className="space-y-5 lg:col-span-2">
                            {overviewMain.map((item) => renderSectionCard(item, "main"))}
                        </div>

                        {/* Sticky jaan-boojh kar nahi hai — chhoti screen par pinned
                            column scrollport se lamba ho jata tha aur neeche wala
                            card kabhi poora dikhta hi nahi tha. */}
                        <div className="space-y-5">
                            {overviewSide.map((item) => renderSectionCard(item, "side"))}
                        </div>

                    </div>

                ) : (

                    <div className="space-y-5">
                        {visibleSections.map((item) => renderSectionCard(item, "full"))}
                    </div>

                )}

                {/*
                | Keyed on the stored role, so once a change is saved the
                | dialog remounts and reopens on what they are now rather than
                | on the selection it was first mounted with.
                */}
                <EditRoleModal
                    key={employee.account?.role}
                    open={roleModalOpen}
                    employee={{
                        name: employee.personalInfo?.name,
                        employeeId: employee.employmentInfo?.employeeId || id,
                        role: employee.account?.role,
                    }}
                    actorRole={scope.role}
                    roles={assignableRoles}
                    saving={roleSaving}
                    error={roleError}
                    onClose={() => {
                        setRoleModalOpen(false);
                        setRoleError("");
                    }}
                    onSave={saveRole}
                />

        </div>
    );

    // Ek section ka card. `variant` batata hai card kitni jagah me baitha hai,
    // usi hisaab se andar ke fields kitne columns me bantenge.
    function renderSectionCard(section, variant) {

        const isEditing = editingSection === section.section;
        const Icon = section.icon;

        // Sidebar ke cards patle hote hain — wahan fields ek hi column me theek lagte hain.
        const layout =
            variant === "side"
                ? { cols: "sm:grid-cols-2 lg:grid-cols-1", span: "sm:col-span-2 lg:col-span-1" }
                : isEditing
                ? { cols: "sm:grid-cols-2", span: "sm:col-span-2" }
                : variant === "main"
                ? { cols: "sm:grid-cols-2 2xl:grid-cols-3", span: "sm:col-span-2 2xl:col-span-3" }
                : { cols: "sm:grid-cols-2 lg:grid-cols-3", span: "sm:col-span-2 lg:col-span-3" };

        const gridCols = layout.cols;
        const fullSpan = layout.span;

        return (
                            <section
                                key={section.section}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                            >

                                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">

                                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">

                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${section.accent}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </span>

                                        <div className="min-w-0">

                                            <h2 className="truncate text-base font-semibold text-slate-900">
                                                {section.title}
                                            </h2>

                                            {/* Sidebar patla hai — wahan subtitle jagah khaata hai */}
                                            {variant !== "side" && (
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {section.subtitle}
                                                </p>
                                            )}

                                        </div>

                                    </div>

                                    {section.readOnly ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
                                            <Lock className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">View Only</span>
                                        </span>
                                    ) : (
                                        !isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => startEdit(section.section)}
                                                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                        )
                                    )}

                                </div>

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

                                <div>
                                        <div
                                            className={`grid grid-cols-1 gap-x-6 px-4 sm:px-6 ${gridCols} ${
                                                isEditing ? "gap-y-5 py-6" : "pb-0 pt-1"
                                            }`}
                                        >
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
                                            const FieldIcon = field.icon;

                                            return (
                                                <div
                                                    key={field.key}
                                                    className={`flex min-w-0 ${
                                                        editable
                                                            ? "flex-col gap-2"
                                                            : "items-start gap-3 border-b border-slate-100 py-3.5"
                                                    } ${field.full ? fullSpan : ""}`}
                                                >

                                                    {!editable && FieldIcon && (
                                                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                                            <FieldIcon className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}

                                                    <div className="flex min-w-0 flex-1 flex-col gap-1">

                                                    <p className="truncate text-xs font-medium text-slate-400">
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
                                                                        className={`w-full cursor-pointer rounded-xl border bg-white text-sm text-slate-600 outline-none transition file:mr-3 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-slate-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-blue-50 hover:file:text-blue-600 ${
                                                                            errors[field.key]
                                                                                ? "border-red-400"
                                                                                : "border-slate-200"
                                                                        }`}
                                                                    />
                                                                    <p className="truncate text-xs text-slate-400">
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
                                                                    className={`w-full cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-base text-slate-800 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm ${
                                                                        errors[field.key]
                                                                            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                                                                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
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
                                                                    className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 sm:text-sm ${
                                                                        errors[field.key]
                                                                            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                                                                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                                                    }`}
                                                                />
                                                            )}
                                                            {errors[field.key] && (
                                                                <p className="text-xs font-medium text-red-500">
                                                                    {errors[field.key]}
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">
                                                            <p
                                                                className={`min-w-0 wrap-break-word text-sm font-semibold text-slate-900 ${
                                                                    field.masked && value && isHidden
                                                                        ? "tracking-widest"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {value ? (
                                                                    field.type === "file" &&
                                                                    /^https?:\/\//.test(value) ? (
                                                                        <a
                                                                            href={value}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                                                                        >
                                                                            <FileText className="h-3.5 w-3.5" />
                                                                            View Resume (PDF)
                                                                        </a>
                                                                    ) : isHidden ? (
                                                                        maskValue(value)
                                                                    ) : field.type === "role" ? (
                                                                        <span
                                                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                                ROLE_BADGES[
                                                                                    String(value).toLowerCase()
                                                                                ] || ROLE_BADGES[ROLE.EMPLOYEE]
                                                                            }`}
                                                                        >
                                                                            {ROLE_LABELS[
                                                                                String(value).toLowerCase()
                                                                            ] || value}
                                                                        </span>
                                                                    ) : field.pill ? (
                                                                        <span
                                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                                String(value).toLowerCase() === "active"
                                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                                    : "bg-rose-50 text-rose-700"
                                                                            }`}
                                                                        >
                                                                            {value}
                                                                        </span>
                                                                    ) : field.type === "date" ? (
                                                                        formatDate(value)
                                                                    ) : (
                                                                        value
                                                                    )
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </p>
                                                            {field.masked && value && (
                                                                <button
                                                                    onClick={() => toggleReveal(fieldId)}
                                                                    aria-label={isHidden ? "Show value" : "Hide value"}
                                                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                                                >
                                                                    {isHidden ? (
                                                                        <Eye className="h-4 w-4" />
                                                                    ) : (
                                                                        <EyeOff className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                            {/*
                                                            | A field on a view only card that can still be
                                                            | acted on, in the same slot the reveal button
                                                            | uses. Only the Role field carries one, and only
                                                            | for somebody entitled to change it.
                                                            */}
                                                            {field.action && (
                                                                <button
                                                                    onClick={field.action.onClick}
                                                                    title={field.action.label}
                                                                    aria-label={field.action.label}
                                                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    </div>

                                                </div>
                                            );
                                        })}
                                        </div>

                                    
                                        {!section.readOnly && isEditing && (
                                        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">

                                            <button
                                                onClick={cancelEdit}
                                                disabled={saving}
                                                className="w-full cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-200/60 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                onClick={() => saveSection(section.section)}
                                                disabled={saving}
                                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                                            >
                                                {saving ? "Saving…" : "Save Changes"}
                                            </button>

                                        </div>
                                        )}
                                </div>
                            </section>
        );
    }
}
 
export default EmployeesDetails;
 
