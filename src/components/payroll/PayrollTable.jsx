import { useMemo, useState } from "react";
import { FiFileText, FiPlay, FiSearch } from "react-icons/fi";
import { TbReportMoney } from "react-icons/tb";
import {
  AttendancePanel,
  FilterSelect,
} from "../attendance/common/AttendancePanel";
import DataTable from "../attendance/common/DataTable";
import EmployeeCell from "../attendance/common/EmployeeCell";
import {
  PAYROLL_PAGE_SIZE,
  PAYROLL_PENDING,
  PAYROLL_STATUS,
  PAYROLL_STATUS_FILTERS,
} from "../../utils/Payroll/payrollConstants";
import { formatPayrollMonth } from "../../utils/Payroll/payrollDate";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import PayrollStatusBadge from "./common/PayrollStatusBadge";

/*
|--------------------------------------------------------------------------
| Payroll Table
|--------------------------------------------------------------------------
| Every employee on the register with the payroll status of the selected
| month, and the action that either runs it or opens the payslip.
|
| Filtering stays here while sorting and pagination live in `DataTable`,
| which is the split every attendance, leave and holiday table already uses.
|
| Columns are prioritised rather than all forced onto a phone: the employee,
| the amount and the action stay on every screen, and the department and the
| designation drop out as the viewport narrows. Both are repeated inside the
| employee cell, so nothing is lost on a small screen.
|--------------------------------------------------------------------------
*/

const HIDDEN_UNTIL = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

function PayrollTable({
  employees = [],
  loading = false,
  error = "",
  onRetry,
  payrollMonth,
  headerSearch = "",
  generating = "",
  isFutureMonth = false,
  generateGate = { allowed: true, reason: "" },
  onGenerate,
  onViewPayslip,
}) {

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  /*
  | The navbar search and the table's own box filter the same list, so a
  | keyword typed in either place narrows it.
  */
  const keyword = (search || headerSearch).trim().toLowerCase();

  const filtered = useMemo(() => {

    return employees.filter((employee) => {

      const matchesSearch =
        !keyword ||
        (employee.name || "").toLowerCase().includes(keyword) ||
        (employee.employeeId || "").toLowerCase().includes(keyword) ||
        (employee.department || "").toLowerCase().includes(keyword);

      const matchesStatus =
        !status ||
        (status === "generated" && employee.payrollGenerated) ||
        (status === "pending" && !employee.payrollGenerated);

      return matchesSearch && matchesStatus;

    });

  }, [employees, keyword, status]);

  /*
  | Written out in full rather than built from a breakpoint variable:
  | Tailwind generates its CSS by scanning the source for literal class
  | names, so an interpolated `${bp}:table-cell` would never be emitted.
  */

  const hideBelow = (breakpoint) => ({
    headerClassName: HIDDEN_UNTIL[breakpoint],
    className: HIDDEN_UNTIL[breakpoint],
  });

  const columns = [

    {
      key: "name",
      label: "Employee",
      sortable: true,
      render: (row) => (

        <div className="min-w-0">

          <EmployeeCell
            name={row.name}
            employeeId={row.employeeId}
          />

          {/*
          | The columns hidden at this width, folded in here. Each span is
          | hidden at exactly the breakpoint where its own column appears, so
          | a value is never shown twice and never missing in between.
          */}
          <p className="mt-1 truncate pl-14 text-xs text-slate-500 lg:hidden">

            <span className="md:hidden">
              {row.department || "--"}
              {row.designation ? " · " : ""}
            </span>

            {row.designation || ""}

          </p>

        </div>

      ),
    },

    {
      key: "department",
      label: "Department",
      sortable: true,
      ...hideBelow("md"),
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.department || "--"}
        </span>
      ),
    },

    {
      key: "designation",
      label: "Designation",
      ...hideBelow("lg"),
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.designation || "--"}
        </span>
      ),
    },

    {
      key: "netPayable",
      label: "Net Payable",
      sortable: true,
      align: "right",
      className: "whitespace-nowrap",
      render: (row) =>
        row.netPayable === null ? (
          <span className="text-sm text-slate-400">--</span>
        ) : (
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(row.netPayable)}
          </span>
        ),
    },

    {
      key: "payrollGenerated",
      label: "Status",
      sortable: true,
      align: "center",
      /*
      | A generated month carries its own status, so a payroll marked paid
      | says so instead of being flattened back to "Generated". A row with no
      | snapshot has none to read and is pending.
      */
      render: (row) => (
        <div className="flex justify-center">
          <PayrollStatusBadge
            status={
              row.payrollGenerated
                ? row.payrollStatus || PAYROLL_STATUS.GENERATED
                : PAYROLL_PENDING
            }
            size="sm"
          />
        </div>
      ),
    },

    {
      key: "actions",
      label: "Action",
      align: "right",
      className: "whitespace-nowrap",
      render: (row) => {

        if (row.payrollGenerated) {

          return (

            <button
              type="button"
              onClick={() => onViewPayslip(row.employeeId)}
              title="Open payslip"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >

              <FiFileText size={14} />

              Payslip

            </button>

          );

        }

        const busy = generating === row.employeeId;

        /*
        | The same gate the whole month run is behind. A row still says
        | "Generate" once the month is closed rather than hiding the button,
        | because the reason it cannot be pressed is the thing worth showing.
        */

        return (

          <button
            type="button"
            onClick={() => onGenerate(row.employeeId)}
            disabled={
              Boolean(generating) || isFutureMonth || !generateGate.allowed
            }
            title={
              isFutureMonth
                ? "This month has not started yet."
                : generateGate.allowed
                  ? "Generate payroll for this employee"
                  : generateGate.reason
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
          >

            <FiPlay size={14} className={busy ? "animate-pulse" : ""} />

            {busy ? "Generating..." : "Generate"}

          </button>

        );

      },
    },

  ];

  return (

    <AttendancePanel
      title="Employee Payroll"
      subtitle={`Payroll status for ${formatPayrollMonth(payrollMonth)}`}
      toolbar={
        <>

          {/* <div className="relative w-full lg:max-w-sm">

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div> */}

          <div className="w-full sm:w-52 lg:w-auto">

            <FilterSelect
              value={status}
              onChange={setStatus}
              options={PAYROLL_STATUS_FILTERS}
              placeholder="All Status"
              ariaLabel="Filter by payroll status"
            />

          </div>

        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.employeeId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton
        defaultSortBy="name"
        defaultSortOrder="asc"
        resetKey={`${keyword}|${status}`}
        pageSize={PAYROLL_PAGE_SIZE}
        paginationLabel="employees"
        /*
        | Grows with the columns that appear at each breakpoint, so a phone
        | scrolls a compact four column table instead of a 1100px one.
        */
        minWidthClass="min-w-[520px] md:min-w-[680px] lg:min-w-[880px]"
        loadingMessage="Loading payroll..."
        empty={{
          icon: <TbReportMoney size={28} />,
          title:
            employees.length === 0
              ? "No Employees Found"
              : "No Matching Employees",
          message:
            employees.length === 0
              ? "Employees added to the company will appear here."
              : "No one on the register matches this search or filter.",
        }}
      />

    </AttendancePanel>

  );

}

export default PayrollTable;
