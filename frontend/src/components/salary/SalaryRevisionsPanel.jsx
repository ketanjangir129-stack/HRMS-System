import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiInbox } from "react-icons/fi";
import {
    AttendancePanel,
    FilterSelect,
} from "../attendance/common/AttendancePanel";
import SalaryRevisionCard from "./SalaryRevisionCard";
import { getSalaryRevisions } from "../../services/SalaryService";
import * as salaryDiffrence from "../../utils/salary/salaryDiff";
import { formatRevisionDateTime } from "../../utils/salary/formatSalaryDate";
import { filterData } from "../../utils/search/filterData";

/*
|--------------------------------------------------------------------------
| Salary Revisions Panel
|--------------------------------------------------------------------------
| Every revision made to a salary structure in the company, newest first.
|
| This is the second half of the salary screen rather than a page of its own:
| a revision only ever comes from the register next to it, so reading what
| changed and changing it again belong on the same screen.
|
| The revisions are loaded here rather than by the page, so the fetch only
| happens once this tab is actually opened — somebody who never leaves the
| register never pays for it.
|
| The list is paged by a button instead of a pager. A revision is a tall card
| and the interesting ones are the recent ones, so reading down from the top
| beats jumping to page four.
|
| `search` comes from the navbar, so the filtering is done here and the diffs
| are derived once per revision rather than per render — see `salaryDiff`.
|--------------------------------------------------------------------------
*/

const PAGE_SIZE = 10;

function SalaryRevisionsPanel({
    search = "",
    onViewEmployeeHistory,
    onGoToRegister,
}) {

    const companyCode = localStorage.getItem("companyCode");

    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedId, setSelectedId] = useState(null);
    const [employeeFilter, setEmployeeFilter] = useState("");

    /*
    | How far down the list has been read, stored together with the filters it
    | was read under — the same trick `DataTable` uses for its page number. A
    | narrowed list starts from the top again without an effect that resets it
    | one render later.
    */
    const [paging, setPaging] = useState({ key: "", count: PAGE_SIZE });

    useEffect(() => {

        let cancelled = false;

        const load = async () => {

            setLoading(true);
            setError("");

            try {

                const data = await getSalaryRevisions(companyCode);

                if (!cancelled) {
                    setRevisions(data);
                }

            }

            catch (err) {

                console.error(err);

                if (!cancelled) {
                    setRevisions([]);
                    setError("Could not load salary revisions.");
                }

            }

            finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        };

        load();

        return () => {
            cancelled = true;
        };

    }, [companyCode]);

    // The diff is derived once per revision; the cards only read it.
    const detailedRevisions = useMemo(
        () =>
            revisions.map((revision) => {

                const changes = salaryDiffrence.buildSalaryChanges(
                    revision.previous,
                    revision.current
                );

                return {
                    ...revision,
                    changes,
                    sections: salaryDiffrence.groupSalaryChanges(changes),
                    updatedByName: revision.updatedBy?.name || "Unknown",
                    netDifference:
                        Number(revision.current?.netSalary || 0) -
                        Number(revision.previous?.netSalary || 0),
                };

            }),
        [revisions]
    );

    const employees = useMemo(
        () => [
            ...new Set(
                detailedRevisions
                    .map((revision) => revision.employeeName)
                    .filter(Boolean)
            ),
        ],
        [detailedRevisions]
    );

    const filteredRevisions = useMemo(() => {

        const searched = filterData(
            detailedRevisions,
            search,
            [
                "employeeId",
                "employeeName",
                "department",
                "designation",
                "updatedByName",
                "updatedBy.role",
            ]
        );

        if (!employeeFilter) {
            return searched;
        }

        return searched.filter(
            (revision) => revision.employeeName === employeeFilter
        );

    }, [detailedRevisions, search, employeeFilter]);

    const pageKey = `${search}|${employeeFilter}`;

    const visibleCount =
        paging.key === pageKey ? paging.count : PAGE_SIZE;

    const visibleRevisions = filteredRevisions.slice(0, visibleCount);

    const lastRevisionAt = detailedRevisions[0]?.updatedAt;

    const toggleRevision = (id) => {
        setSelectedId((current) => (current === id ? null : id));
    };

    if (loading) {

        return (

            <div className="space-y-4">

                {Array.from({ length: 3 }).map((_, index) => (

                    <div
                        key={index}
                        className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-32"
                    />

                ))}

            </div>

        );

    }

    /*
    | Nothing has ever been revised, which is not the same as nothing matching
    | a filter: there is no filter to loosen, so the way out is the register.
    */
    if (!error && !detailedRevisions.length) {

        return (

            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FiInbox size={26} />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    No salary revisions yet
                </h2>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                    Revisions appear here once an existing salary structure is
                    updated for the first time.
                </p>

                {onGoToRegister && (

                    <button
                        type="button"
                        onClick={onGoToRegister}
                        className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
                    >
                        Go to Salaries
                    </button>

                )}

            </div>

        );

    }

    return (

        <AttendancePanel
            title="Revision History"
            subtitle="Every change made to an employee's salary structure."
            action={
                lastRevisionAt && (

                    <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm lg:w-auto">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FiCalendar size={16} />
                        </div>

                        <div className="min-w-0">

                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Last Revision
                            </p>

                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                {formatRevisionDateTime(lastRevisionAt)}
                            </p>

                        </div>

                    </div>

                )
            }
            toolbar={
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <p className="text-sm text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-700">
                            {visibleRevisions.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-slate-700">
                            {filteredRevisions.length}
                        </span>{" "}
                        revisions
                    </p>

                    <div className="w-full sm:w-64">

                        <FilterSelect
                            value={employeeFilter}
                            onChange={setEmployeeFilter}
                            options={employees}
                            placeholder="All Employees"
                            ariaLabel="Filter revisions by employee"
                        />

                    </div>

                </div>
            }
        >

            <div className="p-4 sm:p-6">

                {error && (

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </div>

                )}

                {!error && !filteredRevisions.length && (

                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <FiInbox size={26} />
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-slate-900">
                            No matching revisions
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Try a different employee or search term.
                        </p>

                    </div>

                )}

                <div className="space-y-4">

                    {visibleRevisions.map((revision) => (

                        <SalaryRevisionCard
                            key={revision.id}
                            revision={revision}
                            isOpen={selectedId === revision.id}
                            onToggle={() => toggleRevision(revision.id)}
                            onViewEmployeeHistory={onViewEmployeeHistory}
                        />

                    ))}

                </div>

                {visibleCount < filteredRevisions.length && (

                    <div className="mt-6 flex justify-center">

                        <button
                            type="button"
                            onClick={() =>
                                setPaging({
                                    key: pageKey,
                                    count: visibleCount + PAGE_SIZE,
                                })
                            }
                            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-500 hover:text-blue-600"
                        >
                            Load more revisions
                        </button>

                    </div>

                )}

            </div>

        </AttendancePanel>

    );

}

export default SalaryRevisionsPanel;
