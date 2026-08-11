function DepartmentSkeleton() {
    return (
        <div className="grid gap-4 animate-pulse">
            {/* =========================
                DEPARTMENT CARDS
            ========================== */}
            {/* The layout mirrors DepartmentCard at every breakpoint so the
                cards do not jump when the real data arrives. */}
            {Array.from({ length: 5 }).map((_, index) => (

                <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                        {/* Department information */}
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">

                            {/* Department icon */}
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 sm:h-11 sm:w-11" />

                            <div className="min-w-0 space-y-2.5">

                                {/* Department name */}
                                <div className="flex items-center gap-2">

                                    <div className="h-6 w-28 rounded-md bg-slate-200 sm:w-40" />

                                    {/* Dropdown icon */}
                                    <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200" />

                                </div>

                                {/* Designation count */}
                                <div className="h-6 w-32 rounded-full bg-slate-200 sm:w-36" />

                            </div>

                        </div>


                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 md:shrink-0">

                            {/* Edit */}
                            <div className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-100 sm:w-24 sm:flex-none" />

                            {/* Delete */}
                            <div className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-100 sm:w-28 sm:flex-none" />

                            {/* Add Designation */}
                            <div className="h-9 w-full rounded-lg bg-slate-200 sm:w-40" />

                        </div>

                    </div>

                </div>

            ))}

        </div>
    );
}

export default DepartmentSkeleton;