import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Landmark,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { toast } from "react-toastify";

import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import useResignations from "../hooks/useResignations";
import Loader from "../components/common/Loader";
import ResignationModal from "../components/resignation/ResignationModal";
import { createResignation } from "../services/resignation/resignationService";
import { toEmployeeSnapshot } from "../utils/resignation/resignationUtils";
import {
  subscribeEmployeeById,
  updateEmployeeSection,
} from "../services/EmployeeService";
import { getUserRole } from "../utils/attendance/attendanceRequestUtils";
import { getInitials, getUserName } from "../utils/user";
import { rules } from "../utils/validation/rules";
import { validateField } from "../utils/validation/validateField";

/*
|--------------------------------------------------------------------------
| Profile
|--------------------------------------------------------------------------
| The signed in user's own record. Only Personal Information is editable —
| employment, account, bank and documents stay read only, those belong to HR.
|
| This is deliberately not the Employees details page: that screen is the HR
| view of somebody else and is mounted behind `employees.details`, so a role
| without that permission could never reach its own information through it.
| Every role can open its own profile, so this route carries no permission.
|
| The owner has no employee record at all — their name, mobile and address
| live on the company itself, so they get their own two cards (Owner and
| Company information) instead of the employee ones, and both are editable.
| Two fields there stay read only for structural reasons, not HR ones: the
| email is the Firebase Auth login and the company code is the database path
| every record in this company hangs off.
|
| Look EmployeesDetails se liya gaya hai — dono ek hi cheez dikhate hain
| (ek record, section-wise), isliye card, hero, field row aur edit form wahi
| hain. Farq sirf itna: yahan ek waqt me ek hi card edit hota hai.
|--------------------------------------------------------------------------
*/

// Keep the last 4 characters visible, mask the rest
const maskValue = (value) => {
  const text = String(value);
  return text.length <= 4
    ? "X".repeat(text.length)
    : "X".repeat(text.length - 4) + text.slice(-4);
};

/*
| Lambe cards do-column main area me, chhote right column me — bilkul
| EmployeesDetails ke overview jaisa. Dono taraf kuch na ho to layout
| apne aap single column ho jata hai (owner ke dono card yahin hain,
| isliye uska page poori chaudai me ek column banta hai).
*/
const MAIN_SECTIONS = [
  "personalInfo",
  "bankInfo",
  "documents",
  "ownerInfo",
  "companyInfo",
];

/*
| Personal Information card — yahi ek section user khud badal sakta hai,
| isliye label ke saath uski DB key bhi rakhi hai (form isi se banta hai).
|
| Gender ke options jaan-boojh kar rules.gender ke pattern jitne hi hain.
| Aisi value dikha dete jo rule accept na kare (jaise onboarding ka "Other")
| to user use chun leta aur Save har baar reject ho jaata.
*/
const PERSONAL_FIELDS = [
  { key: "name", label: "Name", icon: UserRound },
  { key: "email", label: "Email", icon: Mail },
  { key: "mobile", label: "Mobile", icon: Phone },
  { key: "alternateMobile", label: "Alternate Mobile", icon: Smartphone },
  {
    key: "gender",
    label: "Gender",
    icon: Users,
    type: "select",
    options: ["Male", "Female", "Prefer not to say"],
  },
  { key: "dob", label: "DOB", icon: Calendar, type: "date" },
  { key: "fatherName", label: "Father Name", icon: UserRound },
  { key: "motherName", label: "Mother Name", icon: UserRound },
  {
    key: "maritalStatus",
    label: "Marital Status",
    icon: Heart,
    type: "select",
    options: ["Single", "Married", "Divorced", "Widowed"],
  },
  { key: "city", label: "City", icon: MapPin },
  { key: "state", label: "State", icon: MapPin },
  { key: "pincode", label: "Pincode", icon: Hash },
  { key: "address", label: "Address", icon: MapPin, full: true },
];

