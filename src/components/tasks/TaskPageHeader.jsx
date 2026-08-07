/*
|--------------------------------------------------------------------------
| Task Page Header
|--------------------------------------------------------------------------
| Icon + title + subtitle, aur daayein taraf page ka main action.
| AttendancePageHeader jaisa hi — bas back button nahi, kyunki /tasks
| module ka pehla page hai, uske peeche jaane ko kuch nahi.
|--------------------------------------------------------------------------
*/

function TaskPageHeader({ title, subtitle, icon, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
            {icon}
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-slate-500">{subtitle}</p>
        </div>
      </div>

      {action}
    </div>
  );
}

export default TaskPageHeader;
