/*
|--------------------------------------------------------------------------
| Task Page Header
|--------------------------------------------------------------------------
| Page ka pehla block — eyebrow, headline aur uske saath page ka main action.
|
<<<<<<< HEAD
| Project mein do tarah ke header hain:
|   - sub-page wale (AttendancePageHeader, SalaryPageHeader) — back arrow
|     ke saath, bare, koi card nahi
|   - top-level dashboard wale (AttendanceHeader, PayrollHeader, aur
|     SalaryPageHeader ka `card` variant) — white card mein, back arrow nahi
=======
| Ye Dashboard ke welcome block ki hi banawat hai: chhota brand-rang ka
| eyebrow upar (icon ke saath), uske neeche bada ink headline, aur uske
| neeche ek halki line. Card jaan-boojhkar nahi hai — Dashboard bhi apna
| headline khuli hui page par likhta hai, aur card sirf un panels ke liye
| bachaakar rakhta hai jinme sach mein content hota hai.
>>>>>>> e7eeaae0804103b0978302b66d7fcd47413debda
|
| Pehle ye AttendanceHeader wala white card tha. Us tarah header khud ek
| panel ban jaata tha aur neeche wale asli panels se takraata tha; ab page
| par sirf ek hi tarah ka card hai.
|--------------------------------------------------------------------------
*/

function TaskPageHeader({ title, subtitle, icon, eyebrow, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* min-w-0 — lamba title chhoti screen par action ko dhakel na de */}
      <div className="min-w-0">
        {(icon || eyebrow) && (
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
            {icon && <span className="shrink-0 text-sm">{icon}</span>}
            {eyebrow && <span className="truncate">{eyebrow}</span>}
          </div>
        )}

        <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
          {title}
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">{subtitle}</p>
      </div>

      {/* shrink-0 — button chhoti screen par squeeze na ho */}
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>
      )}
    </div>
  );
}

export default TaskPageHeader;
