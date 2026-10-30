import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiFileText,
  FiInfo,
  FiLink,
  FiLoader,
  FiMail,
  FiRefreshCw,
  FiSend,
  FiUploadCloud,
  FiUsers,
  FiX,
  FiXCircle
} from "react-icons/fi";
import { getDepartments } from "../../services/departmentService";
import {
  isEmailServiceConfigured,
  sendInvitationEmail,
  sendInvitationEmails
} from "../../services/email/onboardingEmailService";
import { buildEmployeeIdentityIndex } from "../../services/ValidationService";
import { createBulkOnboardingRequests } from "../../services/OnboardingService";
import {
  ACCEPTED_FILE_TYPES,
  readBulkOnboardFile
} from "../../utils/onboarding/readBulkOnboardFile";
import {
  BULK_ONBOARD_COLUMNS,
  downloadBulkOnboardTemplate
} from "../../utils/onboarding/bulkOnboardColumns";
import {
  buildDepartmentIndex,
  validateBulkOnboardRows
} from "../../utils/onboarding/validateBulkOnboardRows";
import { exportInvitationLinks } from "../../utils/onboarding/exportInvitationLinks";
import Pagination from "../../components/common/pagination/Pagination";
import usePagination from "../../hooks/usePagination";
const STEPS = [
  { key: "import", label: "Import" },
  { key: "guide", label: "Guide" },
  { key: "summary", label: "Review" },
  { key: "result", label: "Invitations" }
];
const cardClass = "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";
const NO_ROWS = [];
const ROWS_PER_PAGE = 10;
function BulkOnboarding() {
  const navigate = useNavigate();
  const companyCode = localStorage.getItem("companyCode");
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("import");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [report, setReport] = useState(null);
  const [unknownHeadings, setUnknownHeadings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [emailState, setEmailState] = useState({});
  const [emailingAll, setEmailingAll] = useState(false);
  const emailReady = isEmailServiceConfigured();
  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const errorPagination = usePagination({
    data: report?.invalid || NO_ROWS,
    initialPageSize: ROWS_PER_PAGE
  });
  const validPagination = usePagination({
    data: report?.valid || NO_ROWS,
    initialPageSize: ROWS_PER_PAGE
  });
  const resultPagination = usePagination({
    data: results,
    initialPageSize: ROWS_PER_PAGE
  });
  useEffect(() => {
    errorPagination.resetPagination();
    validPagination.resetPagination();
  }, [report]);
  useEffect(() => {
    resultPagination.resetPagination();
  }, [results]);
  const handleFile = async (picked) => {
    if (!picked) {
      return;
    }
    setFile(picked);
    setReading(true);
    try {
      const parsed = await readBulkOnboardFile(picked);
      if (!parsed.success) {
        toast.error(parsed.message);
        setFile(null);
        return;
      }
      const [departmentData, identityIndex] = await Promise.all([
        getDepartments(companyCode),
        buildEmployeeIdentityIndex(companyCode)
      ]);
      const departments = Object.values(departmentData || {});
      const validated = validateBulkOnboardRows(parsed.rows, {
        departmentIndex: buildDepartmentIndex(departments),
        identityIndex
      });
      setReport(validated);
      setUnknownHeadings(parsed.unknownHeadings || []);
      setStep("summary");
    } catch (error) {
      console.error(error);
      toast.error("Could not read this file. Please upload a valid Excel or CSV file.");
      setFile(null);
    } finally {
      setReading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (reading) {
      return;
    }
    handleFile(event.dataTransfer.files?.[0]);
  };
  const handleCancel = () => {
    setFile(null);
    setReport(null);
    setUnknownHeadings([]);
    setStep("guide");
  };
  const handleStartOver = () => {
    setFile(null);
    setReport(null);
    setUnknownHeadings([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setEmailState({});
    setStep("guide");
  };
  const handleOnboardAll = async () => {
    if (!report?.valid.length) {
      return;
    }
    setSubmitting(true);
    setProgress({ done: 0, total: report.valid.length });
    try {
      const employees = report.valid.map((row) => ({
        ...row.values,
        rowNumber: row.rowNumber
      }));
      const outcomes = await createBulkOnboardingRequests(
        companyCode,
        employees,
        (done, total) => setProgress({ done, total })
      );
      setResults(outcomes);
      setStep("result");
      const created = outcomes.filter((item) => item.success).length;
      if (created) {
        toast.success(
          `${created} invitation link${created === 1 ? "" : "s"} generated.`
        );
      }
      if (created < outcomes.length) {
        toast.error(
          `${outcomes.length - created} record${outcomes.length - created === 1 ? "" : "s"} could not be onboarded.`
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Bulk onboarding failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const stopBulkOnboarding = () => {
    setLeaveWarningOpen(false);
    setSubmitting(false);
    setProgress({ done: 0, total: 0 });
    setResults([]);
    setEmailState({});
    setReport(null);
    setUnknownHeadings([]);
    setStep("guide");
  };
  const successful = results.filter((item) => item.success);
  const applyEmailResults = (rows) => setEmailState((previous) => {
    const next = { ...previous };
    rows.forEach((row) => {
      next[row.ref] = {
        status: row.success ? "sent" : "failed",
        message: row.message || ""
      };
    });
    return next;
  });
  const handleEmailOne = async (item) => {
    setEmailState((previous) => ({
      ...previous,
      [item.employeeId]: { status: "sending", message: "" }
    }));
    const result = await sendInvitationEmail(companyCode, item);
    applyEmailResults([
      {
        ref: item.employeeId,
        success: result.success,
        message: result.message
      }
    ]);
    if (result.success) {
      toast.success(`Invitation emailed to ${item.email}.`);
    } else {
      toast.error(result.message);
    }
  };
  const handleEmailAll = async () => {
    const pending = successful.filter(
      (item) => emailState[item.employeeId]?.status !== "sent"
    );
    if (!pending.length) {
      toast.info("Every invitation has already been emailed.");
      return;
    }
    setEmailingAll(true);
    setEmailState((previous) => {
      const next = { ...previous };
      pending.forEach((item) => {
        next[item.employeeId] = { status: "sending", message: "" };
      });
      return next;
    });
    try {
      const outcome = await sendInvitationEmails(companyCode, pending);
      applyEmailResults(outcome.results || []);
      if (outcome.sent) {
        toast.success(
          `${outcome.sent} invitation${outcome.sent === 1 ? "" : "s"} emailed.`
        );
      }
      if (outcome.failed) {
        toast.error(
          `${outcome.failed} invitation${outcome.failed === 1 ? "" : "s"} could not be emailed.`
        );
      }
      if (!outcome.sent && !outcome.failed && outcome.message) {
        toast.error(outcome.message);
      }
    } finally {
      setEmailingAll(false);
    }
  };
  const copyToClipboard = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error("Could not copy to clipboard.");
    }
  };
  const emailedCount = successful.filter(
    (item) => emailState[item.employeeId]?.status === "sent"
  ).length;
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-6xl space-y-6 p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: `${cardClass} flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between` }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 items-center gap-2.5 sm:gap-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        if (submitting) {
          setLeaveWarningOpen(true);
          return;
        }
        navigate("/OnboardDashboard");
      },
      title: "Go back",
      "aria-label": "Go back",
      className: "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:h-11 sm:w-11"
    },
    /* @__PURE__ */ React.createElement(FiArrowLeft, { size: 18 })
  ), /* @__PURE__ */ React.createElement("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11" }, /* @__PURE__ */ React.createElement(FiUsers, { className: "text-lg text-white sm:text-xl" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h1", { className: "text-xl font-bold tracking-tight text-slate-900 max-sm:leading-tight sm:text-3xl" }, "Bulk Onboarding"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 hidden text-sm text-slate-500 sm:block sm:text-base" }, "Onboard an entire joining batch from one Excel file."))), /* @__PURE__ */ React.createElement("ol", { className: "flex shrink-0 items-center gap-1.5 max-md:overflow-x-auto sm:gap-2" }, STEPS.map((item, index) => /* @__PURE__ */ React.createElement(
    "li",
    {
      key: item.key,
      className: "flex items-center gap-1.5 sm:gap-2"
    },
    /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3 ${index === stepIndex ? "bg-blue-600 text-white" : index < stepIndex ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`
      },
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: `flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${index === stepIndex ? "bg-white/25" : index < stepIndex ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`
        },
        index + 1
      ),
      item.label
    ),
    index < STEPS.length - 1 && /* @__PURE__ */ React.createElement("span", { className: "h-px w-3 bg-slate-200 sm:w-5" })
  )))), step === "import" && /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center px-5 py-14 text-center sm:px-6 sm:py-20" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600" }, /* @__PURE__ */ React.createElement(FiUploadCloud, { size: 30 })), /* @__PURE__ */ React.createElement("h2", { className: "mt-5 text-lg font-semibold text-slate-900 sm:text-xl" }, "Import Employees Data"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 max-w-md text-sm text-slate-500" }, "Bring a whole batch of joiners in from a single Excel or CSV file. Every row is checked before anything is created."), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setStep("guide"),
      className: "mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
    },
    /* @__PURE__ */ React.createElement(FiUploadCloud, null),
    "Import Employees Data"
  ))), step === "guide" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600" }, /* @__PURE__ */ React.createElement(FiFileText, null)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold text-slate-900" }, "Before You Upload"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "Your employee data file must contain these details for onboarding to succeed."))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => downloadBulkOnboardTemplate(),
      className: "flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    },
    /* @__PURE__ */ React.createElement(FiDownload, null),
    "Download Template"
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[46rem] text-left text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-xs uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:px-6" }, "Column"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Required"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Example"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:pr-6" }, "Notes"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, BULK_ONBOARD_COLUMNS.map((column) => /* @__PURE__ */ React.createElement("tr", { key: column.key, className: "align-top" }, /* @__PURE__ */ React.createElement("td", { className: "whitespace-nowrap px-5 py-3 font-semibold text-slate-900 sm:px-6" }, column.label), /* @__PURE__ */ React.createElement("td", { className: "whitespace-nowrap px-5 py-3" }, column.required ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600" }, "Required") : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500" }, "Optional")), /* @__PURE__ */ React.createElement("td", { className: "whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600" }, column.example), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500 sm:pr-6" }, column.hint)))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-6" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(FiInfo, { className: "mt-0.5 shrink-0 text-slate-400" }), "The first row of the sheet must be the column headings, and only the first sheet of the workbook is read."), /* @__PURE__ */ React.createElement("p", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(FiInfo, { className: "mt-0.5 shrink-0 text-slate-400" }), "Department and Designation must already exist under Departments \u2014 a row naming one that does not is rejected."), /* @__PURE__ */ React.createElement("p", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(FiInfo, { className: "mt-0.5 shrink-0 text-slate-400" }), "Employee ID, Email and Mobile Number must be unique, both within the file and against employees you already have."))), /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onDragOver: (event) => {
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: handleDrop,
      className: `m-4 flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-12 text-center transition-colors sm:m-6 ${dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm" }, reading ? /* @__PURE__ */ React.createElement(FiLoader, { size: 24, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(FiUploadCloud, { size: 24 })),
    /* @__PURE__ */ React.createElement("h3", { className: "mt-4 text-base font-semibold text-slate-900" }, reading ? "Checking your file..." : "Select your employees data file"),
    /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm text-slate-500" }, reading ? "Reading the rows and validating them against your company." : "Drag the file here, or choose it from your computer."),
    /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: ACCEPTED_FILE_TYPES,
        className: "hidden",
        onChange: (event) => handleFile(event.target.files?.[0])
      }
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: reading,
        onClick: () => fileInputRef.current?.click(),
        className: "mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      },
      /* @__PURE__ */ React.createElement(FiFileText, null),
      "Choose File"
    ),
    /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-xs text-slate-400" }, "Accepted formats: .xlsx, .xls, .csv")
  ))), step === "summary" && report && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-3" }, /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiFileText, null),
      tone: "slate",
      label: "Total Records",
      value: report.total,
      caption: file?.name || "Imported file"
    }
  ), /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiCheckCircle, null),
      tone: "green",
      label: "Valid Records",
      value: report.valid.length,
      caption: "Ready to be onboarded"
    }
  ), /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiXCircle, null),
      tone: "red",
      label: "Invalid Records",
      value: report.invalid.length,
      caption: `${report.errorCount} error${report.errorCount === 1 ? "" : "s"} found`
    }
  )), unknownHeadings.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800" }, /* @__PURE__ */ React.createElement(FiAlertTriangle, { className: "mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Ignored columns: "), unknownHeadings.join(", "), ". These headings are not part of the onboarding format and were skipped.")), report.invalid.length > 0 && /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600" }, /* @__PURE__ */ React.createElement(FiAlertCircle, null)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold text-slate-900" }, "Errors"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "These rows will be skipped. Fix them in your file and import again."))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto overscroll-x-contain" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[40rem] text-left text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-xs uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:px-6" }, "Row"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Employee"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:pr-6" }, "What is wrong"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, errorPagination.paginatedData.map((row) => /* @__PURE__ */ React.createElement("tr", { key: row.rowNumber, className: "align-top" }, /* @__PURE__ */ React.createElement("td", { className: "whitespace-nowrap px-5 py-3 font-semibold text-slate-900 sm:px-6" }, row.rowNumber), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-600" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-slate-800" }, row.values.name || /* @__PURE__ */ React.createElement("span", { className: "text-slate-300" }, "\u2014")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, row.values.employeeId || "No employee ID")), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 sm:pr-6" }, /* @__PURE__ */ React.createElement("ul", { className: "space-y-1" }, row.errors.map((error, index) => /* @__PURE__ */ React.createElement(
    "li",
    {
      key: `${row.rowNumber}-${index}`,
      className: "flex items-start gap-2 text-xs text-red-600"
    },
    /* @__PURE__ */ React.createElement(FiAlertCircle, { className: "mt-0.5 shrink-0" }),
    /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, error.field, ":"), " ", error.message)
  ))))))))), /* @__PURE__ */ React.createElement(
    Pagination,
    {
      currentPage: errorPagination.currentPage,
      totalPages: errorPagination.totalPages,
      totalItems: errorPagination.totalItems,
      startItem: errorPagination.startItem,
      endItem: errorPagination.endItem,
      pageSize: errorPagination.pageSize,
      onPageChange: errorPagination.goToPage,
      onPageSizeChange: errorPagination.changePageSize
    }
  )), report.valid.length > 0 && /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600" }, /* @__PURE__ */ React.createElement(FiCheckCircle, null)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold text-slate-900" }, "Valid Records"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "An invitation link will be generated for each of these."))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto overscroll-x-contain" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[52rem] text-left text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-xs uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:px-6" }, "Row"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Employee ID"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Name"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Email"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Mobile"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Department"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Designation"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Joining"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:pr-6" }, "Role"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, validPagination.paginatedData.map((row) => /* @__PURE__ */ React.createElement("tr", { key: row.rowNumber, className: "whitespace-nowrap" }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-400 sm:px-6" }, row.rowNumber), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 font-semibold text-slate-900" }, row.values.employeeId.toUpperCase()), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-700" }, row.values.name), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500" }, row.values.email), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500" }, row.values.mobile), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500" }, row.values.department), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500" }, row.values.designation), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 text-slate-500" }, row.values.joiningDate), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 sm:pr-6" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-700" }, row.values.role))))))), /* @__PURE__ */ React.createElement(
    Pagination,
    {
      currentPage: validPagination.currentPage,
      totalPages: validPagination.totalPages,
      totalItems: validPagination.totalItems,
      startItem: validPagination.startItem,
      endItem: validPagination.endItem,
      pageSize: validPagination.pageSize,
      onPageChange: validPagination.goToPage,
      onPageSizeChange: validPagination.changePageSize
    }
  )), /* @__PURE__ */ React.createElement("div", { className: `${cardClass} flex flex-col gap-3 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6` }, /* @__PURE__ */ React.createElement("p", { className: "flex items-start gap-2 text-xs text-slate-500 sm:items-center" }, /* @__PURE__ */ React.createElement(FiInfo, { className: "mt-0.5 shrink-0 text-slate-400 sm:mt-0" }), report.valid.length ? `${report.valid.length} valid record${report.valid.length === 1 ? "" : "s"} will be onboarded${report.invalid.length ? ` and ${report.invalid.length} invalid one${report.invalid.length === 1 ? "" : "s"} skipped` : ""}. Nothing has been created yet.` : "No valid records to onboard. Fix the errors above and import the file again."), /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleCancel,
      disabled: submitting,
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    },
    /* @__PURE__ */ React.createElement(FiX, null),
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleOnboardAll,
      disabled: submitting || !report.valid.length,
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
    },
    submitting ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiLoader, { className: "animate-spin" }), "Onboarding ", progress.done, " of ", progress.total, "...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiSend, null), "Onboard All", report.valid.length ? ` (${report.valid.length})` : "")
  )))), step === "result" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-3" }, /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiFileText, null),
      tone: "slate",
      label: "Processed",
      value: results.length,
      caption: "Records sent for onboarding"
    }
  ), /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiCheckCircle, null),
      tone: "green",
      label: "Links Generated",
      value: successful.length,
      caption: `${emailedCount} emailed to the employee`
    }
  ), /* @__PURE__ */ React.createElement(
    SummaryTile,
    {
      icon: /* @__PURE__ */ React.createElement(FiXCircle, null),
      tone: "red",
      label: "Failed",
      value: results.length - successful.length,
      caption: "Could not be onboarded"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: cardClass }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600" }, /* @__PURE__ */ React.createElement(FiLink, null)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-semibold text-slate-900" }, "Invitation Links"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, emailReady ? "Email every invitation at once, or send them one at a time." : "Share each link with the employee it belongs to."))), successful.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 flex-col gap-2 sm:flex-row" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleEmailAll,
      disabled: emailingAll || !emailReady,
      title: emailReady ? "Email every invitation that has not gone out yet" : "Email sending is not configured yet",
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
    },
    emailingAll ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiLoader, { className: "animate-spin" }), "Emailing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiMail, null), "Email All", successful.length - emailedCount ? ` (${successful.length - emailedCount})` : "")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => copyToClipboard(
        successful.map(
          (item) => `${item.employeeId} \u2014 ${item.name}: ${item.invitationLink}`
        ).join("\n"),
        "All invitation links copied."
      ),
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    },
    /* @__PURE__ */ React.createElement(FiCopy, null),
    "Copy All"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => exportInvitationLinks(results),
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    },
    /* @__PURE__ */ React.createElement(FiDownload, null),
    "Download"
  ))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[58rem] text-left text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-50 text-xs uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:px-6" }, "Employee"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold" }, "Invitation Link"), /* @__PURE__ */ React.createElement("th", { className: "px-5 py-3 font-semibold sm:pr-6" }, "Invitation Email"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, resultPagination.paginatedData.map((item) => /* @__PURE__ */ React.createElement("tr", { key: `${item.employeeId}-${item.rowNumber}` }, /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 sm:px-6" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-900" }, item.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, item.employeeId)), /* @__PURE__ */ React.createElement("td", { className: "whitespace-nowrap px-5 py-3" }, item.success ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700" }, /* @__PURE__ */ React.createElement(FiCheckCircle, { size: 12 }), "Invitation Sent") : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600" }, /* @__PURE__ */ React.createElement(FiXCircle, { size: 12 }), "Failed")), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3" }, item.success ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "min-w-0 break-all font-mono text-xs text-slate-600" }, item.invitationLink), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      title: "Copy link",
      "aria-label": `Copy invitation link for ${item.employeeId}`,
      onClick: () => copyToClipboard(
        item.invitationLink,
        `Link for ${item.employeeId} copied.`
      ),
      className: "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
    },
    /* @__PURE__ */ React.createElement(FiCopy, { size: 14 })
  )) : /* @__PURE__ */ React.createElement("span", { className: "text-xs text-red-500" }, item.message)), /* @__PURE__ */ React.createElement("td", { className: "px-5 py-3 sm:pr-6" }, item.success ? /* @__PURE__ */ React.createElement(
    InvitationEmailCell,
    {
      state: emailState[item.employeeId],
      disabled: !emailReady || emailingAll,
      onSend: () => handleEmailOne(item)
    }
  ) : /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-300" }, "\u2014"))))))), /* @__PURE__ */ React.createElement(
    Pagination,
    {
      currentPage: resultPagination.currentPage,
      totalPages: resultPagination.totalPages,
      totalItems: resultPagination.totalItems,
      startItem: resultPagination.startItem,
      endItem: resultPagination.endItem,
      pageSize: resultPagination.pageSize,
      onPageChange: resultPagination.goToPage,
      onPageSizeChange: resultPagination.changePageSize
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement(FiInfo, { className: "shrink-0 text-slate-400" }), "Each employee completes their own onboarding form from the link, and the submission arrives under Onboarding Requests."), /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 flex-col gap-3 sm:flex-row" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleStartOver,
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    },
    /* @__PURE__ */ React.createElement(FiRefreshCw, null),
    "Import Another File"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => navigate("/OnboardDashboard/OnBoardRequest"),
      className: "flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
    },
    "View Onboarding Requests"
  ))))), submitting && leaveWarningOpen && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm",
      onClick: () => setLeaveWarningOpen(false)
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        className: "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      },
      /* @__PURE__ */ React.createElement("div", { className: "mb-5 flex items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600" }, /* @__PURE__ */ React.createElement(FiAlertTriangle, null)), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold tracking-tight text-slate-900" }, "Bulk Onboarding In Process")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setLeaveWarningOpen(false),
          title: "Close",
          "aria-label": "Close warning",
          className: "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        },
        /* @__PURE__ */ React.createElement(FiX, null)
      )),
      /* @__PURE__ */ React.createElement("p", { className: "text-sm leading-relaxed text-slate-600" }, "Employees Bulk Onboarding is currently in process. Switching sections or leaving now can break the process before it completes."),
      /* @__PURE__ */ React.createElement("div", { className: "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700" }, "If you leave now, the remaining employees may not be onboarded."),
      /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex justify-end gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setLeaveWarningOpen(false),
          className: "rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: stopBulkOnboarding,
          className: "inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        },
        /* @__PURE__ */ React.createElement(FiAlertTriangle, { className: "text-[15px]" }),
        "Ignore"
      ))
    )
  ));
}
function InvitationEmailCell({ state, disabled, onSend }) {
  const status = state?.status;
  if (status === "sending") {
    return /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500" }, /* @__PURE__ */ React.createElement(FiLoader, { size: 12, className: "animate-spin" }), "Sending...");
  }
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onSend,
      disabled,
      className: `inline-flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 ${status === "sent" ? "border-green-200 bg-green-50 text-green-700 hover:border-green-300" : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600"}`
    },
    status === "sent" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiCheckCircle, { size: 12 }), "Emailed \u2014 Resend") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FiMail, { size: 12 }), status === "failed" ? "Try Again" : "Send Email")
  ), status === "failed" && state.message && /* @__PURE__ */ React.createElement("span", { className: "flex items-start gap-1 text-[11px] leading-tight text-red-500" }, /* @__PURE__ */ React.createElement(FiXCircle, { size: 11, className: "mt-0.5 shrink-0" }), state.message));
}
function SummaryTile({ icon, tone, label, value, caption }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600"
  };
  return /* @__PURE__ */ React.createElement("div", { className: `${cardClass} flex items-center gap-4 px-5 py-4` }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone]}`
    },
    icon
  ), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, label), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-slate-900" }, value), /* @__PURE__ */ React.createElement("p", { className: "truncate text-xs text-slate-500" }, caption)));
}
export default BulkOnboarding;
