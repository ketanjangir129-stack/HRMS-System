import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import { getPayrollHistory } from "../../services/payroll/PayRollServices";
import {
  buildPayslipDeductions,
  buildPayslipEarnings,
} from "../../utils/Payroll/Payrollcalculator";
import { PAYSLIP_MONTHS } from "../../utils/Payroll/payrollConstants";
import {
  canViewPayslip,
  isPayrollOperator,
} from "../../utils/Payroll/payrollRun";
import {
  formatPayrollDate,
  formatPayrollMonth,
  formatPayPeriod,
  getPayrollMonth,
  isPayrollMonth,
} from "../../utils/Payroll/payrollDate";
import {
  DEDUCTION_FIELDS,
  EARNING_FIELDS,
} from "../../utils/salary/salaryFields";
import { formatAmount } from "../../utils/salary/formatCurrency";
import styles from "./PaySlip.module.css";

/*
| The sheet is authored at this width and scaled to fit; see the header
| comment in PaySlip.module.css for how the two co-operate.
*/
const DESIGN_WIDTH = 800;
const MAX_SCALE = 1.5;

// Only a guard against degenerate measurements — not a readability floor.
const MIN_SCALE = 0.7;

/*
| A4 portrait at 96dpi minus the 10mm `@page` margins the stylesheet asks
| for: 210 - 20 = 190mm wide, 297 - 20 = 277mm tall, less a millimetre of
| slack so rounding can never tip the sheet onto a second page.
*/
const MM_TO_PX = 96 / 25.4;
const PRINT_WIDTH = 180 * MM_TO_PX;
const PRINT_HEIGHT = 256 * MM_TO_PX;

/* The element the payslip would scroll inside, if it were allowed to. */
const findScrollHost = (element) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return document.documentElement;
};

/*
| Room left for the sheet once the toolbar above it and the padding below it
| are accounted for. Every term is derived from where the canvas *sits*, not
| from how big it is — its size is the thing the scale controls, so measuring
| that would feed straight back into the next scale.
*/
const measureAvailableHeight = (canvas) => {
  const host = findScrollHost(canvas);

  const offset =
    canvas.getBoundingClientRect().top -
    host.getBoundingClientRect().top +
    host.scrollTop;

  // `clientHeight` covers the padding box, so padding below has to come off.
  let bottomInset = 0;
  for (let node = canvas.parentElement; node; node = node.parentElement) {
    bottomInset += parseFloat(getComputedStyle(node).paddingBottom) || 0;
    if (node === host) break;
  }

  return host.clientHeight - offset - bottomInset;
};

