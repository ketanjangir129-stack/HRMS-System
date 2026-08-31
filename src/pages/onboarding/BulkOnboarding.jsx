import { useRef, useState } from "react";
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
    FiXCircle,
} from "react-icons/fi";

import { getDepartments } from "../../services/departmentService";
import {
    isEmailServiceConfigured,
    sendInvitationEmail,
    sendInvitationEmails,
} from "../../services/email/onboardingEmailService";
import { buildEmployeeIdentityIndex } from "../../services/ValidationService";
import { createBulkOnboardingRequests } from "../../services/OnboardingService";
import {
    ACCEPTED_FILE_TYPES,
    readBulkOnboardFile,
} from "../../utils/onboarding/readBulkOnboardFile";
import {
    BULK_ONBOARD_COLUMNS,
    downloadBulkOnboardTemplate,
} from "../../utils/onboarding/bulkOnboardColumns";
import {
    buildDepartmentIndex,
    validateBulkOnboardRows,
} from "../../utils/onboarding/validateBulkOnboardRows";
import { exportInvitationLinks } from "../../utils/onboarding/exportInvitationLinks";

/*
|--------------------------------------------------------------------------
| Bulk On-boarding
|--------------------------------------------------------------------------
| On-boarding a whole joining batch from one spreadsheet, in four steps that
| the page walks through in order:
|
|   1. import   — the one thing there is to do on an empty page
|   2. guide    — what the file must carry, and a template already shaped
|                 that way, shown before a file is picked rather than after
|                 one is rejected
|   3. summary  — what the file actually carried: how much of it is usable,
|                 what is wrong and in which row, with nothing written yet
|   4. result   — the invitation link generated for every employee
|
| The order is the point. Every judgement about the file is made and shown
| before a single record is written, so "Onboard All" is a decision the user
| takes with the whole picture in front of them, and cancelling costs them
| nothing but the upload.
|--------------------------------------------------------------------------
*/

const STEPS = [
    { key: "import", label: "Import" },
    { key: "guide", label: "Guide" },
    { key: "summary", label: "Review" },
    { key: "result", label: "Invitations" },
];

