/*
|--------------------------------------------------------------------------
| Task Page Header
|--------------------------------------------------------------------------
| Icon + title + subtitle, aur daayein taraf page ka main action.
|
| Project mein do tarah ke header hain:
|   - sub-page wale (AttendancePageHeader, SalaryPageHeader) — back arrow
|     ke saath, bare, koi card nahi
|   - top-level dashboard wale (AttendanceHeader, PayrollHeader, aur
|     SalaryPageHeader ka `card` variant) — white card mein, back arrow nahi
|
| /tasks Sidebar ka apna page hai (jaise /attendance aur /salarydashboard),
| iske peeche jaane ko kuch nahi. Isliye ye doosra pattern follow karta hai
| aur classes AttendanceHeader se hu-ba-hu li gayi hain — dono jagah header
| ek jaisa dikhna chahiye.
|--------------------------------------------------------------------------
*/

function TaskPageHeader({ title, subtitle, icon, action }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">
      {/* min-w-0 — lamba title chhoti screen par action ko dhakel na de */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>
        </div>
      </div>

      {/* shrink-0 — button chhoti screen par squeeze na ho */}
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>
      )}
    </div>
  );
}

export default TaskPageHeader;
