import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function AttendancePageHeader({ title, subtitle, icon, action }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div className="flex items-center gap-4">

        <button
          onClick={() => navigate("/attendance")}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600"
        >
          <FiArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-4">

          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
              {icon}
            </div>
          )}

          <div>

            <h1 className="text-3xl font-bold text-slate-900">
              {title}
            </h1>

            <p className="mt-1 text-slate-500">
              {subtitle}
            </p>

          </div>

        </div>

      </div>

      {action}

    </div>
  );
}

export default AttendancePageHeader;
