import { useState } from "react";
import { FiX, FiCheckSquare } from "react-icons/fi";
import { toast } from "react-toastify";
import useAuth from "../../hooks/useAuth";
import { saveAttendance } from "../../services/attendanceServices/attendanceService";

function MarkAttendanceModal({
  open,
  onClose,
}) {

  const [form, setForm] = useState({
    employee: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "",
    checkOut: "",
    status: "Present",
    remarks: "",
  });

  const { company } = useAuth();

  if (!open) return null;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.employee.trim()) {
      toast.error("Employee ID is required.");
      return;
    }
    if (!form.checkIn) {
      toast.error("Check In time is required.");
      return;
    }

    const attendance = {
      employeeId: form.employee.toUpperCase(),
      employeeName: "",
      department: "",
      designation: "",
      date: form.date,
      checkIn: new Date(
        `${form.date}T${form.checkIn}`
      ).getTime(),
      checkInTime: form.checkIn,
      checkOut: form.checkOut
        ? new Date(
          `${form.date}T${form.checkOut}`
        ).getTime()
        : null,
      checkOutTime: form.checkOut,
      workingHours: "",
      status: form.status,
      remarks: form.remarks,
    };

    const result = await saveAttendance(
      company.companyCode,
      attendance
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success("Attendance Saved Successfully");

    setForm({
      employee: "",
      date: new Date().toISOString().split("T")[0],
      checkIn: "",
      checkOut: "",
      status: "Present",
      remarks: "",
    });

    onClose();
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiCheckSquare size={20} />
            </div>

            <div>

              <h2 className="text-lg font-semibold text-slate-900">
                Mark Attendance
              </h2>

              <p className="text-sm text-slate-500">
                Record attendance for an employee
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <FiX size={20} />
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
        >

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            <div>

              <label className={labelClass}>
                Employee ID
              </label>

              <input
                type="text"
                name="employee"
                placeholder="e.g. EMP001"
                onChange={handleChange}
                className={fieldClass}
                value={form.employee}
              />

            </div>

            <div>

              <label className={labelClass}>
                Date
              </label>

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className={fieldClass}
              />

            </div>

            <div>

              <label className={labelClass}>
                Check In
              </label>

              <input
                type="time"
                name="checkIn"
                value={form.checkIn}
                onChange={handleChange}
                className={fieldClass}
              />

            </div>

            <div>

              <label className={labelClass}>
                Check Out
              </label>

              <input
                type="time"
                name="checkOut"
                value={form.checkOut}
                onChange={handleChange}
                className={fieldClass}
              />

            </div>

            <div>

              <label className={labelClass}>
                Status
              </label>

              <select
                name="status"
                onChange={handleChange}
                className={`${fieldClass} cursor-pointer`}
                value={form.status}
              >
                <option>Present</option>
                <option>Late</option>
                <option>Half Day</option>
                <option>Absent</option>
                <option>Leave</option>
              </select>

            </div>

            <div>

              <label className={labelClass}>
                Remarks
              </label>

              <input
                type="text"
                name="remarks"
                placeholder="Optional note"
                onChange={handleChange}
                className={fieldClass}
                value={form.remarks}
              />

            </div>

          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
            >
              Save Attendance
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default MarkAttendanceModal;
