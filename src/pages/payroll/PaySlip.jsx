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
const DESIGN_WIDTH = 900;
const MAX_SCALE = 1.5;

// Only a guard against degenerate measurements — not a readability floor.
const MIN_SCALE = 0.7;

/*
| The narrowest the design is worth scaling to. Under this the sheet would be
| shrunk past reading size, so it reflows to the compact layout instead — see
| the compact section of PaySlip.module.css.
|
| It is measured against the room the sheet actually has rather than the
| viewport, so a tablet whose sidebar is open reflows at the same point a
| phone does.
*/
const COMPACT_WIDTH = 720;

/*
| The printable area of an A4 portrait page: the sheet, less the `@page`
| margins the stylesheet asks for, less a few millimetres of slack so
| rounding — or a printer that keeps a little more of the edge for itself —
| can never tip the payslip onto a second page.
|
| CSS fixes 1in at 96px whatever the printer's real resolution is, so a
| millimetre is always the same number of the px the design is authored in.
*/
const MM_TO_PX = 96 / 25.4;
const PAGE_MARGIN_MM = 12;
const PAGE_SLACK_MM = 4;
const PRINT_WIDTH = (210 - PAGE_MARGIN_MM * 2 - PAGE_SLACK_MM) * MM_TO_PX;
const PRINT_HEIGHT = (277 - PAGE_MARGIN_MM * 2 - PAGE_SLACK_MM) * MM_TO_PX;

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

/*
| Every block down the sheet is the same object: a bordered table under a
| tinted bar that names it and runs its full width. Only the columns beneath
| the bar change from block to block, so the sheet reads as one document
| rather than a stack of unrelated panels.
*/
const Block = ({ heading, columns, className = "", children }) => (
  <table className={`${styles.blockTable} ${className}`}>
    <thead>
      <tr>
        <th colSpan={columns}>{heading}</th>
      </tr>
    </thead>

    <tbody>{children}</tbody>
  </table>
);

/* A label on the left and its one reading on the right, a line each. */
const DetailTable = ({ heading, className, rows }) => (
  <Block heading={heading} columns={2} className={className}>
    {rows.map((row) => (
      <tr key={row.label}>
        <th scope="row">{row.label}</th>
        <td className={row.tone ? styles[row.tone] : undefined}>{row.value}</td>
      </tr>
    ))}
  </Block>
);

/*
| Two label/value pairs to a line. Attendance is a column of small counts, and
| one pair per line would leave the block half empty and twice as tall as it
| needs to be.
*/
const PairTable = ({ heading, rows }) => {
  const lines = [];

  for (let index = 0; index < rows.length; index += 2) {
    lines.push([rows[index], rows[index + 1]]);
  }

  return (
    <Block heading={heading} columns={4} className={styles.pairTable}>
      {lines.map(([left, right]) => (
        <tr key={left.title}>
          <th scope="row">{left.title}</th>
          <td className={left.tone ? styles[left.tone] : undefined}>
            {left.value}
          </td>

          {right ? (
            <>
              <th scope="row">{right.title}</th>
              <td className={right.tone ? styles[right.tone] : undefined}>
                {right.value}
              </td>
            </>
          ) : (
            /* An odd number of counts leaves the last line half used. */
            <td className={styles.pairFiller} colSpan={2} />
          )}
        </tr>
      ))}
    </Block>
  );
};

/*
| Earnings and deductions are read across from one another, so their totals
| have to finish on the same line. `bodyRows` is the length of the longer of
| the two lists and the shorter one is padded out to it.
|
| The padding stays in the markup on the compact layout — where the two
| tables sit one above the other and have nothing to line up with — because
| the sheet is measured for print with the compact class taken off, and rows
| that were never rendered cannot be measured. It is hidden there instead.
*/
const AmountTable = ({ heading, rows, totalLabel, totalAmount, bodyRows }) => {
  const lines = rows.length > 0 ? rows : [{ title: "None", amount: 0 }];

  return (
    <Block heading={heading} columns={2} className={styles.amountTable}>
      {lines.map((item) => (
        <tr key={item.title}>
          <td>{item.title}</td>
          <td>{formatAmount(item.amount)}</td>
        </tr>
      ))}

      {Array.from(
        { length: Math.max(0, bodyRows - lines.length) },
        (_, index) => (
          <tr
            key={`filler-${index}`}
            className={styles.fillerRow}
            aria-hidden="true"
          >
            <td>&nbsp;</td>
            <td />
          </tr>
        )
      )}

      <tr className={styles.totalRow}>
        <td>{totalLabel}</td>
        <td>{formatAmount(totalAmount)}</td>
      </tr>
    </Block>
  );
};

