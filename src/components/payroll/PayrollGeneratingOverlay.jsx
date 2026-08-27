import { useEffect } from "react";
import { TbReportMoney } from "react-icons/tb";
import { formatPayrollMonth } from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Generating Overlay
|--------------------------------------------------------------------------
| Covers the dashboard while a payroll run is with the service.
|
| A run reads attendance, leave and salary for everyone on the register, so
| it is slow enough that the button changing to "Generating..." on its own
| reads as a page that did nothing. The overlay says the work has started
| and holds the page until it finishes.
|
| It also blocks the month picker and the row buttons underneath, which the
| dashboard already refuses while a run is open, so the page cannot be sent
| somewhere the run would land in the wrong month.
|--------------------------------------------------------------------------
*/

function PayrollGeneratingOverlay({ open, payrollMonth, employeeId = "" }) {

    // The page behind must not scroll away from the overlay while it waits.
    useEffect(() => {

        if (!open) return;

        const { overflow } = document.body.style;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflow;
        };

    }, [open]);

    if (!open) return null;

    const forOne = Boolean(employeeId) && employeeId !== "all";

    return (

        <div
            role="alertdialog"
            aria-busy="true"
            aria-live="assertive"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4"
        >

            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-2xl sm:p-8">

                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">

                    <span className="absolute inset-0 animate-spin rounded-full border-4 border-brand-ring border-t-brand" />

                    <TbReportMoney className="text-2xl text-brand" />

                </div>

                <h2 className="ui-card-title mt-5">
                    Generating Payroll...
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                    {forOne
                        ? `Calculating ${employeeId}'s payroll for ${formatPayrollMonth(payrollMonth)}.`
                        : `Calculating payroll for every employee for ${formatPayrollMonth(payrollMonth)}.`}
                </p>

                <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600">
                    This can take a moment. Please do not close this page.
                </p>

            </div>

        </div>

    );

}

export default PayrollGeneratingOverlay;