function Profile() {
  const { currentUser, company, updateCompanyProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Drawer bhejta hai ki user kis page se aaya tha; direct URL par history se kaam chalega.
  const from = location.state?.from;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revealed, setRevealed] = useState({});

  /*
  | Ek waqt me ek hi card edit hota hai, isliye edit state ek boolean ki jagah
  | us card ki id rakhti hai — owner ke paas do editable card hain (owner aur
  | company information) aur dono ek hi form machinery use karte hain.
  */
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Save fail hone par upar dikhne wala banner (alert ki jagah)
  const [actionError, setActionError] = useState("");

  /*
  | Resignation. The button lives here rather than only on the exit module's
  | own page because this is where somebody goes to look at their own record,
  | and giving notice is a thing you do about yourself.
  |
  | The modal is opened in place rather than navigating away: the form is
  | filled almost entirely from the record already on this screen, so sending
  | the user to another page first would be a step that shows them nothing
  | new.
  */
  const [resignOpen, setResignOpen] = useState(false);
  const [resigning, setResigning] = useState(false);

  const { canAccessSection } = useRoleAccess();

  const { activeResignation, reload: reloadResignations } = useResignations();

  const companyCode = company?.companyCode || localStorage.getItem("companyCode");

  const role = getUserRole(currentUser);

  // Owner ka data company details me hai, employees node me nahi
  const isOwner = role === "owner";

  // Login ke waqt record isi key (uppercase employee id) se aaya tha
  const employeeId =
    currentUser?.account?.username ||
    currentUser?.employmentInfo?.employeeId ||
    "";

  /*
  | localStorage ka currentUser login ke waqt ka snapshot hai. HR koi detail
  | badle to woh yahan purani dikhegi, isliye record Firebase se padha jaata
  | hai — read fail ho to snapshot hi dikha do, page khaali chhodne se behtar
  | hai.
  |
  | Ab ek baar ka read nahi, listener hai: HR doosre tab ya doosre device par
  | is employee ki detail badle to Profile bina refresh ke badal jaata hai.
  | Sirf apna record suna jaata hai (subscribeEmployeeById) — Employee role
  | ke browser mein poori company ki list kabhi nahi aati.
  |
  | Edit chal raha ho tab bhi safe hai: startEdit form ki alag copy banata
  | hai, isliye live update adhoora type kiya hua nahi mitata.
  */
  useEffect(() => {
    let cancelled = false;

    if (!employeeId || !companyCode) {
      // Owner — uska koi employee record hota hi nahi. Microtask mein, taaki
      // effect ke andar seedha setState na ho — pehle bhi ye async load()
      // ke andar hi hota tha.
      Promise.resolve().then(() => {
        if (cancelled) return;
        setEmployee(null);
        setLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = subscribeEmployeeById(
      companyCode,
      employeeId,
      (data) => {
        setEmployee(data || currentUser);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load profile:", error);
        setEmployee(currentUser);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [companyCode, employeeId, currentUser]);

  const toggleReveal = (fieldId) =>
    setRevealed((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));

  // DOB picker me future date select hi na ho
  const today = new Date().toISOString().split("T")[0];

  // Back wahi page kholta hai jahan se profile khola gaya tha
  const handleBack = () => {
    if (from) {
      navigate(from);
      return;
    }

    navigate(-1);
  };

  // Loader wahi jo baaki pages use karte hain, card ke andar — EmployeesDetails
  // bhi loading state aise hi dikhata hai
  if (loading) {
    return (
      <div className="p-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
          <Loader text="Loading profile..." />
        </div>
      </div>
    );
  }

  /*
  | Owner ke liye company hamesha pehle: company har session restore par DB se
  | fresh padhi jaati hai, jabki currentUser localStorage ka login-time
  | snapshot hai. Save ke turant baad naya naam bhi yahin se dikhta hai.
  */
  const name = isOwner
    ? company?.ownerName || getUserName(currentUser)
    : getUserName(employee || currentUser);

  const initials = getInitials(isOwner ? { name } : employee || currentUser);

  const email = isOwner
    ? company?.email || currentUser?.email || ""
    : employee?.personalInfo?.email || currentUser?.email || "";

  // Owner ka mobile registration ke waqt company details me gaya tha
  const mobile = isOwner
    ? company?.mobile || currentUser?.mobile || ""
    : employee?.personalInfo?.mobile || currentUser?.mobile || "";

  const status = isOwner
    ? company?.status
      ? company.status === "active"
        ? "Active"
        : "Inactive"
      : ""
    : employee?.account?.status || "";

  const isActive = status.toLowerCase() === "active";

  // createdAt epoch milliseconds me store hota hai (createCompany → Date.now())
  const registeredOn = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  // Purane records me kuch fields dusre naam se save hue the — dono padho
  const bank = employee?.bankInfo || {};
  const documents = employee?.documents || {};

  const personal = employee?.personalInfo || {};

  /*
  | Card aur form dono isi object se bharte hain, warna dikhta kuch aur aur
  | edit me aata kuch aur. name/email/mobile me currentUser wala fallback isliye
  | rehta hai ki owner ke paas employee record hota hi nahi.
  */
  const personalValues = {
    ...personal,
    name,
    email,
    mobile,
    address: personal.address || currentUser?.address || "",
  };

  // Employee/HR apna personalInfo card edit karte hain
  const canEditPersonal = Boolean(employee && employeeId && companyCode);

  // Owner apne dono card edit karta hai — dono company details par likhte hain
  const canEditCompany = Boolean(isOwner && companyCode);

  /*
  | Owner ke cards. Jis field me `key` hai wahi edit mode me input banti hai;
  | bina key wali field har haal me sirf padhne ke liye hai:
  |
  |   Email        — Firebase Auth ka login email hai. Sirf DB me badal dene se
  |                  login match karna band kar deta (loginUser dono compare
  |                  karta hai), isliye yahan lock hai.
  |   Company Code — har record ka DB path (companies/<code>/...) isi se banta
  |                  hai, badalna matlab poora data anath ho jaana.
  |   Status       — company active/inactive hona owner ka faisla nahi.
  |   Registered On— registration ka waqt hai, koi setting nahi.
  */
  const ownerSections = [
    {
      id: "ownerInfo",
      icon: UserRound,
      title: "Owner Information",
      subtitle: "Your name and contact details.",
      accent: "bg-blue-50 text-blue-600",
      editable: canEditCompany,
      fields: [
        {
          key: "ownerName",
          label: "Owner Name",
          value: company?.ownerName,
          icon: UserRound,
        },
        {
          key: "mobile",
          label: "Mobile",
          value: company?.mobile,
          icon: Phone,
        },
        {
          label: "Email",
          value: company?.email,
          icon: Mail,
          hint: "Used to sign in — cannot be changed here.",
        },
        {
          label: "Role",
          value: role,
          icon: ShieldCheck,
          capitalize: true,
        },
      ],
    },
    {
      id: "companyInfo",
      icon: Building2,
      title: "Company Information",
      subtitle: "Registered company profile and address.",
      accent: "bg-violet-50 text-violet-600",
      editable: canEditCompany,
      fields: [
        {
          key: "companyName",
          label: "Company Name",
          value: company?.companyName,
          icon: Building2,
        },
        {
          label: "Company Code",
          value: company?.companyCode,
          icon: Hash,
          hint: "Employees use this to sign in — it is permanent.",
        },
        {
          label: "Status",
          value: status,
          icon: BadgeCheck,
          pill: true,
        },
        {
          label: "Registered On",
          value: registeredOn,
          icon: CalendarDays,
        },
        {
          key: "address",
          label: "Address",
          value: company?.address,
          icon: MapPin,
          full: true,
        },
      ],
    },
  ];

  const employeeSections = [
    {
      id: "personalInfo",
      icon: UserRound,
      title: "Personal Information",
      subtitle: "Identity, contact and address details.",
      accent: "bg-blue-50 text-blue-600",
      editable: canEditPersonal,
      fields: PERSONAL_FIELDS.map((field) => ({
        ...field,
        value: personalValues[field.key],
      })),
    },
    {
      id: "employmentInfo",
      icon: BriefcaseBusiness,
      title: "Employment Information",
      subtitle: "Role, department and joining details.",
      accent: "bg-violet-50 text-violet-600",
      fields: [
        {
          label: "Employee ID",
          value: employee?.employmentInfo?.employeeId,
          icon: IdCard,
        },
        {
          label: "Department",
          value: employee?.employmentInfo?.department,
          icon: Building2,
        },
        {
          label: "Designation",
          value: employee?.employmentInfo?.designation,
          icon: Briefcase,
        },
        {
          label: "Joining Date",
          value: employee?.employmentInfo?.joiningDate,
          icon: CalendarDays,
        },
        {
          label: "Employee Type",
          value: employee?.employmentInfo?.employeeType,
          icon: Clock,
        },
      ],
    },
    {
      id: "account",
      icon: BadgeCheck,
      title: "Account Information",
      subtitle: "Portal login and access status.",
      accent: "bg-amber-50 text-amber-600",
      fields: [
        { label: "Username", value: employee?.account?.username, icon: AtSign },
        { label: "Role", value: role, icon: ShieldCheck },
        {
          label: "Status",
          value: employee?.account?.status,
          icon: BadgeCheck,
          pill: true,
        },
      ],
    },
    {
      id: "bankInfo",
      icon: Landmark,
      title: "Bank Information",
      subtitle: "Account used for salary disbursement.",
      accent: "bg-sky-50 text-sky-600",
      fields: [
        {
          label: "Account Holder Name",
          value: bank.accountHolderName,
          icon: UserRound,
        },
        { label: "Bank Name", value: bank.bankName, icon: Landmark },
        { label: "Branch", value: bank.branch || bank.branchName, icon: MapPin },
        {
          label: "Account Number",
          value: bank.accountNumber,
          icon: CreditCard,
          masked: true,
        },
        { label: "IFSC Code", value: bank.ifsc || bank.ifscCode, icon: Hash },
      ],
    },
    {
      id: "documents",
      icon: FileText,
      title: "Documents",
      subtitle: "Statutory numbers and uploaded resume.",
      accent: "bg-rose-50 text-rose-600",
      fields: [
        {
          label: "Aadhaar Number",
          value: documents.aadhaar || documents.aadhaarNumber,
          icon: IdCard,
          masked: true,
        },
        {
          label: "PAN Number",
          value: documents.pan || documents.panNumber,
          icon: CreditCard,
          masked: true,
        },
        {
          label: "UAN Number",
          value: documents.uan || documents.uanNumber,
          icon: Hash,
          masked: true,
        },
        {
          label: "ESIC Number",
          value: documents.esic || documents.esicNumber,
          icon: ShieldCheck,
          masked: true,
        },
        { label: "Resume", value: documents.resume, icon: FileText, type: "file" },
      ],
    },

  ];

  // Bina filter wali list — startEdit isi se draft banata hai, warna jo field
  // abhi khaali hai (aur isliye card se hat gayi hai) woh form me hi nahi aati
  const allSections = isOwner ? ownerSections : employeeSections;

  const sections = allSections
    // Khaali field dash ki tarah dikhane se behtar hai use hata dena — jis
    // employee ka bank/documents bhara hi nahi, uske liye poora section gayab.
    // Edit mode alag baat hai: wahan khaali fields dikhne hi chahiye, warna jo
    // abhi bhare hi nahi hain unhe user kabhi bhar hi nahi payega.
    .map((section) => ({
      ...section,
      fields:
        section.editable && editingSection === section.id
          ? section.fields
          : section.fields.filter(
              (field) => String(field.value ?? "").trim() !== ""
            ),
    }))
    // Editable card hamesha rehta hai — sab fields khaali hon to bhi Edit
    // button chahiye, warna user apna record kabhi bhar hi nahi sakta.
    .filter((section) => section.fields.length > 0 || section.editable);

  const mainSections = sections.filter((section) =>
    MAIN_SECTIONS.includes(section.id)
  );

  const sideSections = sections.filter(
    (section) => !MAIN_SECTIONS.includes(section.id)
  );

  // Ek taraf khaali ho to do column ka matlab hi nahi
  const splitLayout = mainSections.length > 0 && sideSections.length > 0;

  /*
  | Naam ke neeche chips — khaali value wala chip banta hi nahi. Owner ke paas
  | employee id/department hote hi nahi, uski pehchan company code hai.
  */
  const headerChips = (
    isOwner
      ? [
          {
            label: company?.companyCode,
            className: "bg-blue-50 text-blue-700",
          },
          {
            label: role,
            className: "bg-slate-100 capitalize text-slate-600",
          },
        ]
      : [
          {
            label: employee?.employmentInfo?.employeeId,
            className: "bg-blue-50 text-blue-700",
          },
          {
            label: employee?.employmentInfo?.designation,
            className: "bg-slate-100 text-slate-600",
          },
          {
            label: employee?.employmentInfo?.department,
            className: "bg-slate-100 text-slate-600",
          },
          {
            label: role,
            className: "bg-slate-100 capitalize text-slate-600",
          },
        ]
  ).filter((chip) => chip.label);

  // Header ke right side ki quick info — icon tile + value + label
  const metaItems = [
    { icon: Phone, label: "Mobile", value: mobile },
    { icon: Mail, label: "Email", value: email },
    { icon: Building2, label: "Company", value: company?.companyName },
  ];

  return (
    <div className="p-2 space-y-5">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">

        <button
          type="button"
          onClick={handleBack}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Edit button har editable card ke apne header me hai. Ye badge tab
            dikhta hai jab kuch bhi edit karne ko nahi bacha — tabhi user ko
            pata chalta hai ki Edit button dhoondna bekaar hai. */}
        {!canEditPersonal && !canEditCompany && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            View Only
          </span>
        )}

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

      {/* Profile header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md shadow-blue-600/25">
              {initials}
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="min-w-0 truncate text-2xl font-bold text-slate-900">
                  {name}
                </h1>

                {status && (
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
                )}

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

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 xl:gap-6">

            {metaItems.map((item) => {
              const MetaIcon = item.icon;

              return (
                <div key={item.label} className="flex min-w-0 items-center gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MetaIcon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.value || <span className="text-slate-300">—</span>}
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

      </div>

      {/* Cards */}
      {splitLayout ? (

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">

          <div className="space-y-5 lg:col-span-2">
            {mainSections.map((section) => renderSection(section, "main"))}
          </div>

          <div className="space-y-5">
            {sideSections.map((section) => renderSection(section, "side"))}
          </div>

        </div>

      ) : (

        <div className="space-y-5">
          {sections.map((section) => renderSection(section, "main"))}
        </div>

      )}

      {/*
      | The form is filled from `employee` rather than from `currentUser`: the
      | record on this page was re-read from the database on mount, and the
      | signed in user is a snapshot taken at login that HR may have changed
      | since. A resignation routed on a stale department would go to the
      | wrong manager.
      */}
      <ResignationModal
        open={resignOpen}
        employee={toEmployeeSnapshot(employee, currentUser)}
        submitting={resigning}
        onClose={() => setResignOpen(false)}
        onSubmit={submitResignation}
      />

    </div>
  );

  // Ek section ka card. `variant` batata hai card kitni chaudi jagah me
  // baitha hai — patle sidebar me fields ek hi column me theek lagte hain.
  function renderSection(section, variant) {
    const Icon = section.icon;

    const isEditing =
      Boolean(section.editable) && editingSection === section.id;

    const gridCols = variant === "side" ? "" : "sm:grid-cols-2";
    const fullSpan = variant === "side" ? "" : "sm:col-span-2";

    return (
      <section
        key={section.id}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      >

        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">

          <div className="flex min-w-0 flex-1 items-center gap-3">

            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.accent}`}
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

          {/* Dusra card edit ho raha ho to yahan Edit nahi dikhta — do form
              ek saath khulne se user ka pehla draft chupchap chala jaata. */}
          {section.editable && !editingSection && (
            <button
              type="button"
              onClick={() => startEdit(section.id)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 px-3.5 py-2 text-sm font-semibold text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

        </div>

        <div
          className={`grid grid-cols-1 gap-x-6 px-5 sm:px-6 ${gridCols} ${
            isEditing ? "gap-y-5 py-6" : "pb-0 pt-1"
          }`}
        >

          {section.fields.map((field) => {
            const fieldId = `${section.id}.${field.label}`;
            const isHidden = field.masked && !revealed[fieldId];
            const FieldIcon = field.icon;

            /*
            | `key` hi decide karta hai ki field badli ja sakti hai ya nahi.
            | Owner ke cards me kuch fields jaan-boojh kar bina key ke hain
            | (email = login, company code = DB path) — edit mode me wo input
            | nahi, ek locked box banti hain taaki dikhein to sahi, par user
            | unhe badal na sake.
            */
            const isFieldEditing = isEditing && Boolean(field.key);

            return (
              <div
                key={fieldId}
                className={`flex min-w-0 ${
                  isEditing
                    ? "flex-col gap-2"
                    : "items-start gap-3 border-b border-slate-100 py-3.5"
                } ${field.full ? fullSpan : ""}`}
              >

                {!isEditing && FieldIcon && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <FieldIcon className="h-3.5 w-3.5" />
                  </span>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">

                  <p className="truncate text-xs font-medium text-slate-400">
                    {field.label}
                  </p>

                  {isFieldEditing ? (
                    <>
                      {field.type === "select" ? (
                        <select
                          value={formData[field.key] || ""}
                          onChange={(e) =>
                            handleFieldChange(field.key, e.target.value)
                          }
                          className={`w-full cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
                            errors[field.key]
                              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                          }`}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "date" ? "date" : "text"}
                          max={field.key === "dob" ? today : undefined}
                          value={formData[field.key] || ""}
                          onChange={(e) =>
                            handleFieldChange(field.key, e.target.value)
                          }
                          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
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
                  ) : isEditing ? (
                    // Editable card ka wo field jise badla nahi ja sakta —
                    // input jaisi hi jagah leta hai taaki grid tedhi na ho
                    <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500">

                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                      <span className="min-w-0 truncate">
                        {field.value || "—"}
                      </span>

                    </div>
                  ) : (
                  <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">

                    <p
                      className={`min-w-0 wrap-break-word text-sm font-semibold text-slate-900 ${
                        isHidden ? "tracking-widest" : ""
                      } ${field.capitalize ? "capitalize" : ""}`}
                    >
                      {field.type === "file" && /^https?:\/\//.test(field.value) ? (
                        <a
                          href={field.value}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Resume (PDF)
                        </a>
                      ) : isHidden ? (
                        maskValue(field.value)
                      ) : field.pill ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            String(field.value).toLowerCase() === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {field.value}
                        </span>
                      ) : (
                        field.value
                      )}
                    </p>

                    {field.masked && (
                      <button
                        type="button"
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

                  </div>
                  )}

                  {/* Hint sirf edit mode me — wahi jagah hai jahan user ye
                      poochta hai ki is field par input kyun nahi hai */}
                  {isEditing && field.hint && (
                    <p className="text-[11px] text-slate-400">
                      {field.hint}
                    </p>
                  )}

                </div>

              </div>
            );
          })}

        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4">

            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-200/60 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

          </div>
        )}

      </section>
    );
  }

  /*
  | Edit mode ka form us card ke apne data se bharta hai.
  |
  | personalInfo ek exception hai: uska poora node replace hota hai, isliye
  | draft me card ke bahar wali keys bhi saath jaati hain (warna save par woh
  | DB se ud jaatin). Purane records me naam/email/mobile employmentInfo me
  | the — name ka fallback isliye hai.
  */
  function startEdit(sectionId) {
    // Bina filter wali definition — card par se hat chuki khaali fields bhi
    // form me aani chahiye, warna user unhe pehli baar bhar hi nahi payega
    const section = allSections.find((item) => item.id === sectionId);

    if (!section) return;

    const draft =
      section.id === "personalInfo"
        ? {
            ...personalValues,
            name: personal.name || employee?.employmentInfo?.name || "",
          }
        : {};

    // Har editable key form me honi chahiye — jo key hi na ho uski required
    // validation kabhi chalti nahi aur khaali field chupke se save ho jaata.
    section.fields.forEach((field) => {
      if (!field.key) return; // read only field — iska koi input hi nahi
      draft[field.key] = draft[field.key] ?? field.value ?? "";
    });

    setFormData(draft);
    setErrors({});
    setActionError("");
    setEditingSection(section.id);
  }

  function cancelEdit() {
    setEditingSection(null);
    setFormData({});
    setErrors({});
  }

  /*
  | Filing the resignation. On success the user is sent to the exit page
  | rather than left on their profile: the thing they want to see next is the
  | tracker, and this screen has nothing to show about a resignation at all.
  |
  | A refusal is returned to the modal instead of being thrown, so the form
  | stays open with the typed reason intact and the message beside the
  | button.
  */
  async function submitResignation(form) {

    setResigning(true);

    try {

      const result = await createResignation(companyCode, {
        employee: toEmployeeSnapshot(employee, currentUser),
        ...form,
      });

      if (result.success) {

        setResignOpen(false);

        reloadResignations();

        toast.success("Your resignation has been submitted for approval.");

        navigate("/resignation");

      }

      return result;

    } catch (error) {

      console.error("Failed to submit the resignation:", error);

      return {
        success: false,
        message: "The resignation could not be submitted. Please try again.",
      };

    } finally {

      setResigning(false);

    }

  }

  function handleFieldChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Jis field ko user theek kar raha hai, uska error turant hata do
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  async function saveProfile() {
    // Owner ke dono card company details par likhte hain, employee record par nahi
    const isCompanySection =
      editingSection === "ownerInfo" || editingSection === "companyInfo";

    const validationErrors = {};

    Object.keys(formData).forEach((key) => {
      if (!rules[key]) return; // is field ka koi rule nahi → skip

      const value = formData[key];
      const isEmpty = !String(value ?? "").trim();

      // Optional field (rule required nahi) khaali ho to validate mat karo
      if (isEmpty && !rules[key].required) return;

      const error = validateField(
        key,
        value,
        // Teesra argument sirf un rules ke liye hai jo doosri field dekhte hain
        isCompanySection ? formData : { ...employee, personalInfo: formData }
      );

      if (error) validationErrors[key] = error;
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // galti hai to save mat karo
    }

    setSaving(true);
    setActionError("");

    try {
      if (isCompanySection) {
        /*
        | Context wala helper isliye, service nahi: save ke baad company state
        | aur owner ka naam (navbar/drawer dono currentUser se aate hain) ek
        | saath refresh hone chahiye.
        */
        const result = await updateCompanyProfile(formData);

        if (!result.success) {
          setActionError(
            result.message || "Failed to save changes. Please try again."
          );
          return;
        }

        setEditingSection(null);
        setErrors({});
        return;
      }

      // personalInfo node poora replace hota hai, isliye formData me record ki
      // baaki keys bhi rehti hain (startEdit poora personalInfo copy karta hai).
      const result = await updateEmployeeSection(
        companyCode,
        employeeId,
        "personalInfo",
        formData
      );

      // Email/mobile kisi aur employee ka nikla — us field par error dikhao
      if (!result.success) {
        setErrors((prev) => ({ ...prev, [result.field]: result.message }));
        return;
      }

      setEmployee((prev) => ({ ...prev, personalInfo: result.data }));
      setEditingSection(null);
      setErrors({});
    } catch (error) {
      console.error("Failed to save profile:", error);
      // Edit mode khula rehta hai taaki user ki bhari hui value na khoye
      setActionError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }
}

export default Profile;
