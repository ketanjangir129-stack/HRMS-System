import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  Landmark,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import { getEmployeeById } from "../services/EmployeeService";
import { getUserRole } from "../utils/attendance/attendanceRequestUtils";
import { getInitials, getUserName } from "../utils/user";

/*
|--------------------------------------------------------------------------
| Profile
|--------------------------------------------------------------------------
| The signed in user's own record, read only.
|
| This is deliberately not the Employees details page: that screen is the HR
| view of somebody else and is mounted behind `employees.details`, so a role
| without that permission could never reach its own information through it.
| Every role can open its own profile, so this route carries no permission.
|
| The owner has no employee record at all — only a name, an email and the
| company — so the sections that have nothing to show are simply dropped.
|--------------------------------------------------------------------------
*/

// Keep the last 4 characters visible, mask the rest
const maskValue = (value) => {
  const text = String(value);
  return text.length <= 4
    ? "X".repeat(text.length)
    : "X".repeat(text.length - 4) + text.slice(-4);
};

function Profile() {
  const { currentUser, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Drawer bhejta hai ki user kis page se aaya tha; direct URL par history se kaam chalega.
  const from = location.state?.from;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revealed, setRevealed] = useState({});

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

  // Back wahi page kholta hai jahan se profile khola gaya tha
  const handleBack = () => {
    if (from) {
      navigate(from);
      return;
    }

    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-500" />
          <p className="font-medium">Loading profile…</p>
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

  const sections = [
    {
      id: "personalInfo",
      icon: UserRound,
      title: "Personal Information",
      accent: "bg-indigo-50 text-indigo-600",
      fields: [
        { label: "Name", value: name },
        { label: "Email", value: email },
        { label: "Mobile", value: mobile },
        { label: "Alternate Mobile", value: employee?.personalInfo?.alternateMobile },
        { label: "Gender", value: employee?.personalInfo?.gender },
        { label: "DOB", value: employee?.personalInfo?.dob },
        { label: "Father Name", value: employee?.personalInfo?.fatherName },
        { label: "Mother Name", value: employee?.personalInfo?.motherName },
        { label: "Marital Status", value: employee?.personalInfo?.maritalStatus },
        { label: "City", value: employee?.personalInfo?.city },
        { label: "State", value: employee?.personalInfo?.state },
        { label: "Pincode", value: employee?.personalInfo?.pincode },
        {
          label: "Address",
          value: employee?.personalInfo?.address || currentUser?.address,
          full: true,
        },
      ],
    },
    {
      id: "employmentInfo",
      icon: BriefcaseBusiness,
      title: "Employment Information",
      accent: "bg-violet-50 text-violet-600",
      fields: [
        { label: "Employee ID", value: employee?.employmentInfo?.employeeId },
        { label: "Department", value: employee?.employmentInfo?.department },
        { label: "Designation", value: employee?.employmentInfo?.designation },
        { label: "Joining Date", value: employee?.employmentInfo?.joiningDate },
        { label: "Employee Type", value: employee?.employmentInfo?.employeeType },
      ],
    },
    {
      id: "account",
      icon: BadgeCheck,
      title: "Account Information",
      accent: "bg-amber-50 text-amber-600",
      fields: [
        { label: "Username", value: employee?.account?.username },
        { label: "Role", value: role },
        { label: "Status", value: employee?.account?.status },
      ],
    },
    {
      id: "bankInfo",
      icon: Landmark,
      title: "Bank Information",
      accent: "bg-sky-50 text-sky-600",
      fields: [
        { label: "Account Holder Name", value: bank.accountHolderName },
        { label: "Bank Name", value: bank.bankName },
        { label: "Branch", value: bank.branch || bank.branchName },
        { label: "Account Number", value: bank.accountNumber, masked: true },
        { label: "IFSC Code", value: bank.ifsc || bank.ifscCode },
      ],
    },
    {
      id: "documents",
      icon: FileText,
      title: "Documents",
      accent: "bg-rose-50 text-rose-600",
      fields: [
        { label: "Aadhaar Number", value: documents.aadhaar || documents.aadhaarNumber, masked: true },
        { label: "PAN Number", value: documents.pan || documents.panNumber, masked: true },
        { label: "UAN Number", value: documents.uan || documents.uanNumber, masked: true },
        { label: "ESIC Number", value: documents.esic || documents.esicNumber, masked: true },
        { label: "Resume", value: documents.resume, type: "file" },
      ],
    },
    {
      id: "company",
      icon: Building2,
      title: "Company Information",
      accent: "bg-emerald-50 text-emerald-600",
      fields: [
        { label: "Company Name", value: company?.companyName },
        { label: "Company Code", value: company?.companyCode },
        { label: "Owner Name", value: company?.ownerName },
        { label: "Email", value: company?.email },
        { label: "Phone", value: company?.phone },
        { label: "Address", value: company?.address, full: true },
      ],
    },
  ]
    // Khaali field dash ki tarah dikhane se behtar hai use hata dena — owner ke
    // liye bank/documents jaise poore section apne aap gayab ho jaate hain.
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) => String(field.value ?? "").trim() !== ""
      ),
    }))
    .filter((section) => section.fields.length > 0);

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Gradient profile header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 px-8 py-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-2 ring-white/30">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-bold">{name}</h1>

                {status && (
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
                )}
              </div>

              <p className="mt-1 capitalize text-white/80">
                {employee?.employmentInfo?.designation
                  ? `${employee.employmentInfo.department || ""} ${
                      employee.employmentInfo.department ? "-" : ""
                    } ${employee.employmentInfo.designation}`
                  : role || "—"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 text-sm text-white/80 lg:items-end">
            <span className="flex items-center gap-1.5">
              <IdCard className="h-4 w-4 shrink-0" />
              {employee?.employmentInfo?.employeeId || company?.companyCode || "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 shrink-0" />
              {mobile || "—"}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{email || "—"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-5">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <section
              key={section.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <h2 className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-6 py-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${section.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </span>
              </h2>

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const fieldId = `${section.id}.${field.label}`;
                  const isHidden = field.masked && !revealed[fieldId];

                  return (
                    <div
                      key={fieldId}
                      className={`flex flex-col gap-1.5 ${
                        field.full ? "sm:col-span-2" : ""
                      }`}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {field.label}
                      </p>

                      <div className="flex min-w-0 items-center gap-2">
                        <p className="break-words text-sm font-medium text-gray-800">
                          {field.type === "file" &&
                          /^https?:\/\//.test(field.value) ? (
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              View Resume (PDF)
                            </a>
                          ) : isHidden ? (
                            maskValue(field.value)
                          ) : (
                            field.value
                          )}
                        </p>

                        {field.masked && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(fieldId)}
                            aria-label={isHidden ? "Show value" : "Hide value"}
                            className="shrink-0 text-gray-400 transition hover:text-indigo-600 cursor-pointer"
                          >
                            {isHidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Profile;