/*
| A count is only worth colouring when it is not zero: a payslip with a green
| 0 next to "Present" and a red 0 next to "Absent" reads as though both mean
| something.
*/
const countTone = (value, tone) => (Number(value) > 0 ? tone : undefined);

/* Listed in reading order: the pair table fills each line left to right. */
const buildAttendanceRows = (summary = {}) => [
  { title: "Working Days", value: summary.workingDays ?? 0 },
  {
    title: "Present",
    value: summary.present ?? 0,
    tone: countTone(summary.present, "positive"),
  },
  {
    title: "Absent",
    value: summary.absent ?? 0,
    tone: countTone(summary.absent, "negative"),
  },
  { title: "Paid Leave", value: summary.paidLeave ?? 0 },
  { title: "Half Day", value: summary.halfDay ?? 0 },
  { title: "Weekly Off", value: summary.weeklyOff ?? 0 },
  { title: "Overtime", value: `${summary.overtimeHours ?? 0} hrs` },
];

const buildCalculationRows = (calculation = {}) => [
  { label: "Per Day Salary", value: formatAmount(calculation.perDaySalary) },
  { label: "Per Hour Salary", value: formatAmount(calculation.perHourSalary) },
  { label: "Payable Days", value: calculation.payableDays ?? 0 },
  {
    label: "LOP Days",
    value: calculation.lopDays ?? 0,
    tone: countTone(calculation.lopDays, "negative"),
  },
  {
    label: "LOP Deduction",
    value: formatAmount(calculation.lopDeduction),
    tone: countTone(calculation.lopDeduction, "negative"),
  },
  {
    label: "Overtime Pay",
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
  const [compact, setCompact] = useState(false);

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

      const isCompact = availableWidth < COMPACT_WIDTH;
      setCompact(isCompact);

      /*
      | Always measure the design layout, even while the compact one is the
      | one on screen: this height sizes the printed page, and print is given
      | the design sheet whatever the screen is showing. Dropping the class
      | and putting it back inside a single layout pass never reaches a paint,
      | and leaves the sheet the size the observer last saw it.
      */
      if (isCompact) sheet.classList.remove(styles.compact);
      const naturalHeight = sheet.offsetHeight;
      if (isCompact) sheet.classList.add(styles.compact);

      setDesignHeight(naturalHeight);

      // A reflowed sheet is already the width it should be; nothing to scale.
      if (isCompact) {
        setScale(1);
        return;
      }

      const widthScale = availableWidth / DESIGN_WIDTH;
      const heightScale = naturalHeight
        ? measureAvailableHeight(canvas) / naturalHeight
        : widthScale;

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
  | Half the page height the sheet does not use, which is the gap that puts
  | it on the middle of the page rather than under its top edge.
  |
  | It is measured in the sheet's own units rather than the page's, because
  | the box it pads is the one carrying the print zoom — see the print
  | section of PaySlip.module.css.
  */
  const printOffset = designHeight
    ? Math.max(0, (PRINT_HEIGHT / printZoom - designHeight) / 2)
    : 0;

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
    return <div className="p-4 text-sm sm:p-8 sm:text-base">Loading Payslip...</div>;
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
      <div className="space-y-4 p-4 sm:p-8">
        <div
          className={`rounded-lg px-4 py-3 text-sm sm:text-base ${
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto sm:text-base"
        >
          <FiArrowLeft />
          {backPath === "/payrolldashboard" ? "Back to Payroll" : "Go Back"}
        </button>
      </div>
    );
  }

  /* Who is being paid, and what the payment covers. */
  const employeeRows = [
    { label: "Employee Name", value: payroll.employee?.name || employeeId },
    { label: "Employee ID", value: payroll.employeeId },
    { label: "Department", value: payroll.employee?.department || "--" },
    { label: "Designation", value: payroll.employee?.designation || "--" },
    { label: "Pay Period", value: formatPayPeriod(selectedMonth) },
    { label: "Pay Date", value: formatPayrollDate(payroll.payPeriod?.payDate) },
  ];

  /* The line the two amount tables both have to reach before their totals. */
  const amountBodyRows = Math.max(1, earnings.length, deductions.length);

  return (
    <div className={styles.page}>
      <div ref={frameRef} className={styles.frame}>
        {/* Dropped by the print rules in the stylesheet */}
        <div
          className={`${styles.toolbar} ${compact ? styles.toolbarCompact : ""}`}
        >
          <button
            type="button"
            onClick={() => navigate("/payrolldashboard")}
            className={`${styles.downloadButton} ${styles.backButton}`}
          >
            <FiArrowLeft className="shrink-0" />
            Back
          </button>

          {/*
          | Only the months that were generated are offered, so choosing one
          | can never land on a payslip that does not exist.
          */}
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            aria-label="Payslip month"
            className={styles.monthSelect}
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
            <FiDownload className="shrink-0" />
            {/*
            | Sharing the line with Back leaves about half a phone for this
            | button, which "Download Payslip" does not fit — and the sheet
            | directly under it already says what is being downloaded.
            */}
            {compact ? "Download" : "Download Payslip"}
          </button>
        </div>

        <div
          ref={canvasRef}
          className={`${styles.canvas} ${compact ? styles.canvasCompact : ""}`}
          style={{
            "--payslip-width": `${DESIGN_WIDTH}px`,
            "--payslip-height": `${designHeight}px`,
            "--payslip-scale": scale,
            "--payslip-print-zoom": printZoom,
            "--payslip-print-offset": `${printOffset}px`,
          }}
        >
          <div
            ref={sheetRef}
            className={`${styles.sheet} ${compact ? styles.compact : ""}`}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                {/*
                | The company is named here and reached in the footer, so the
                | band is left holding one line and can give the name the room.
                */}
                <h2 className={styles.companyName}>
                  {company?.companyName || "Company"}
                </h2>
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

            {/* Employee Information */}
            <div className={styles.section}>
              <DetailTable
                heading="Employee Information"
                className={styles.detailTable}
                rows={employeeRows}
              />
            </div>

            {/* Earnings & Deductions, read across from one another */}
            <div className={styles.amountGrid}>
              <AmountTable
                heading="Earnings"
                rows={earnings}
                totalLabel="Total"
                totalAmount={calculation.totalEarnings}
                bodyRows={amountBodyRows}
              />

              <AmountTable
                heading="Deductions"
                rows={deductions}
                totalLabel="Total"
                totalAmount={calculation.totalDeductions}
                bodyRows={amountBodyRows}
              />
            </div>

            {/* Attendance Summary */}
            <div className={styles.section}>
              <PairTable
                heading="Attendance Summary"
                rows={buildAttendanceRows(payroll.attendanceSummary)}
              />
            </div>

            {/* Payroll Calculation */}
            <div className={styles.section}>
              <DetailTable
                heading="Payroll Calculation"
                className={styles.figureTable}
                rows={buildCalculationRows(calculation)}
              />
            </div>

            {/* Net Salary */}
            <div className={styles.netSalary}>
              <div className={styles.netBanner}>
                <span>Net Salary</span>
                <span className={styles.netAmount}>
                  {formatAmount(calculation.netPayable)}
                </span>
              </div>
            </div>

            {/*
            | Where to reach the company, closing the sheet the way the header
            | opens it: a full width band in the same purple, flush to the
            | edges rather than sitting in the body's inset column.
            */}
            <footer className={styles.footer}>
              <div className={styles.footerInner}>
                <div className={styles.footerBlock}>
                  <span className={styles.footerLabel}>Address</span>
                  <span className={styles.footerValue}>
                    {company?.address || "--"}
                  </span>
                </div>

                <div className={styles.footerBlock}>
                  <span className={styles.footerLabel}>Mobile</span>
                  <span className={styles.footerValue}>
                    {company?.phone || "--"}
                  </span>
                </div>

                <div className={styles.footerBlock}>
                  <span className={styles.footerLabel}>Email</span>
                  <span className={styles.footerValue}>
                    {company?.email || "--"}
                  </span>
                </div>
              </div>

              <p className={styles.footNote}>
                This is a computer-generated payslip.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySlip;
