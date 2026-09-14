import { useEffect, useMemo } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import { FiUserX } from "react-icons/fi";
import useAuth from "../../hooks/useAuth";
import useMyPayroll from "../../hooks/useMyPayroll";
import useRoleAccess from "../../hooks/useRoleAccess";
import MyPayrollHeader from "../../components/payroll/myPayroll/MyPayrollHeader";
import MyPayrollSummaryCards from "../../components/payroll/myPayroll/MyPayrollSummaryCards";
import MyPayrollMonthCard from "../../components/payroll/myPayroll/MyPayrollMonthCard";
import MyPayrollHistory from "../../components/payroll/myPayroll/MyPayrollHistory";
import { getCurrentEmployeeId } from "../../utils/attendance/attendanceRequestUtils";
import { MY_PAYROLL_PERMISSION } from "../../utils/Payroll/payrollConstants";
import { isPayrollOperator } from "../../utils/Payroll/payrollRun";
import {
  getFinancialYear,
  getFinancialYearOptions,
} from "../../utils/Payroll/financialYear";
import {
  buildMyPayrollRows,
  buildMyPayrollSummary,
} from "../../utils/Payroll/myPayroll";

/*
|--------------------------------------------------------------------------
| My Payroll
|--------------------------------------------------------------------------
| The signed in employee's own salary: what the financial year has come to,
| what the latest month was, and every payslip of the year.
|
| Only this employee is read. The payroll dashboard next door loads the whole
| directory and every record in a month, which is both far more than one
| person needs and other people's pay - so this is a separate page behind a
| separate permission rather than a panel on that one. An employee is given
| this and not that; a section switch could not have expressed it, because
| holding the payroll page at all would hand them the company's salaries.
|
| The whole page is one financial year, chosen once in the header. The summary
| sums it, the month card is the newest month in it and the history is all of
| it, so a single picker is what keeps the three from disagreeing.
|
| The year lives in the address rather than in state. Downloading a payslip
| leaves the page, and coming back to a year that had quietly reset to the
| current one is the kind of thing that reads as the app losing your place.
|--------------------------------------------------------------------------
*/

const FINANCIAL_YEAR_PARAM = "fy";

function MyPayroll() {

  const navigate = useNavigate();

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const employeeId = getCurrentEmployeeId(currentUser);

  const { canAccessSection } = useRoleAccess();

  const canSeeSummary = canAccessSection(MY_PAYROLL_PERMISSION.SUMMARY);
  const canSeeMonth = canAccessSection(MY_PAYROLL_PERMISSION.CURRENT_MONTH);
  const canSeeHistory = canAccessSection(MY_PAYROLL_PERMISSION.HISTORY);
  const canDownload = canAccessSection(MY_PAYROLL_PERMISSION.PAYSLIP);

  /*
  | Whoever runs payroll may read a month before it is closed, because they
  | have to in order to decide whether to close it. For everybody else a
  | payslip appears once the month is locked and its figures stop moving.
  |
  | It is the same question the payslip page asks, asked here so the buttons
  | on this page and the sheet they open can never disagree about whether a
  | month has been released.
  */
  const isOperator = useMemo(
    () => isPayrollOperator(canAccessSection),
    [canAccessSection]
  );

  /*
  | The years on offer: the current financial year and the four before it,
  | trimmed to the ones the employee has actually been employed for.
  */
  const yearOptions = useMemo(
    () =>
      getFinancialYearOptions({
        since: currentUser?.employmentInfo?.joiningDate,
      }),
    [currentUser]
  );

  const [searchParams, setSearchParams] = useSearchParams();

  /*
  | An address carrying a year nobody is offered - a stale link, or a hand
  | typed one - falls back to the current year rather than loading a year the
  | picker cannot show, which would leave the select sitting on nothing.
  */
  const requestedYear = searchParams.get(FINANCIAL_YEAR_PARAM);

  const financialYear = yearOptions.some(
    (option) => option.value === requestedYear
  )
    ? Number(requestedYear)
    : getFinancialYear();

  const setFinancialYear = (year) => {
    /*
    | Replaced rather than pushed. Flicking through four years and then
    | pressing Back should leave the page, not walk back through the years.
    */
    setSearchParams({ [FINANCIAL_YEAR_PARAM]: String(year) }, { replace: true });
  };

  const { records, salary, loading, error, reload } = useMyPayroll(
    companyCode,
    employeeId,
    financialYear
  );

  const rows = useMemo(
    () => buildMyPayrollRows(records, { isOperator, canDownload }),
    [records, isOperator, canDownload]
  );

  const summary = useMemo(
    () => buildMyPayrollSummary(records, salary),
    [records, salary]
  );

  /* The newest month of the year, which is what the card at the top shows. */
  const latest = rows[0] || null;

  /*
  | The navbar search filters the history table alongside the panel's own box,
  | which is the arrangement every other table in the product uses. Its
  | placeholder is set for this page and put back on the way out, so the next
  | page does not inherit it.
  */
  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  useEffect(() => {

    setSearchPlaceholder("Search month...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };

  }, [setSearch, setSearchPlaceholder]);

  const handleDownload = (payrollMonth) =>
    navigate(`/my-payroll/payslip?month=${payrollMonth}`);

  /*
  |--------------------------------------------------------------------------
  | No Employee Record
  |--------------------------------------------------------------------------
  | An owner signs in through Firebase Auth and carries no employee id, so
  | there is no payroll of their own to show. Saying so is better than an
  | empty year, which looks like a year nobody was paid for.
  */

  if (!employeeId) {

    return (

      <div className="p-0 sm:p-2">

        <MyPayrollHeader
          financialYear={financialYear}
          onFinancialYearChange={setFinancialYear}
          options={yearOptions}
          onRefresh={reload}
        />

        <div className="ui-card mt-6 flex flex-col items-center justify-center px-4 py-14 text-center sm:mt-8 sm:px-6 sm:py-20">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted text-ink-subtle">
            <FiUserX size={28} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
            No employee record linked
          </h3>

          <p className="mt-2 max-w-sm text-sm text-ink-subtle">
            This account is not linked to an employee, so it has no salary of
            its own. The company's payroll is on the payroll dashboard.
          </p>

        </div>

      </div>

    );

  }

  return (

    <div className="p-0 sm:p-2">

      <MyPayrollHeader
        financialYear={financialYear}
        onFinancialYearChange={setFinancialYear}
        options={yearOptions}
        onRefresh={reload}
        loading={loading}
        employeeName={currentUser?.personalInfo?.name}
      />

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        {/*
        | A read that broke is said once, above everything, rather than three
        | times inside three empty panels. The table below carries it too, so
        | the retry is offered where the rows would have been.
        */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 sm:p-4 sm:text-sm">
            {error}
          </div>
        )}

        {canSeeSummary && (
          <MyPayrollSummaryCards
            summary={summary}
            financialYear={financialYear}
            loading={loading}
          />
        )}

        {canSeeMonth && (
          <MyPayrollMonthCard
            row={latest}
            financialYear={financialYear}
            loading={loading}
            onDownload={handleDownload}
          />
        )}

        {canSeeHistory && (
          <MyPayrollHistory
            rows={rows}
            financialYear={financialYear}
            loading={loading}
            error={error}
            onRetry={reload}
            onDownload={handleDownload}
            headerSearch={search}
          />
        )}

      </div>

    </div>

  );

}

export default MyPayroll;
