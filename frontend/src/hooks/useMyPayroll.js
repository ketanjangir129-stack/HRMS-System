import { useCallback, useEffect, useState } from "react";
import { getEmployeePayrollMonths } from "../services/payroll/PayRollServices";
import { getSalary } from "../services/SalaryService";
import { getFinancialYearMonths } from "../utils/Payroll/financialYear";

/*
|--------------------------------------------------------------------------
| My Payroll
|--------------------------------------------------------------------------
| One employee's financial year: every month of payroll that was generated
| for them, newest first, plus the salary structure they are currently on.
|
| Only this employee is read. The payroll dashboard loads the whole directory
| and every record in a month, which is both far more than one person needs
| and other people's pay; here the read is scoped to the one employee from the
| start and the twelve months are fetched in parallel.
|
| The structure is loaded alongside because it is the only place an *annual*
| figure can come from. A financial year that is three months old has three
| months of payroll in it, and summing those would report a year's CTC as a
| quarter of itself - see `buildMyPayrollSummary`.
|
| The two are loaded together rather than in separate hooks so the page has a
| single loading state. Half a page of figures arriving before the other half
| reads as numbers changing under the reader.
|--------------------------------------------------------------------------
*/

function useMyPayroll(companyCode, employeeId, financialYear) {

  const [records, setRecords] = useState([]);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Bumped by `reload`, which is the only thing that re-reads a year. */
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {

    /*
    | The year can be changed while a read is still in flight, so the response
    | of the year that was left behind is dropped rather than painted over the
    | one that is now on screen.
    */
    let cancelled = false;

    const load = async () => {

      setLoading(true);
      setError("");

      try {

        /*
        | An account with no employee record - the owner signs in through
        | Firebase Auth and carries no employee id - has no payroll of its
        | own. It settles as empty rather than reading a path built out of a
        | missing id, and the page says so.
        */
        const [months, structure] =
          companyCode && employeeId && financialYear
            ? await Promise.all([
              getEmployeePayrollMonths(
                companyCode,
                employeeId,
                getFinancialYearMonths(financialYear)
              ),
              getSalary(companyCode, employeeId),
            ])
            : [[], null];

        if (cancelled) return;

        /*
        | Newest first. The months arrive in April to March order because that
        | is the order the year is built in, and every screen below reads them
        | the other way round: the latest month is the one the card at the top
        | of the page shows and the first row of the history table.
        */
        setRecords([...months].reverse());

        setSalary(structure);

      } catch (loadError) {

        console.error(loadError);

        if (!cancelled) {
          setRecords([]);
          setSalary(null);
          setError("Failed to load your payroll.");
        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode, employeeId, financialYear, reloadToken]);

  return { records, salary, loading, error, reload };

}

export default useMyPayroll;
