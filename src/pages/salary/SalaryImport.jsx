import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiUploadCloud,
    FiDownload,
    FiAlertTriangle,
    FiCheckCircle,
    FiXCircle,
    FiInfo,
    FiUsers,
    FiRefreshCw,
    FiLock,
    FiFileText,
    FiSkipForward,
} from "react-icons/fi";
import { TbMoneybagEdit } from "react-icons/tb";
import { toast } from "react-toastify";
import { getEmployees } from "../../services/EmployeeService";
import { getAllSalary, importSalaries } from "../../services/SalaryService";
import { getHRPolicy } from "../../services/settings/hrPolicyService";
import {
    readSalaryImportFile,
    buildImportRows,
    MAX_IMPORT_ROWS,
} from "../../utils/salary/parseSalaryImport";
import {
    IMPORT_COLUMNS,
    IMPORT_GROUPS,
    EARNING_KEYS,
    DEDUCTION_KEYS,
    COLUMN_BY_KEY,
    POLICY_DRIVEN_KEYS,
} from "../../utils/salary/salaryImportColumns";
import { downloadSalaryImportTemplate } from "../../utils/salary/salaryImportTemplate";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import SalaryPageHeader from "../../components/salary/SalaryPageHeader";
import SalaryImportingOverlay from "../../components/salary/SalaryImportingOverlay";
import Loader from "../../components/common/Loader";
import Pagination from "../../components/common/pagination/Pagination";
import useRoleAccess from "../../hooks/useRoleAccess";
import usePagination from "../../hooks/usePagination";

/*
|--------------------------------------------------------------------------
| Import Salaries
|--------------------------------------------------------------------------
| Assigning salary structures to many employees from one spreadsheet.
|
| Three steps, and the file is never written on the way through them: it is
| read, every row is checked against the register and priced against the HR
| Policy, and the whole verdict is shown before anything is saved. A bulk
| write nobody could inspect first is how a hundred people get the wrong pay
| at once.
|
| A file with mistakes in it is not refused. The rows that are sound are
| imported and the rows that are not are listed with the line numbers they sit
| on in the user's own file, because a spreadsheet of two hundred employees
| with one bad cell should not have to be uploaded twice.
|
| It is a page rather than a dialog: the preview carries the employee, seven
| earnings, six deductions and three totals, which is a table that needs the
| width of the screen rather than the middle of it.
|--------------------------------------------------------------------------
*/

const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv";

const STEPS = [
    { key: "upload", label: "Upload File" },
    { key: "review", label: "Review" },
    { key: "done", label: "Result" },
];

// The bracketed half of a label is a definition, and a column heading has no
// room for one: "PF (Provident Fund)" is "PF" here.
const shortLabel = (key) =>
    COLUMN_BY_KEY[key].label.replace(/\s*\(.*\)\s*$/, "");

const groupColumns = (group) =>
    IMPORT_COLUMNS.filter((column) => column.group === group);

/*
| The counter tiles both the review and the result step are built from - the
| same card the salary register and the salary form use, so a figure means the
| same thing wherever the module shows one.
|
| Declared out here rather than inside the page: a component defined during a
| render is a new component type on every render, and React would throw the
| old one away and mount a fresh one each time the progress counter ticked.
*/
function StatTile({ title, value, subtitle, icon, iconBg, iconColor, bar }) {

    return (

        <div className="ui-card ui-card-interactive group relative overflow-hidden p-4 sm:p-6">

            <span className={`absolute left-0 top-0 h-1 w-full ${bar}`} />

            <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                    <p className="truncate text-xs font-medium text-ink-subtle sm:text-sm">
                        {title}
                    </p>

                    <h3 className="mt-1 text-3xl font-bold text-ink sm:mt-2 sm:text-4xl">
                        {value}
                    </h3>

                    <p className="mt-2 text-[11px] font-medium text-ink-subtle sm:text-xs">
                        {subtitle}
                    </p>

                </div>

                <div
                    className={`ui-tile h-10 w-10 text-lg transition group-hover:scale-110 sm:h-12 sm:w-12 sm:text-xl ${iconBg} ${iconColor}`}
                >
                    {icon}
                </div>

            </div>

        </div>

    );

}

