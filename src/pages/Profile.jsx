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

import useAuth from "../hooks/useAuth";
import Loader from "../components/common/Loader";
import {
  getEmployeeById,
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
| The owner has no employee record at all — only a name, an email and the
| company — so the sections that have nothing to show are simply dropped.
|
| Look EmployeesDetails se liya gaya hai — dono ek hi cheez dikhate hain
| (ek record, section-wise), isliye card, hero, field row aur edit form wahi
| hain. Farq sirf itna: yahan sirf ek card edit hota hai.
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
| apne aap single column ho jata hai (owner ke paas sirf account+company
| hota hai).
*/
const MAIN_SECTIONS = ["personalInfo", "bankInfo", "documents"];

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
  const { currentUser, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Drawer bhejta hai ki user kis page se aaya tha; direct URL par history se kaam chalega.
  const from = location.state?.from;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revealed, setRevealed] = useState({});

  // Personal Information card ka edit mode + uski working copy
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Save fail hone par upar dikhne wala banner (alert ki jagah)
  const [actionError, setActionError] = useState("");

  const companyCode = company?.companyCode || localStorage.getItem("companyCode");

  const role = getUserRole(currentUser);

  // Login ke waqt record isi key (uppercase employee id) se aaya tha
  const employeeId =
    currentUser?.account?.username ||
    currentUser?.employmentInfo?.employeeId ||
    "";

  /*
  | localStorage ka currentUser login ke waqt ka snapshot hai. HR koi detail
  | badle to woh yahan purani dikhegi, isliye record dobara padha jaata hai —
  | read fail ho to snapshot hi dikha do, page khaali chhodne se behtar hai.
  */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!employeeId || !companyCode) {
        // Owner — uska koi employee record hota hi nahi
        if (!cancelled) {
          setEmployee(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await getEmployeeById(companyCode, employeeId);
        if (!cancelled) setEmployee(data || currentUser);
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (!cancelled) setEmployee(currentUser);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
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

  const name = getUserName(employee || currentUser);
  const initials = getInitials(employee || currentUser);

  const email = employee?.personalInfo?.email || currentUser?.email || "";
  const mobile = employee?.personalInfo?.mobile || currentUser?.phone || "";

  const status = employee?.account?.status || (company?.status === "active" ? "Active" : "");
  const isActive = status.toLowerCase() === "active";

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

  // Owner ka koi employee record nahi hota — uske paas save karne ko kuch hai hi nahi
  const canEdit = Boolean(employee && employeeId && companyCode);

  const sections = [
    {
      id: "personalInfo",
      icon: UserRound,
      title: "Personal Information",
      subtitle: "Identity, contact and address details.",
      accent: "bg-blue-50 text-blue-600",
      editable: canEdit,
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
    
  ]
    // Khaali field dash ki tarah dikhane se behtar hai use hata dena — owner ke
    // liye bank/documents jaise poore section apne aap gayab ho jaate hain.
    // Edit mode alag baat hai: wahan khaali fields dikhne hi chahiye, warna jo
    // abhi bhare hi nahi hain unhe user kabhi bhar hi nahi payega.
    .map((section) => ({
      ...section,
      fields:
        section.editable && editing
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

  // Naam ke neeche chips — khaali value wala chip banta hi nahi
  const headerChips = [
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
  ].filter((chip) => chip.label);

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

        {/* Owner ka koi record hi nahi hota, uske liye yahan kuch edit nahi hota —
            ye batana zaroori hai, warna wo Edit button dhoondta rehta hai.
            Employee/HR ko Edit button Personal Information card par milta hai. */}
        {!canEdit && (
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

    </div>
  );

  // Ek section ka card. `variant` batata hai card kitni chaudi jagah me
  // baitha hai — patle sidebar me fields ek hi column me theek lagte hain.
  function renderSection(section, variant) {
    const Icon = section.icon;

    const isEditing = Boolean(section.editable) && editing;

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

          {section.editable && !isEditing && (
            <button
              type="button"
              onClick={startEdit}
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

                  {isEditing ? (
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
                  ) : (
                  <div className="flex min-h-6 min-w-0 items-center justify-between gap-2">

                    <p
                      className={`min-w-0 wrap-break-word text-sm font-semibold text-slate-900 ${
                        isHidden ? "tracking-widest" : ""
                      }`}
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

  // Edit mode ka form employee ke apne record se bharta hai. Purane records me
  // naam/email/mobile employmentInfo me the — form me wahi fallback chahiye,
  // warna save par ye teeno khaali chale jaate.
  function startEdit() {
    const draft = {
      ...personalValues,
      name: personal.name || employee?.employmentInfo?.name || "",
    };

    // Har editable key form me honi chahiye — jo key hi na ho uski required
    // validation kabhi chalti nahi aur khaali field chupke se save ho jaata.
    PERSONAL_FIELDS.forEach((field) => {
      draft[field.key] = draft[field.key] ?? "";
    });

    setFormData(draft);
    setErrors({});
    setActionError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setFormData({});
    setErrors({});
  }

  function handleFieldChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Jis field ko user theek kar raha hai, uska error turant hata do
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  async function saveProfile() {
    const validationErrors = {};

    Object.keys(formData).forEach((key) => {
      if (!rules[key]) return; // is field ka koi rule nahi → skip

      const value = formData[key];
      const isEmpty = !String(value ?? "").trim();

      // Optional field (rule required nahi) khaali ho to validate mat karo
      if (isEmpty && !rules[key].required) return;

      const error = validateField(key, value, {
        ...employee,
        personalInfo: formData,
      });

      if (error) validationErrors[key] = error;
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // galti hai to save mat karo
    }

    setSaving(true);
    setActionError("");

    try {
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
      setEditing(false);
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