const AmountTable = ({ heading, rows, totalLabel, totalAmount }) => (
  <div className={styles.section}>
    <table className={styles.amountTable}>
      <thead>
        <tr>
          <th>{heading}</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td>None</td>
            <td>{formatAmount(0)}</td>
          </tr>
        ) : (
          rows.map((item) => (
            <tr key={item.title}>
              <td>{item.title}</td>
              <td>{formatAmount(item.amount)}</td>
            </tr>
          ))
        )}

        <tr className={styles.totalRow}>
          <td>{totalLabel}</td>
          <td>{formatAmount(totalAmount)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const DetailBlock = ({ className, rows }) => (
  <div className={className}>
    {rows.map((row) => (
      <p key={row.label}>
        <span>{row.label}:</span> {row.value}
      </p>
    ))}
  </div>
);

const SummaryCard = ({ heading, rows }) => (
  <div className={styles.card}>
    <div className={styles.cardHeading}>{heading}</div>

    <table className={styles.cardTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.title}>
            <td>{row.title}</td>
            <td className={row.tone ? styles[row.tone] : undefined}>
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/*
| A count is only worth colouring when it is not zero: a payslip with a green
| 0 next to "Present" and a red 0 next to "Absent" reads as though both mean
| something.
*/
const countTone = (value, tone) => (Number(value) > 0 ? tone : undefined);

const buildAttendanceRows = (summary = {}) => [
  { title: "Working Days", value: summary.workingDays ?? 0 },
  {
    title: "Present",
    value: summary.present ?? 0,
    tone: countTone(summary.present, "positive"),
  },
  // { title: "Late", value: summary.late ?? 0 },
  { title: "Half Day", value: summary.halfDay ?? 0 },
  { title: "Paid Leave", value: summary.paidLeave ?? 0 },
  {
    title: "Unpaid Leave",
    value: summary.unpaidLeave ?? 0,
    tone: countTone(summary.unpaidLeave, "negative"),
  },
  {
    title: "Absent",
    value: summary.absent ?? 0,
    tone: countTone(summary.absent, "negative"),
  },
  { title: "Holiday", value: summary.holiday ?? 0 },
  { title: "Weekly Off", value: summary.weeklyOff ?? 0 },
  { title: "Overtime Hours", value: summary.overtimeHours ?? 0 },
];

const buildCalculationRows = (calculation = {}) => [
  { title: "Per Day Salary", value: formatAmount(calculation.perDaySalary) },
  { title: "Per Hour Salary", value: formatAmount(calculation.perHourSalary) },
  { title: "Payable Days", value: calculation.payableDays ?? 0 },
  {
    title: "Loss Of Pay Days",
    value: calculation.lopDays ?? 0,
    tone: countTone(calculation.lopDays, "negative"),
  },
  {
    title: "LOP Deduction",
    value: formatAmount(calculation.lopDeduction),
    tone: countTone(calculation.lopDeduction, "negative"),
  },
  {
    title: "Overtime Pay",
    value: formatAmount(calculation.overtimePay),
    tone: countTone(calculation.overtimePay, "positive"),
  },
];

const PaySlip = () => {
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { company } = useAuth();
  const companyCode = company?.companyCode;

  const { canAccessSection, canAccessPage, fallbackPath } = useRoleAccess();

  /*
  | Whoever runs payroll may read a month before it is closed, because they
  | have to in order to decide whether to close it. For everybody else a
  | payslip appears when the month is locked and its figures stop moving.
  */
  const isOperator = useMemo(
    () => isPayrollOperator(canAccessSection),
    [canAccessSection]
  );

  /*
  | The month the dashboard was showing when the payslip was opened. It is the
  | newest of the three months on offer, so an older payroll can be printed by
  | opening the payslip from the month it belongs to as well as from here.
  */
  const requestedMonth = searchParams.get("month");

  const anchorMonth = isPayrollMonth(requestedMonth)
    ? requestedMonth
    : getPayrollMonth();

  const [payrolls, setPayrolls] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  | Why the page is empty when it is. A month that exists but has not been
  | released is a different answer from a month nobody has run, and telling
  | somebody "no payroll has been generated" when theirs is sitting there
  | waiting to be locked sends them to ask the wrong question.
  */
  const [withheld, setWithheld] = useState("");

  /*
  | The last three months of payroll, newest first, and only the ones that
  | were actually generated. The anchor month can be changed while a load is
  | still in flight, so a stale response is dropped.
  |
  | Months that have not been released are dropped here rather than further
  | down, so nothing that is not on offer reaches the month picker, the sheet
  | or the download.
  */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setWithheld("");

      try {
        const history =
          companyCode && employeeId
            ? await getPayrollHistory(
                companyCode,
                employeeId,
                anchorMonth,
                PAYSLIP_MONTHS
              )
            : [];

        if (cancelled) return;

        const released = history.filter(
          (item) => canViewPayslip(item.run, isOperator).allowed
        );

        setPayrolls(released);

        setWithheld(
          released.length === 0 && history.length > 0
            ? canViewPayslip(history[0].run, isOperator).reason
            : ""
        );

        // Open on the month that was asked for, or the newest one there is.
        setSelectedMonth(
          released.some((item) => item.payrollMonth === anchorMonth)
            ? anchorMonth
            : released[0]?.payrollMonth || ""
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setPayrolls([]);
          setSelectedMonth("");
          setError("Failed to load payslips.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [companyCode, employeeId, anchorMonth, isOperator]);

  const payroll = useMemo(
    () =>
      payrolls.find((item) => item.payrollMonth === selectedMonth) || null,
    [payrolls, selectedMonth]
  );

  const earnings = useMemo(
    () => buildPayslipEarnings(payroll, EARNING_FIELDS),
    [payroll]
  );

  const deductions = useMemo(
    () => buildPayslipDeductions(payroll, DEDUCTION_FIELDS),
    [payroll]
  );

  const calculation = payroll?.calculation || {};

  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const sheetRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [designHeight, setDesignHeight] = useState(0);

  /*
  | `offsetHeight` is the sheet's pre-transform height — both the size the
  | placeholder has to reserve and the height the scale is measured against.
  |
  | Re-run whenever the sheet appears or the month changes: the sheet is not
  | in the tree at all while the payslips are loading, and a month with fewer
  | earning lines is a shorter sheet.
  */
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const sheet = sheetRef.current;
    if (!frame || !canvas || !sheet) return;

    const measure = () => {
      const availableWidth = frame.clientWidth;
      if (!availableWidth) return;

      const naturalHeight = sheet.offsetHeight;
      const widthScale = availableWidth / DESIGN_WIDTH;
      const heightScale = naturalHeight
        ? measureAvailableHeight(canvas) / naturalHeight
        : widthScale;

      setDesignHeight(naturalHeight);
      setScale(
        Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, Math.min(widthScale, heightScale))
        )
      );
    };

    measure();

    /*
    | Neither observed box moves with the scale — the frame is laid out by
    | the shell and the sheet keeps its design size under a transform — so
    | this cannot feed back. The host covers the sidebar collapsing; the
    | window covers a viewport that changes height without changing width.
    */
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(sheet);
    observer.observe(findScrollHost(canvas));

    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [payroll]);

  /* Never enlarge for print — only shrink enough to land on one page. */
  const printZoom = designHeight
    ? Math.min(1, PRINT_WIDTH / DESIGN_WIDTH, PRINT_HEIGHT / designHeight)
    : 1;

  /*
  | The browser names the saved PDF after `document.title`, so swap in a
  | payslip filename for the duration of the print dialog and put the
  | original page title back once it closes.
  */
  const handleDownload = () => {
    const previousTitle = document.title;

    const fileName = `Payslip-${String(payroll?.employee?.name || employeeId).replace(/\s+/g, "-")}-${selectedMonth}`;

    const restoreTitle = () => {
      document.title = previousTitle;
    };

    window.addEventListener("afterprint", restoreTitle, { once: true });
    document.title = fileName;

    try {
      window.print();
    } finally {
      // Safari never fires `afterprint`; `print()` blocks there, so this is safe.
      if (document.title === fileName) {
        window.removeEventListener("afterprint", restoreTitle);
        restoreTitle();
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading Payslip...</div>;
  }

  if (error || !payroll) {
    /*
    | A payslip that is only waiting to be released is not a failure, so it
    | is not dressed as one. The red panel is kept for the two cases that
    | genuinely are: a read that broke, and a month nobody ran.
    */
    const isWaiting = !error && Boolean(withheld);

    /*
    | An employee sent back to the payroll dashboard lands on a page they
    | cannot open and is bounced somewhere else again, which reads as the app
    | losing them. They go wherever their role can actually go instead.
    */
    const backPath = canAccessPage("payroll")
      ? "/payrolldashboard"
      : fallbackPath || "/dashboard";

    return (
      <div className="p-8 space-y-4">
        <div
          className={`rounded-lg px-4 py-3 ${
            isWaiting
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "bg-red-100 text-red-700"
          }`}
        >
          {error ||
            withheld ||
            `No payroll has been generated for ${employeeId} in the last ${PAYSLIP_MONTHS} months.`}
        </div>

        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiArrowLeft />
          {backPath === "/payrolldashboard" ? "Back to Payroll" : "Go Back"}
        </button>
      </div>
    );
  }

  /*
  | Who is being paid, and what they are being paid for. They are two
  | different readings of the same block, so each gets its own column.
  */

  const employeeRows = [
    { label: "Employee Name", value: payroll.employee?.name || employeeId },
    { label: "Employee ID", value: payroll.employeeId },
    { label: "Department", value: payroll.employee?.department || "--" },
    { label: "Designation", value: payroll.employee?.designation || "--" },
  ];

  const payPeriodRows = [
    { label: "Pay Period", value: formatPayPeriod(selectedMonth) },
    { label: "Pay Day", value: formatPayrollDate(payroll.payPeriod?.payDate) },
  ];

  return (
    <div className={styles.page}>
      <div ref={frameRef} className={styles.frame}>
        {/* Dropped by the print rules in the stylesheet */}
        <div className={styles.toolbar}>
          <button
            type="button"
            onClick={() => navigate("/payrolldashboard")}
            className={styles.downloadButton}
            style={{ background: "#475569", marginRight: "auto" }}
          >
            <FiArrowLeft />
            Back
          </button>

          {/*
          | Only the months that were generated are offered, so choosing one
          | can never land on a payslip that does not exist.
          */}
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 mr-3 text-sm font-semibold bg-white"
          >
            {payrolls.map((item) => (
              <option key={item.payrollMonth} value={item.payrollMonth}>
                {formatPayrollMonth(item.payrollMonth)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleDownload}
            className={styles.downloadButton}
          >
            <FiDownload />
            Download Payslip
          </button>
        </div>

        <div
          ref={canvasRef}
          className={styles.canvas}
          style={{
            "--payslip-width": `${DESIGN_WIDTH}px`,
            "--payslip-height": `${designHeight}px`,
            "--payslip-scale": scale,
            "--payslip-print-zoom": printZoom,
          }}
        >
          <div ref={sheetRef} className={styles.sheet}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h2 className={styles.companyName}>
                  {company?.companyName || "Company"}
                </h2>
                <p className={styles.companyLine}>{company?.address || ""}</p>
                <p className={styles.companyLine}>{company?.email || ""}</p>
                <p className={styles.companyLine}>{company?.phone || ""}</p>

                <div className={styles.triangle} />
              </div>

              <div className={styles.headerRight}>
                <div className={styles.logo}>
                  <span className={styles.logoTop}>HRMS</span>
                  <span className={styles.logoMain}>SYSTEM</span>
                </div>
              </div>
            </div>

            <h1 className={styles.title}>Pay Slip</h1>

            {/* Employee Details */}
            <div className={styles.employee}>
              <DetailBlock
                className={styles.employeeDetails}
                rows={employeeRows}
              />

              <DetailBlock
                className={styles.payDetails}
                rows={payPeriodRows}
              />
            </div>

            <AmountTable
              heading="Earnings"
              rows={earnings}
              totalLabel="Total Earnings"
              totalAmount={calculation.totalEarnings}
            />

            <AmountTable
              heading="Deductions"
              rows={deductions}
              totalLabel="Total Deductions"
              totalAmount={calculation.totalDeductions}
            />

            {/* Attendance & Payroll Calculation */}
            <div className={styles.summaryGrid}>
              <SummaryCard
                heading="Attendance"
                rows={buildAttendanceRows(payroll.attendanceSummary)}
              />
              <SummaryCard
                heading="Payroll Calculation"
                rows={buildCalculationRows(calculation)}
              />
            </div>

            {/* Net Salary */}
            <div className={styles.netSalary}>
              <table className={styles.netSalaryTable}>
                <tbody>
                  <tr>
                    <td>Net Salary</td>
                    <td>{formatAmount(calculation.netPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySlip;
