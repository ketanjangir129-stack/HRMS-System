function DepartmentSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* =========================
                DEPARTMENT CARDS
            ========================== */}
            {Array.from({ length: 5 }).map((_, index) => (

                <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                    <div className="flex flex-wrap items-center justify-between gap-5">

                        {/* Department information */}
                        <div className="flex items-center gap-5">

                            {/* Department icon */}
                            <div className="h-14 w-14 rounded-2xl bg-slate-200" />

                            <div className="space-y-3">

                                {/* Department name */}
                                <div className="flex items-center gap-3">

                                    <div className="h-6 w-28 rounded-md bg-slate-200" />

                                    {/* Dropdown icon */}
                                    <div className="h-8 w-8 rounded-full bg-slate-200" />

                                </div>

                                {/* Designation count */}
                                <div className="h-7 w-36 rounded-full bg-slate-200" />

                            </div>

                        </div>


                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Edit */}
                            <div className="h-12 w-24 rounded-xl border border-slate-200 bg-slate-100" />

                            {/* Delete */}
                            <div className="h-12 w-28 rounded-xl border border-slate-200 bg-slate-100" />

                            {/* Add Designation */}
                            <div className="h-12 w-48 rounded-xl bg-slate-200" />

                        </div>

                    </div>

                </div>

            ))}

        </div>
    );
}

export default DepartmentSkeleton;