function SalaryImport() {

    const navigate = useNavigate();

    const companyCode = localStorage.getItem("companyCode");

    const { canAccessSection } = useRoleAccess();

    const canCreate = canAccessSection("salary.create");

    /*
    | Revising a structure that already exists is a separate right from
    | assigning a new one, so somebody who only holds `salary.create` is not
    | offered the choice to overwrite.
    */
    const canUpdate = canAccessSection("salary.update");

    const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null"
    );

    // Same shape the salary form stamps a revision with, so a structure
    // revised by an import is attributed exactly like one revised by hand.
    const updatedBy = {
        employeeId:
            currentUser?.employmentInfo?.employeeId ||
            currentUser?.email ||
            "unknown",
        name:
            currentUser?.personalInfo?.name ||
            currentUser?.name ||
            "Unknown",
        role:
            currentUser?.account?.role ||
            currentUser?.role ||
            localStorage.getItem("role") ||
            "unknown",
    };

    const fileInputRef = useRef(null);

    const [step, setStep] = useState("upload");

    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState({});
    const [assignedIds, setAssignedIds] = useState(new Set());

    const [policy, setPolicy] = useState(null);
    const [policyError, setPolicyError] = useState("");

    const [dragging, setDragging] = useState(false);
    const [reading, setReading] = useState(false);

    const [fileName, setFileName] = useState("");
    const [unknownHeaders, setUnknownHeaders] = useState([]);
    const [rows, setRows] = useState([]);

    const [updateExisting, setUpdateExisting] = useState(false);

    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const [results, setResults] = useState([]);

    /*
    |----------------------------------------------------------------------
    | What The Check Is Made Against
    |----------------------------------------------------------------------
    | The register, who already has a structure, and the HR Policy. All three
    | are loaded once when the page opens rather than per file, so uploading a
    | corrected file re-checks instantly instead of re-reading the company.
    */
    const loadContext = async () => {

        setLoading(true);

        try {

            const [employeeData, salaries] = await Promise.all([
                getEmployees(companyCode),
                getAllSalary(companyCode),
            ]);

            setEmployees(employeeData || {});

            setAssignedIds(
                new Set(salaries.map((salary) => salary.employeeId))
            );

        }
        catch (error) {
            console.error(error);
            toast.error("Could not load the employee register.");
        }

        /*
        | The policy is read separately from the register: without it the four
        | statutory deductions fall back to whatever the file carried, which is
        | a usable import with a warning on it. Without the register there is
        | nothing to check an employee ID against at all.
        */
        try {
            setPolicy(await getHRPolicy(companyCode));
            setPolicyError("");
        }
        catch (error) {
            console.error(error);
            setPolicy(null);
            setPolicyError(
                error?.message ||
                "Could not load the HR Policy, so PF, ESI, Professional Tax and Income Tax will be taken from the file as they are entered."
            );
        }

        setLoading(false);

    };

    useEffect(() => {
        loadContext();
    }, []);

    /*
    |----------------------------------------------------------------------
    | Reading A File
    |----------------------------------------------------------------------
    */
    const handleFile = async (file) => {

        if (!file) return;

        const name = file.name || "";

        if (!/\.(xlsx|xls|csv)$/i.test(name)) {
            toast.error("Upload an Excel (.xlsx, .xls) or CSV file.");
            return;
        }

        setReading(true);

        try {

            const parsed = await readSalaryImportFile(file);

            if (!parsed.rows.length) {
                toast.error("There are no rows in this file.");
                return;
            }

            if (parsed.rows.length > MAX_IMPORT_ROWS) {
                toast.error(
                    `This file has ${parsed.rows.length} rows. Import at most ${MAX_IMPORT_ROWS} at a time.`
                );
                return;
            }

            const checked = buildImportRows({
                rows: parsed.rows,
                employees,
                assignedIds,
                policy,
            });

            setFileName(name);
            setUnknownHeaders(parsed.unknownHeaders);
            setRows(checked);
            setResults([]);
            errorPagination.resetPagination();
            validPagination.resetPagination();
            setStep("review");

        }
        catch (error) {
            console.error(error);
            toast.error(
                error?.message || "Could not read this file."
            );
        }
        finally {

            setReading(false);

            /*
            | Cleared so picking the same file again still fires `onChange` -
            | the obvious thing to do after fixing a row is to re-upload the
            | file under the name it already had.
            */
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

        }

    };

    const handleDrop = (event) => {

        event.preventDefault();

        setDragging(false);

        handleFile(event.dataTransfer?.files?.[0]);

    };

    const startOver = () => {

        setStep("upload");
        setFileName("");
        setRows([]);
        setResults([]);
        setUnknownHeaders([]);
        setProgress({ done: 0, total: 0 });

    };

    /*
    |----------------------------------------------------------------------
    | The Verdict
    |----------------------------------------------------------------------
    */
    const validRows = useMemo(
        () => rows.filter((row) => row.valid),
        [rows]
    );

    const errorRows = useMemo(
        () => rows.filter((row) => !row.valid),
        [rows]
    );

    const existingCount = useMemo(
        () => validRows.filter((row) => row.existing).length,
        [validRows]
    );

    // What pressing the button would actually write, once the choice about
    // employees who already have a structure is taken into account.
    const rowsToImport = useMemo(
        () =>
            updateExisting && canUpdate
                ? validRows
                : validRows.filter((row) => !row.existing),
        [validRows, updateExisting, canUpdate]
    );

    /*
    |----------------------------------------------------------------------
    | Pagination
    |----------------------------------------------------------------------
    | A file can carry up to MAX_IMPORT_ROWS employees, and a table that long
    | is not something anyone reads. Each of the three tables pages on its
    | own, and goes back to the first page when a new file (or a new result)
    | arrives - reset where that happens, in handleFile and handleImport.
    */
    const errorPagination = usePagination({
        data: errorRows,
        initialPageSize: 10,
    });

    const validPagination = usePagination({
        data: validRows,
        initialPageSize: 10,
    });

    const resultPagination = usePagination({
        data: results,
        initialPageSize: 10,
    });

    const renderPagination = (pagination) => (
        <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
        />
    );

    const handleImport = async () => {

        if (!canCreate) {
            toast.error("You are not allowed to import salaries.");
            return;
        }

        if (!rowsToImport.length) {
            toast.info("There is nothing to import.");
            return;
        }

        setImporting(true);
        setProgress({ done: 0, total: rowsToImport.length });

        try {

            const outcome = await importSalaries(
                companyCode,
                rowsToImport,
                {
                    updateExisting: updateExisting && canUpdate,
                    updatedBy,
                    onProgress: (done, total) =>
                        setProgress({ done, total }),
                }
            );

            setResults(outcome);
            resultPagination.resetPagination();
            setStep("done");

            const created = outcome.filter(
                (row) => row.outcome === "created"
            ).length;

            const updated = outcome.filter(
                (row) => row.outcome === "updated"
            ).length;

            const failed = outcome.filter(
                (row) => row.outcome === "failed"
            ).length;

            if (failed) {
                toast.warn(
                    `Imported ${created + updated}, but ${failed} could not be saved.`
                );
            }
            else {
                toast.success(
                    `Imported ${created + updated} salary ${created + updated === 1 ? "structure" : "structures"}.`
                );
            }

            // The register has moved on, so who counts as "already assigned"
            // has too - a second file uploaded after this one must be checked
            // against what is there now.
            const saved = outcome
                .filter((row) =>
                    row.outcome === "created" || row.outcome === "updated"
                )
                .map((row) => row.employeeId);

            setAssignedIds((previous) => {
                const next = new Set(previous);
                saved.forEach((id) => next.add(id));
                return next;
            });

        }
        catch (error) {
            console.error(error);
            toast.error(
                error?.message || "The import could not be completed."
            );
        }
        finally {
            setImporting(false);
        }

    };

    /*
    |----------------------------------------------------------------------
    | Pieces
    |----------------------------------------------------------------------
    */

    const policyDrivenNames = POLICY_DRIVEN_KEYS
        .filter((key) => {

            const priced = {
                pf: policy?.pf?.enabled,
                esi: policy?.esi?.enabled,
                professionalTax: policy?.professionalTax?.enabled,
                incomeTax: policy?.incomeTax?.enabled,
            };

            return Boolean(priced[key]);

        })
        .map(shortLabel);

    if (loading) {
        return (
            <div className="h-full w-full p-8">
                <Loader text="Loading employees..." />
            </div>
        );
    }

    return (

        <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

            <SalaryPageHeader
                title="Import Salaries"
                subtitle="Assign salary structures to many employees from one spreadsheet."
                icon={<TbMoneybagEdit />}
                backTo="/salarydashboard"
                backLabel="Salaries"
                action={
                    <span className="ui-badge bg-blue-50 text-blue-700">
                        {STEPS.findIndex((item) => item.key === step) + 1} of {STEPS.length}
                    </span>
                }
            />

            {/* Steps */}
            <ol className="ui-card flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 sm:px-6">

                {STEPS.map((item, index) => {

                    const position = STEPS.findIndex(
                        (entry) => entry.key === step
                    );

                    const done = index < position;
                    const current = index === position;

                    return (

                        <li
                            key={item.key}
                            className="flex items-center gap-3"
                        >

                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    done
                                        ? "bg-emerald-500 text-white"
                                        : current
                                            ? "bg-brand text-white"
                                            : "bg-surface-muted text-ink-faint"
                                }`}
                            >
                                {done ? "✓" : index + 1}
                            </span>

                            <span
                                className={`text-sm font-semibold ${
                                    current ? "text-ink" : "text-ink-subtle"
                                }`}
                            >
                                {item.label}
                            </span>

                            {index < STEPS.length - 1 && (
                                <span className="hidden h-px w-8 bg-line sm:block" />
                            )}

                        </li>

                    );

                })}

            </ol>

            {/*
            | The HR Policy could not be read. Said here rather than only on the
            | review screen, because it changes what the file itself should
            | carry: with no policy the four statutory columns are the user's
            | to fill in.
            */}
            {policyError && (

                <div className="ui-card flex items-start gap-3 border-amber-200 bg-amber-50 px-5 py-4">

                    <FiAlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-sm text-amber-900">
                        {policyError}
                    </p>

                </div>

            )}

            {/*
            |==================================================================
            | Step 1 - Upload
            |==================================================================
            */}
            {step === "upload" && (

                <>

                    <div className="ui-card ui-card-body">

                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-center gap-3">

                                <div className="ui-tile ui-tile-sm bg-blue-50 text-brand">
                                    <FiUploadCloud size={20} />
                                </div>

                                <div>

                                    <h2 className="ui-card-title">
                                        Upload Salary File
                                    </h2>

                                    <p className="ui-card-subtitle">
                                        Excel or CSV, using the template's columns.
                                    </p>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    downloadSalaryImportTemplate();
                                    toast.success("Template downloaded.");
                                }}
                                className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
                            >
                                <FiDownload />
                                Download Template
                            </button>

                        </div>

                        <div
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                                dragging
                                    ? "border-brand bg-blue-50"
                                    : "border-line bg-surface-muted/60"
                            }`}
                        >

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_FILE_TYPES}
                                className="hidden"
                                onChange={(event) =>
                                    handleFile(event.target.files?.[0])
                                }
                            />

                            {reading ? (

                                <>

                                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-ring border-t-brand" />

                                    <p className="mt-4 text-sm font-semibold text-ink">
                                        Reading the file...
                                    </p>

                                </>

                            ) : (

                                <>

                                    <FiUploadCloud
                                        size={40}
                                        className="text-ink-faint"
                                    />

                                    <p className="mt-4 text-sm font-semibold text-ink">
                                        Drag a file here, or choose one
                                    </p>

                                    <p className="mt-1 text-xs text-ink-subtle">
                                        .xlsx, .xls or .csv - up to {MAX_IMPORT_ROWS} employees
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="ui-btn ui-btn-primary mt-5 font-semibold"
                                    >
                                        <FiFileText />
                                        Choose File
                                    </button>

                                </>

                            )}

                        </div>

                    </div>

                    {/*
                    | What the file is expected to carry, in the three bands the
                    | template groups its columns into. It is the same list the
                    | parser reads, so the guide cannot describe a column the
                    | import does not accept.
                    */}
                    <div className="ui-card ui-card-body">

                        <h2 className="ui-card-title">
                            Columns
                        </h2>

                        <p className="ui-card-subtitle">
                            Required columns are marked with a star in the template.
                            Any column the file is missing is treated as empty.
                        </p>

                        {policyDrivenNames.length > 0 && (

                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">

                                <FiInfo
                                    size={16}
                                    className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <p className="text-xs text-blue-900 sm:text-sm">
                                    {policyDrivenNames.join(", ")}{" "}
                                    {policyDrivenNames.length === 1 ? "is" : "are"}{" "}
                                    calculated from your company's HR Policy, exactly as on
                                    the salary form. Whatever the file carries in{" "}
                                    {policyDrivenNames.length === 1 ? "that column" : "those columns"}{" "}
                                    is replaced by the policy's own figure.
                                </p>

                            </div>

                        )}

                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

                            {[
                                {
                                    group: IMPORT_GROUPS.EMPLOYEE,
                                    icon: <FiUsers />,
                                    tone: "bg-blue-50 text-blue-600",
                                },
                                {
                                    group: IMPORT_GROUPS.EARNINGS,
                                    icon: <FiCheckCircle />,
                                    tone: "bg-emerald-50 text-emerald-600",
                                },
                                {
                                    group: IMPORT_GROUPS.DEDUCTIONS,
                                    icon: <FiXCircle />,
                                    tone: "bg-red-50 text-red-600",
                                },
                            ].map(({ group, icon, tone }) => (

                                <div key={group}>

                                    <div className="mb-3 flex items-center gap-2">

                                        <div className={`ui-tile ui-tile-sm ${tone}`}>
                                            {icon}
                                        </div>

                                        <h3 className="text-sm font-bold text-ink">
                                            {group}
                                        </h3>

                                    </div>

                                    <ul className="space-y-2">

                                        {groupColumns(group).map((column) => (

                                            <li
                                                key={column.key}
                                                className="rounded-xl border border-line-subtle bg-surface-muted/50 px-3 py-2"
                                            >

                                                <div className="flex items-center gap-2">

                                                    <span className="text-sm font-semibold text-ink">
                                                        {column.label}
                                                    </span>

                                                    {column.required && (
                                                        <span className="ui-badge bg-red-50 text-red-700">
                                                            Required
                                                        </span>
                                                    )}

                                                    {column.readOnly && (
                                                        <FiLock
                                                            size={12}
                                                            className="shrink-0 text-slate-400"
                                                            title="Calculated from the HR Policy"
                                                        />
                                                    )}

                                                </div>

                                                {(column.note ||
                                                    column.readOnly) && (

                                                    <p className="mt-1 text-xs text-ink-subtle">
                                                        {column.note ||
                                                            "Calculated from your company's HR Policy"}
                                                    </p>

                                                )}

                                            </li>

                                        ))}

                                    </ul>

                                </div>

                            ))}

                        </div>

                    </div>

                </>

            )}

            {/*
            |==================================================================
            | Step 2 - Review
            |==================================================================
            */}
            {step === "review" && (

                <>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">

                        <StatTile
                            title="Rows Found"
                            value={rows.length}
                            subtitle={fileName || "In the uploaded file"}
                            icon={<FiFileText />}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            bar="bg-blue-500"
                        />

                        <StatTile
                            title="Ready To Import"
                            value={rowsToImport.length}
                            subtitle="Will be saved"
                            icon={<FiCheckCircle />}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            bar="bg-emerald-500"
                        />

                        <StatTile
                            title="Already Assigned"
                            value={existingCount}
                            subtitle={
                                updateExisting && canUpdate
                                    ? "Will be revised"
                                    : "Will be skipped"
                            }
                            icon={<FiSkipForward />}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            bar="bg-amber-500"
                        />

                        <StatTile
                            title="Rows With Errors"
                            value={errorRows.length}
                            subtitle="Will not be imported"
                            icon={<FiAlertTriangle />}
                            iconBg="bg-red-50"
                            iconColor="text-red-600"
                            bar="bg-red-500"
                        />

                    </div>

                    {/*
                    | Headings the file carried that we do not read. Worth
                    | naming: a column somebody renamed is silently empty
                    | otherwise, and they would only find out from the amounts.
                    */}
                    {unknownHeaders.length > 0 && (

                        <div className="ui-card flex items-start gap-3 border-amber-200 bg-amber-50 px-5 py-4">

                            <FiAlertTriangle
                                size={18}
                                className="mt-0.5 shrink-0 text-amber-600"
                            />

                            <p className="text-sm text-amber-900">

                                <span className="font-semibold">
                                    These columns were ignored:
                                </span>{" "}
                                {unknownHeaders.join(", ")}. Rename them to match the
                                template if they were meant to be imported.

                            </p>

                        </div>

                    )}

                    {/*
                    |==============================================================
                    | Errors
                    |==============================================================
                    | Listed before the rows that are fine, and against the line
                    | number in the user's own file so a mistake can be found
                    | where it actually is.
                    */}
                    {errorRows.length > 0 && (

                        <div className="ui-card overflow-hidden">

                            <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">

                                <div className="ui-tile ui-tile-sm bg-red-50 text-red-600">
                                    <FiAlertTriangle size={20} />
                                </div>

                                <div>

                                    <h2 className="ui-card-title">
                                        {errorRows.length}{" "}
                                        {errorRows.length === 1 ? "Row" : "Rows"} With Errors
                                    </h2>

                                    <p className="ui-card-subtitle">
                                        These are not imported. Everything else still is.
                                    </p>

                                </div>

                            </div>

                            <div className="ui-scroll overflow-x-auto">

                                <table className="w-full min-w-[640px] text-left">

                                    <thead className="bg-surface-muted/60">

                                        <tr>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                                Row
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                                Employee
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                                What Is Wrong
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-line-subtle">

                                        {errorPagination.paginatedData.map((row) => (

                                            <tr key={row.rowNumber}>

                                                <td className="whitespace-nowrap px-5 py-4 align-top text-sm font-semibold text-ink sm:px-6">
                                                    {row.rowNumber}
                                                </td>

                                                <td className="px-5 py-4 align-top sm:px-6">

                                                    <p className="text-sm font-semibold text-ink">
                                                        {row.name || "--"}
                                                    </p>

                                                    <p className="text-xs text-ink-subtle">
                                                        {row.employeeId || "No ID"}
                                                    </p>

                                                </td>

                                                <td className="px-5 py-4 align-top sm:px-6">

                                                    <ul className="space-y-1">

                                                        {row.errors.map((error, index) => (

                                                            <li
                                                                key={index}
                                                                className="flex items-start gap-2 text-sm text-red-700"
                                                            >

                                                                <FiXCircle
                                                                    size={14}
                                                                    className="mt-0.5 shrink-0"
                                                                />

                                                                {error}

                                                            </li>

                                                        ))}

                                                    </ul>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                            {renderPagination(errorPagination)}

                        </div>

                    )}

                    {/*
                    |==============================================================
                    | The Rows That Will Be Imported
                    |==============================================================
                    | Employee details, the earnings, the deductions and the three
                    | totals, banded the way the salary form lays them out - so
                    | what is about to be written can be read the same way it will
                    | be read afterwards.
                    */}
                    {validRows.length > 0 && (

                        <div className="ui-card overflow-hidden">

                            <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="ui-tile ui-tile-sm bg-emerald-50 text-emerald-600">
                                        <FiCheckCircle size={20} />
                                    </div>

                                    <div>

                                        <h2 className="ui-card-title">
                                            {validRows.length}{" "}
                                            {validRows.length === 1 ? "Row" : "Rows"} Ready
                                        </h2>

                                        <p className="ui-card-subtitle">
                                            Checked against the register and priced against the HR Policy.
                                        </p>

                                    </div>

                                </div>

                                {/*
                                | Offered only when there is something it would
                                | change, and only to somebody allowed to revise a
                                | structure. Off by default: overwriting salaries
                                | in bulk is the destructive reading of the file,
                                | and it should be asked for rather than assumed.
                                */}
                                {existingCount > 0 && canUpdate && (

                                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-muted/60 px-4 py-3">

                                        <input
                                            type="checkbox"
                                            checked={updateExisting}
                                            onChange={(event) =>
                                                setUpdateExisting(event.target.checked)
                                            }
                                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                                        />

                                        <span className="text-sm text-ink-muted">

                                            <span className="font-semibold text-ink">
                                                Update the {existingCount} employee
                                                {existingCount === 1 ? "" : "s"} who already
                                                {existingCount === 1 ? " has" : " have"} a salary
                                            </span>

                                            <span className="block text-xs text-ink-subtle">
                                                The current structure is saved to salary history first.
                                            </span>

                                        </span>

                                    </label>

                                )}

                            </div>

                            <div className="ui-scroll overflow-x-auto">

                                <table className="w-full min-w-[1400px] text-left">

                                    <thead className="bg-surface-muted/60">

                                        <tr>

                                            <th
                                                rowSpan={2}
                                                className="border-r border-line-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle"
                                            >
                                                Row
                                            </th>

                                            <th
                                                colSpan={2}
                                                className="border-r border-line-subtle px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-blue-700"
                                            >
                                                {IMPORT_GROUPS.EMPLOYEE}
                                            </th>

                                            <th
                                                colSpan={EARNING_KEYS.length + 1}
                                                className="border-r border-line-subtle bg-emerald-50/50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-700"
                                            >
                                                {IMPORT_GROUPS.EARNINGS}
                                            </th>

                                            <th
                                                colSpan={DEDUCTION_KEYS.length + 1}
                                                className="border-r border-line-subtle bg-red-50/50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-700"
                                            >
                                                {IMPORT_GROUPS.DEDUCTIONS}
                                            </th>

                                            <th
                                                rowSpan={2}
                                                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-subtle"
                                            >
                                                Net Salary
                                            </th>

                                        </tr>

                                        <tr>

                                            <th className="px-4 py-2 text-xs font-semibold text-ink-subtle">
                                                Employee
                                            </th>

                                            <th className="border-r border-line-subtle px-4 py-2 text-xs font-semibold text-ink-subtle">
                                                Effective From
                                            </th>

                                            {EARNING_KEYS.map((key) => (

                                                <th
                                                    key={key}
                                                    className="whitespace-nowrap bg-emerald-50/30 px-4 py-2 text-right text-xs font-semibold text-ink-subtle"
                                                >
                                                    {shortLabel(key)}
                                                </th>

                                            ))}

                                            <th className="whitespace-nowrap border-r border-line-subtle bg-emerald-50/50 px-4 py-2 text-right text-xs font-bold text-emerald-700">
                                                Gross
                                            </th>

                                            {DEDUCTION_KEYS.map((key) => (

                                                <th
                                                    key={key}
                                                    className="whitespace-nowrap bg-red-50/30 px-4 py-2 text-right text-xs font-semibold text-ink-subtle"
                                                >

                                                    <span className="inline-flex items-center gap-1">

                                                        {shortLabel(key)}

                                                        {/*
                                                        | Marked where the figure
                                                        | came from the policy
                                                        | rather than the file, so
                                                        | an amount that is not
                                                        | what was typed says so.
                                                        */}
                                                        {POLICY_DRIVEN_KEYS.includes(key) &&
                                                            policyDrivenNames.includes(shortLabel(key)) && (

                                                            <FiLock
                                                                size={10}
                                                                className="shrink-0 text-slate-400"
                                                                title="From the HR Policy"
                                                            />

                                                        )}

                                                    </span>

                                                </th>

                                            ))}

                                            <th className="whitespace-nowrap border-r border-line-subtle bg-red-50/50 px-4 py-2 text-right text-xs font-bold text-red-700">
                                                Total
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-line-subtle">

                                        {validPagination.paginatedData.map((row) => (

                                            <tr
                                                key={row.rowNumber}
                                                className="hover:bg-surface-muted/40"
                                            >

                                                <td className="border-r border-line-subtle px-4 py-3 text-sm text-ink-subtle">
                                                    {row.rowNumber}
                                                </td>

                                                <td className="px-4 py-3">

                                                    <p className="whitespace-nowrap text-sm font-semibold text-ink">
                                                        {row.name || "--"}
                                                    </p>

                                                    <p className="whitespace-nowrap text-xs text-ink-subtle">

                                                        {row.employeeId}

                                                        {row.existing && (

                                                            <span className="ml-2 ui-badge bg-amber-50 text-amber-700">
                                                                {updateExisting && canUpdate
                                                                    ? "Revise"
                                                                    : "Skip"}
                                                            </span>

                                                        )}

                                                    </p>

                                                </td>

                                                <td className="whitespace-nowrap border-r border-line-subtle px-4 py-3 text-sm text-ink-muted">
                                                    {row.effectiveFrom || "--"}
                                                </td>

                                                {EARNING_KEYS.map((key) => (

                                                    <td
                                                        key={key}
                                                        className="whitespace-nowrap px-4 py-3 text-right text-sm text-ink-muted"
                                                    >
                                                        {row.earnings[key]
                                                            ? formatCurrency(row.earnings[key])
                                                            : "--"}
                                                    </td>

                                                ))}

                                                <td className="whitespace-nowrap border-r border-line-subtle bg-emerald-50/30 px-4 py-3 text-right text-sm font-bold text-emerald-700">
                                                    {formatCurrency(row.grossSalary)}
                                                </td>

                                                {DEDUCTION_KEYS.map((key) => (

                                                    <td
                                                        key={key}
                                                        className="whitespace-nowrap px-4 py-3 text-right text-sm text-ink-muted"
                                                    >
                                                        {row.deductions[key]
                                                            ? formatCurrency(row.deductions[key])
                                                            : "--"}
                                                    </td>

                                                ))}

                                                <td className="whitespace-nowrap border-r border-line-subtle bg-red-50/30 px-4 py-3 text-right text-sm font-bold text-red-700">
                                                    {formatCurrency(row.totalDeduction)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-ink">
                                                    {formatCurrency(row.netSalary)}
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                            {renderPagination(validPagination)}

                        </div>

                    )}

                    {/* Actions */}
                    <div className="ui-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                        <p className="text-sm text-ink-subtle">
                            {rowsToImport.length
                                ? `${rowsToImport.length} of ${rows.length} rows will be saved.`
                                : "Nothing in this file can be imported yet."}
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                            <button
                                type="button"
                                onClick={startOver}
                                className="ui-btn ui-btn-secondary font-semibold"
                            >
                                <FiRefreshCw size={16} />
                                Upload A Different File
                            </button>

                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={!rowsToImport.length || importing}
                                className="ui-btn ui-btn-primary font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FiCheckCircle size={18} />
                                Import {rowsToImport.length || ""} {rowsToImport.length === 1 ? "Salary" : "Salaries"}
                            </button>

                        </div>

                    </div>

                </>

            )}

            {/*
            |==================================================================
            | Step 3 - Result
            |==================================================================
            */}
            {step === "done" && (

                <>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">

                        <StatTile
                            title="Assigned"
                            value={
                                results.filter((row) => row.outcome === "created").length
                            }
                            subtitle="New salary structures"
                            icon={<FiCheckCircle />}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            bar="bg-emerald-500"
                        />

                        <StatTile
                            title="Revised"
                            value={
                                results.filter((row) => row.outcome === "updated").length
                            }
                            subtitle="Saved to salary history"
                            icon={<TbMoneybagEdit />}
                            iconBg="bg-blue-50"
                            iconColor="text-blue-600"
                            bar="bg-blue-500"
                        />

                        <StatTile
                            title="Skipped"
                            value={
                                results.filter((row) => row.outcome === "skipped").length +
                                errorRows.length
                            }
                            subtitle="Errors or already assigned"
                            icon={<FiSkipForward />}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            bar="bg-amber-500"
                        />

                        <StatTile
                            title="Failed"
                            value={
                                results.filter((row) => row.outcome === "failed").length
                            }
                            subtitle="Could not be saved"
                            icon={<FiXCircle />}
                            iconBg="bg-red-50"
                            iconColor="text-red-600"
                            bar="bg-red-500"
                        />

                    </div>

                    <div className="ui-card overflow-hidden">

                        <div className="border-b border-line px-5 py-4 sm:px-6">

                            <h2 className="ui-card-title">
                                Import Result
                            </h2>

                            <p className="ui-card-subtitle">
                                Every row that was sent, and what happened to it.
                            </p>

                        </div>

                        <div className="ui-scroll overflow-x-auto">

                            <table className="w-full min-w-[640px] text-left">

                                <thead className="bg-surface-muted/60">

                                    <tr>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                            Row
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                            Employee
                                        </th>

                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                            Net Salary
                                        </th>

                                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:px-6">
                                            Outcome
                                        </th>

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-line-subtle">

                                    {resultPagination.paginatedData.map((row) => {

                                        const tone =
                                            row.outcome === "created" ||
                                            row.outcome === "updated"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : row.outcome === "failed"
                                                    ? "bg-red-50 text-red-700"
                                                    : "bg-amber-50 text-amber-700";

                                        return (

                                            <tr key={row.rowNumber}>

                                                <td className="px-5 py-4 text-sm text-ink-subtle sm:px-6">
                                                    {row.rowNumber}
                                                </td>

                                                <td className="px-5 py-4 sm:px-6">

                                                    <p className="text-sm font-semibold text-ink">
                                                        {row.name || "--"}
                                                    </p>

                                                    <p className="text-xs text-ink-subtle">
                                                        {row.employeeId}
                                                    </p>

                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-ink sm:px-6">
                                                    {formatCurrency(row.netSalary)}
                                                </td>

                                                <td className="px-5 py-4 sm:px-6">

                                                    <span className={`ui-badge ${tone}`}>
                                                        {row.outcome}
                                                    </span>

                                                    <p className="mt-1 text-xs text-ink-subtle">
                                                        {row.message}
                                                    </p>

                                                </td>

                                            </tr>

                                        );

                                    })}

                                </tbody>

                            </table>

                        </div>

                        {renderPagination(resultPagination)}

                    </div>

                    <div className="ui-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">

                        <button
                            type="button"
                            onClick={startOver}
                            className="ui-btn ui-btn-secondary font-semibold"
                        >
                            <FiUploadCloud size={16} />
                            Import Another File
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/salarydashboard")}
                            className="ui-btn ui-btn-primary font-semibold"
                        >
                            <TbMoneybagEdit size={18} />
                            Back To Salaries
                        </button>

                    </div>

                </>

            )}

            <SalaryImportingOverlay
                open={importing}
                done={progress.done}
                total={progress.total}
            />

        </div>

    );

}

export default SalaryImport;