const cardClass =
    "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

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

    /*
    | Where each invitation email has got to, keyed by employee id:
    | `{ status: "sending" | "sent" | "failed", message }`. Kept per row
    | rather than as one verdict over the run — a batch of two hundred can
    | very reasonably be a hundred and ninety eight delivered and two bad
    | addresses, and the two are what somebody has to act on.
    */
    const [emailState, setEmailState] = useState({});
    const [emailingAll, setEmailingAll] = useState(false);

    const emailReady = isEmailServiceConfigured();

    const stepIndex = STEPS.findIndex((item) => item.key === step);

    /*
    | Reading and validating are one action from the user's point of view, so
    | they are one handler: the file is parsed, the company is read for the
    | departments and the identities already spoken for, and the rows come
    | back sorted into usable and not.
    */
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
                buildEmployeeIdentityIndex(companyCode),
            ]);

            const departments = Object.values(departmentData || {});

            const validated = validateBulkOnboardRows(parsed.rows, {
                departmentIndex: buildDepartmentIndex(departments),
                identityIndex,
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

            // Picking the same file twice in a row must still fire onChange.
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

    /* Cancel discards the upload and leaves nothing behind but the guide. */
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
                rowNumber: row.rowNumber,
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

    /* The rows that actually got a link, which is all the rest works on. */
    const successful = results.filter((item) => item.success);

    /*
    |----------------------------------------------------------------------
    | Sending the invitations
    |----------------------------------------------------------------------
    | Onboarding a batch generates the links; sending them is a separate
    | decision taken here, one row at a time or the whole run at once. The
    | rows already delivered are skipped by "Email All", so pressing it twice
    | after fixing a couple of addresses chases the stragglers rather than
    | mailing everybody again.
    */

    const applyEmailResults = (rows) =>
        setEmailState((previous) => {

            const next = { ...previous };

            rows.forEach((row) => {
                next[row.ref] = {
                    status: row.success ? "sent" : "failed",
                    message: row.message || "",
                };
            });

            return next;
        });

    const handleEmailOne = async (item) => {

        setEmailState((previous) => ({
            ...previous,
            [item.employeeId]: { status: "sending", message: "" },
        }));

        const result = await sendInvitationEmail(companyCode, item);

        applyEmailResults([
            {
                ref: item.employeeId,
                success: result.success,
                message: result.message,
            },
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

    return (

        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">

            {/* Page header */}
            <div className={`${cardClass} flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between`}>

                <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">

                    <button
                        type="button"
                        onClick={() => navigate("/OnboardDashboard")}
                        title="Go back"
                        aria-label="Go back"
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:h-11 sm:w-11"
                    >
                        <FiArrowLeft size={18} />
                    </button>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
                        <FiUsers className="text-lg text-white sm:text-xl" />
                    </div>

                    <div className="min-w-0">

                        <h1 className="text-xl font-bold tracking-tight text-slate-900 max-sm:leading-tight sm:text-3xl">
                            Bulk Onboarding
                        </h1>

                        <p className="mt-1 hidden text-sm text-slate-500 sm:block sm:text-base">
                            Onboard an entire joining batch from one Excel file.
                        </p>

                    </div>

                </div>

                {/* Where we are in the four steps. */}
                <ol className="flex shrink-0 items-center gap-1.5 max-md:overflow-x-auto sm:gap-2">

                    {STEPS.map((item, index) => (

                        <li
                            key={item.key}
                            className="flex items-center gap-1.5 sm:gap-2"
                        >

                            <span
                                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3 ${index === stepIndex
                                    ? "bg-blue-600 text-white"
                                    : index < stepIndex
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                            >
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${index === stepIndex
                                        ? "bg-white/25"
                                        : index < stepIndex
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-200 text-slate-500"
                                        }`}
                                >
                                    {index + 1}
                                </span>
                                {item.label}
                            </span>

                            {index < STEPS.length - 1 && (
                                <span className="h-px w-3 bg-slate-200 sm:w-5" />
                            )}

                        </li>

                    ))}

                </ol>

            </div>

            {/*
              Step 1 — Import
              An empty page with one thing on it. The guide is deliberately
              behind this button rather than beside it: a wall of column rules
              is not what somebody arriving here is looking for.
            */}
            {step === "import" && (

                <div className={cardClass}>

                    <div className="flex flex-col items-center px-5 py-14 text-center sm:px-6 sm:py-20">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <FiUploadCloud size={30} />
                        </div>

                        <h2 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
                            Import Employees Data
                        </h2>

                        <p className="mt-2 max-w-md text-sm text-slate-500">
                            Bring a whole batch of joiners in from a single Excel or CSV
                            file. Every row is checked before anything is created.
                        </p>

                        <button
                            type="button"
                            onClick={() => setStep("guide")}
                            className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
                        >
                            <FiUploadCloud />
                            Import Employees Data
                        </button>

                    </div>

                </div>

            )}

            {/*
              Step 2 — Guide, then the file
              What the file has to carry, said before it is asked for, with a
              template already shaped that way for anyone who would rather not
              build one.
            */}
            {step === "guide" && (

                <div className="space-y-6">

                    <div className={cardClass}>

                        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                            <div className="flex min-w-0 items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <FiFileText />
                                </div>

                                <div className="min-w-0">

                                    <h2 className="text-base font-semibold text-slate-900">
                                        Before You Upload
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        Your employee data file must contain these details for
                                        onboarding to succeed.
                                    </p>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() => downloadBulkOnboardTemplate()}
                                className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                            >
                                <FiDownload />
                                Download Template
                            </button>

                        </div>

                        <div className="overflow-x-auto">

                            <table className="w-full min-w-[46rem] text-left text-sm">

                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                    <tr>
                                        <th className="px-5 py-3 font-semibold sm:px-6">Column</th>
                                        <th className="px-5 py-3 font-semibold">Required</th>
                                        <th className="px-5 py-3 font-semibold">Example</th>
                                        <th className="px-5 py-3 font-semibold sm:pr-6">Notes</th>
                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100">

                                    {BULK_ONBOARD_COLUMNS.map((column) => (

                                        <tr key={column.key} className="align-top">

                                            <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-900 sm:px-6">
                                                {column.label}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-3">

                                                {column.required ? (
                                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                                                        Optional
                                                    </span>
                                                )}

                                            </td>

                                            <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">
                                                {column.example}
                                            </td>

                                            <td className="px-5 py-3 text-slate-500 sm:pr-6">
                                                {column.hint}
                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                        <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-6">

                            <p className="flex items-start gap-2">
                                <FiInfo className="mt-0.5 shrink-0 text-slate-400" />
                                The first row of the sheet must be the column headings, and
                                only the first sheet of the workbook is read.
                            </p>

                            <p className="flex items-start gap-2">
                                <FiInfo className="mt-0.5 shrink-0 text-slate-400" />
                                Department and Designation must already exist under
                                Departments — a row naming one that does not is rejected.
                            </p>

                            <p className="flex items-start gap-2">
                                <FiInfo className="mt-0.5 shrink-0 text-slate-400" />
                                Employee ID, Email and Mobile Number must be unique, both
                                within the file and against employees you already have.
                            </p>

                        </div>

                    </div>

                    {/* The file itself */}
                    <div className={cardClass}>

                        <div
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            className={`m-4 flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-12 text-center transition-colors sm:m-6 ${dragging
                                ? "border-blue-400 bg-blue-50"
                                : "border-slate-200 bg-slate-50"
                                }`}
                        >

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                {reading ? (
                                    <FiLoader size={24} className="animate-spin" />
                                ) : (
                                    <FiUploadCloud size={24} />
                                )}
                            </div>

                            <h3 className="mt-4 text-base font-semibold text-slate-900">
                                {reading
                                    ? "Checking your file..."
                                    : "Select your employees data file"}
                            </h3>

                            <p className="mt-1.5 text-sm text-slate-500">
                                {reading
                                    ? "Reading the rows and validating them against your company."
                                    : "Drag the file here, or choose it from your computer."}
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_FILE_TYPES}
                                className="hidden"
                                onChange={(event) => handleFile(event.target.files?.[0])}
                            />

                            <button
                                type="button"
                                disabled={reading}
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                <FiFileText />
                                Choose File
                            </button>

                            <p className="mt-3 text-xs text-slate-400">
                                Accepted formats: .xlsx, .xls, .csv
                            </p>

                        </div>

                    </div>

                </div>

            )}

            {/*
              Step 3 — Summary
              The counts first, then the errors row by row. Nothing has been
              written at this point, which is what makes Cancel free.
            */}
            {step === "summary" && report && (

                <div className="space-y-6">

                    {/* Counts */}
                    <div className="grid gap-4 sm:grid-cols-3">

                        <SummaryTile
                            icon={<FiFileText />}
                            tone="slate"
                            label="Total Records"
                            value={report.total}
                            caption={file?.name || "Imported file"}
                        />

                        <SummaryTile
                            icon={<FiCheckCircle />}
                            tone="green"
                            label="Valid Records"
                            value={report.valid.length}
                            caption="Ready to be onboarded"
                        />

                        <SummaryTile
                            icon={<FiXCircle />}
                            tone="red"
                            label="Invalid Records"
                            value={report.invalid.length}
                            caption={`${report.errorCount} error${report.errorCount === 1 ? "" : "s"} found`}
                        />

                    </div>

                    {unknownHeadings.length > 0 && (

                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">

                            <FiAlertTriangle className="mt-0.5 shrink-0" />

                            <p>
                                <span className="font-semibold">Ignored columns: </span>
                                {unknownHeadings.join(", ")}. These headings are not part of
                                the onboarding format and were skipped.
                            </p>

                        </div>

                    )}

                    {/* Errors */}
                    {report.invalid.length > 0 && (

                        <div className={cardClass}>

                            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                    <FiAlertCircle />
                                </div>

                                <div className="min-w-0">

                                    <h2 className="text-base font-semibold text-slate-900">
                                        Errors
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        These rows will be skipped. Fix them in your file and
                                        import again.
                                    </p>

                                </div>

                            </div>

                            <div className="max-h-96 overflow-auto">

                                <table className="w-full min-w-[40rem] text-left text-sm">

                                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                        <tr>
                                            <th className="px-5 py-3 font-semibold sm:px-6">Row</th>
                                            <th className="px-5 py-3 font-semibold">Employee</th>
                                            <th className="px-5 py-3 font-semibold sm:pr-6">
                                                What is wrong
                                            </th>
                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-slate-100">

                                        {report.invalid.map((row) => (

                                            <tr key={row.rowNumber} className="align-top">

                                                <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-900 sm:px-6">
                                                    {row.rowNumber}
                                                </td>

                                                <td className="px-5 py-3 text-slate-600">

                                                    <p className="font-medium text-slate-800">
                                                        {row.values.name || (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </p>

                                                    <p className="text-xs text-slate-400">
                                                        {row.values.employeeId || "No employee ID"}
                                                    </p>

                                                </td>

                                                <td className="px-5 py-3 sm:pr-6">

                                                    <ul className="space-y-1">

                                                        {row.errors.map((error, index) => (

                                                            <li
                                                                key={`${row.rowNumber}-${index}`}
                                                                className="flex items-start gap-2 text-xs text-red-600"
                                                            >
                                                                <FiAlertCircle className="mt-0.5 shrink-0" />
                                                                <span>
                                                                    <span className="font-semibold">
                                                                        {error.field}:
                                                                    </span>{" "}
                                                                    {error.message}
                                                                </span>
                                                            </li>

                                                        ))}

                                                    </ul>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    )}

                    {/* Valid records */}
                    {report.valid.length > 0 && (

                        <div className={cardClass}>

                            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                                    <FiCheckCircle />
                                </div>

                                <div className="min-w-0">

                                    <h2 className="text-base font-semibold text-slate-900">
                                        Valid Records
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        An invitation link will be generated for each of these.
                                    </p>

                                </div>

                            </div>

                            <div className="max-h-96 overflow-auto">

                                <table className="w-full min-w-[52rem] text-left text-sm">

                                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                        <tr>
                                            <th className="px-5 py-3 font-semibold sm:px-6">Row</th>
                                            <th className="px-5 py-3 font-semibold">Employee ID</th>
                                            <th className="px-5 py-3 font-semibold">Name</th>
                                            <th className="px-5 py-3 font-semibold">Email</th>
                                            <th className="px-5 py-3 font-semibold">Mobile</th>
                                            <th className="px-5 py-3 font-semibold">Department</th>
                                            <th className="px-5 py-3 font-semibold">Designation</th>
                                            <th className="px-5 py-3 font-semibold">Joining</th>
                                            <th className="px-5 py-3 font-semibold sm:pr-6">Role</th>
                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-slate-100">

                                        {report.valid.map((row) => (

                                            <tr key={row.rowNumber} className="whitespace-nowrap">

                                                <td className="px-5 py-3 text-slate-400 sm:px-6">
                                                    {row.rowNumber}
                                                </td>

                                                <td className="px-5 py-3 font-semibold text-slate-900">
                                                    {row.values.employeeId.toUpperCase()}
                                                </td>

                                                <td className="px-5 py-3 text-slate-700">
                                                    {row.values.name}
                                                </td>

                                                <td className="px-5 py-3 text-slate-500">
                                                    {row.values.email}
                                                </td>

                                                <td className="px-5 py-3 text-slate-500">
                                                    {row.values.mobile}
                                                </td>

                                                <td className="px-5 py-3 text-slate-500">
                                                    {row.values.department}
                                                </td>

                                                <td className="px-5 py-3 text-slate-500">
                                                    {row.values.designation}
                                                </td>

                                                <td className="px-5 py-3 text-slate-500">
                                                    {row.values.joiningDate}
                                                </td>

                                                <td className="px-5 py-3 sm:pr-6">
                                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-blue-700">
                                                        {row.values.role}
                                                    </span>
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    )}

                    {/* Decision */}
                    <div className={`${cardClass} flex flex-col gap-3 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}>

                        <p className="flex items-start gap-2 text-xs text-slate-500 sm:items-center">

                            <FiInfo className="mt-0.5 shrink-0 text-slate-400 sm:mt-0" />

                            {report.valid.length
                                ? `${report.valid.length} valid record${report.valid.length === 1 ? "" : "s"} will be onboarded${report.invalid.length
                                    ? ` and ${report.invalid.length} invalid one${report.invalid.length === 1 ? "" : "s"} skipped`
                                    : ""
                                }. Nothing has been created yet.`
                                : "No valid records to onboard. Fix the errors above and import the file again."}

                        </p>

                        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">

                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={submitting}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FiX />
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleOnboardAll}
                                disabled={submitting || !report.valid.length}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
                            >
                                {submitting ? (
                                    <>
                                        <FiLoader className="animate-spin" />
                                        Onboarding {progress.done} of {progress.total}...
                                    </>
                                ) : (
                                    <>
                                        <FiSend />
                                        Onboard All
                                        {report.valid.length ? ` (${report.valid.length})` : ""}
                                    </>
                                )}
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/*
              Step 4 — Invitations
              One link per employee, plus the rows that fell over on the way in
              so nobody is quietly lost between the summary and here.
            */}
            {step === "result" && (

                <div className="space-y-6">

                    <div className="grid gap-4 sm:grid-cols-3">

                        <SummaryTile
                            icon={<FiFileText />}
                            tone="slate"
                            label="Processed"
                            value={results.length}
                            caption="Records sent for onboarding"
                        />

                        <SummaryTile
                            icon={<FiCheckCircle />}
                            tone="green"
                            label="Links Generated"
                            value={successful.length}
                            caption={`${emailedCount} emailed to the employee`}
                        />

                        <SummaryTile
                            icon={<FiXCircle />}
                            tone="red"
                            label="Failed"
                            value={results.length - successful.length}
                            caption="Could not be onboarded"
                        />

                    </div>

                    <div className={cardClass}>

                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                            <div className="flex min-w-0 items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <FiLink />
                                </div>

                                <div className="min-w-0">

                                    <h2 className="text-base font-semibold text-slate-900">
                                        Invitation Links
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        {emailReady
                                            ? "Email every invitation at once, or send them one at a time."
                                            : "Share each link with the employee it belongs to."}
                                    </p>

                                </div>

                            </div>

                            {successful.length > 0 && (

                                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">

                                    <button
                                        type="button"
                                        onClick={handleEmailAll}
                                        disabled={emailingAll || !emailReady}
                                        title={
                                            emailReady
                                                ? "Email every invitation that has not gone out yet"
                                                : "Email sending is not configured yet"
                                        }
                                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
                                    >
                                        {emailingAll ? (
                                            <>
                                                <FiLoader className="animate-spin" />
                                                Emailing...
                                            </>
                                        ) : (
                                            <>
                                                <FiMail />
                                                Email All
                                                {successful.length - emailedCount
                                                    ? ` (${successful.length - emailedCount})`
                                                    : ""}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyToClipboard(
                                                successful
                                                    .map(
                                                        (item) =>
                                                            `${item.employeeId} — ${item.name}: ${item.invitationLink}`
                                                    )
                                                    .join("\n"),
                                                "All invitation links copied."
                                            )
                                        }
                                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                    >
                                        <FiCopy />
                                        Copy All
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => exportInvitationLinks(results)}
                                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                    >
                                        <FiDownload />
                                        Download
                                    </button>

                                </div>

                            )}

                        </div>

                        <div className="overflow-x-auto">

                            <table className="w-full min-w-[58rem] text-left text-sm">

                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                    <tr>
                                        <th className="px-5 py-3 font-semibold sm:px-6">Employee</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">
                                            Invitation Link
                                        </th>
                                        <th className="px-5 py-3 font-semibold sm:pr-6">
                                            Invitation Email
                                        </th>
                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100">

                                    {results.map((item) => (

                                        <tr key={`${item.employeeId}-${item.rowNumber}`}>

                                            <td className="px-5 py-3 sm:px-6">

                                                <p className="font-semibold text-slate-900">
                                                    {item.name}
                                                </p>

                                                <p className="text-xs text-slate-400">
                                                    {item.employeeId}
                                                </p>

                                            </td>

                                            <td className="whitespace-nowrap px-5 py-3">

                                                {item.success ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                                        <FiCheckCircle size={12} />
                                                        Invitation Sent
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                                                        <FiXCircle size={12} />
                                                        Failed
                                                    </span>
                                                )}

                                            </td>

                                            <td className="px-5 py-3">

                                                {item.success ? (

                                                    <div className="flex items-center gap-2">

                                                        <span className="min-w-0 break-all font-mono text-xs text-slate-600">
                                                            {item.invitationLink}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            title="Copy link"
                                                            aria-label={`Copy invitation link for ${item.employeeId}`}
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    item.invitationLink,
                                                                    `Link for ${item.employeeId} copied.`
                                                                )
                                                            }
                                                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        >
                                                            <FiCopy size={14} />
                                                        </button>

                                                    </div>

                                                ) : (

                                                    <span className="text-xs text-red-500">
                                                        {item.message}
                                                    </span>

                                                )}

                                            </td>

                                            {/*
                                              One row, one send. The button stays after a
                                              success so a joiner who says they never got
                                              it can be sent it again without re-importing
                                              the file.
                                            */}
                                            <td className="px-5 py-3 sm:pr-6">

                                                {item.success ? (

                                                    <InvitationEmailCell
                                                        state={emailState[item.employeeId]}
                                                        disabled={!emailReady || emailingAll}
                                                        onSend={() => handleEmailOne(item)}
                                                    />

                                                ) : (

                                                    <span className="text-xs text-slate-300">—</span>

                                                )}

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                            <p className="flex items-center gap-2 text-xs text-slate-500">
                                <FiInfo className="shrink-0 text-slate-400" />
                                Each employee completes their own onboarding form from the
                                link, and the submission arrives under Onboarding Requests.
                            </p>

                            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">

                                <button
                                    type="button"
                                    onClick={handleStartOver}
                                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                >
                                    <FiRefreshCw />
                                    Import Another File
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/OnboardDashboard/OnBoardRequest")}
                                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
                                >
                                    View Onboarding Requests
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );
}

/*
| The email column for one row: a button, and whatever happened last time it
| was pressed. A failure keeps its reason next to it — "mailbox does not
| exist" and "the service is down" call for very different next moves, and a
| red cross alone tells the user neither.
*/
function InvitationEmailCell({ state, disabled, onSend }) {

    const status = state?.status;

    if (status === "sending") {

        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <FiLoader size={12} className="animate-spin" />
                Sending...
            </span>
        );
    }

    return (

        <div className="flex flex-col gap-1">

            <button
                type="button"
                onClick={onSend}
                disabled={disabled}
                className={`inline-flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 ${status === "sent"
                    ? "border-green-200 bg-green-50 text-green-700 hover:border-green-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600"
                    }`}
            >
                {status === "sent" ? (
                    <>
                        <FiCheckCircle size={12} />
                        Emailed — Resend
                    </>
                ) : (
                    <>
                        <FiMail size={12} />
                        {status === "failed" ? "Try Again" : "Send Email"}
                    </>
                )}
            </button>

            {status === "failed" && state.message && (

                <span className="flex items-start gap-1 text-[11px] leading-tight text-red-500">
                    <FiXCircle size={11} className="mt-0.5 shrink-0" />
                    {state.message}
                </span>

            )}

        </div>

    );
}

/* The three counts that open the summary and the result, one component. */
function SummaryTile({ icon, tone, label, value, caption }) {

    const tones = {
        slate: "bg-slate-100 text-slate-600",
        green: "bg-green-50 text-green-600",
        red: "bg-red-50 text-red-600",
    };

    return (

        <div className={`${cardClass} flex items-center gap-4 px-5 py-4`}>

            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone]}`}
            >
                {icon}
            </div>

            <div className="min-w-0">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                </p>

                <p className="text-2xl font-bold text-slate-900">
                    {value}
                </p>

                <p className="truncate text-xs text-slate-500">
                    {caption}
                </p>

            </div>

        </div>

    );
}

export default BulkOnboarding;
