import { useEffect } from "react";
import { TbMoneybagEdit } from "react-icons/tb";

/*
|--------------------------------------------------------------------------
| Salary Importing Overlay
|--------------------------------------------------------------------------
| Covers the import screen while the rows are being written.
|
| Each row is a read and up to two writes, so a file of any size takes long
| enough that a button reading "Importing..." on its own looks like a page
| that did nothing. This says the work has started, counts the rows off as
| they land, and holds the page while it happens.
|
| Holding the page is the point rather than a side effect: the screen behind
| is the list the run is reading from, and letting somebody re-upload or
| change the "update existing" choice underneath a run in progress would send
| it somewhere nobody asked for.
|--------------------------------------------------------------------------
*/

function SalaryImportingOverlay({ open, done = 0, total = 0 }) {

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

    const percent = total > 0
        ? Math.round((done / total) * 100)
        : 0;

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

                    <TbMoneybagEdit className="text-2xl text-brand" />

                </div>

                <h2 className="ui-card-title mt-5">
                    Importing Salaries...
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                    {total > 0
                        ? `Saving ${done} of ${total} salary structures.`
                        : "Saving the salary structures."}
                </p>

                {/*
                | A bar as well as the count, because "12 of 400" and "12 of 14"
                | read the same at a glance and are not remotely the same wait.
                */}
                <div
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                >

                    <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />

                </div>

                <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600">
                    This can take a moment. Please do not close this page.
                </p>

            </div>

        </div>

    );

}

export default SalaryImportingOverlay;
