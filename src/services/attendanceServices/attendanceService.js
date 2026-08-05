import { db } from "../../firebase/firebase";
import {
  ref,
  get,
  set,
  update,
} from "firebase/database";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getTodayKey = () => {
  return new Date().toISOString().split("T")[0];
};

export const calculateWorkingHours = (
  checkIn,
  checkOut
) => {

  if (!checkIn || !checkOut) return "";

  const diff = checkOut - checkIn;

  const hours = Math.floor(
    diff / (1000 * 60 * 60)
  );

  const minutes = Math.floor(
    (diff % (1000 * 60 * 60)) /
    (1000 * 60)
  );

  return `${hours}h ${minutes}m`;

};


/*
|--------------------------------------------------------------------------
| Get Today's Attendance
|--------------------------------------------------------------------------
*/

export const getTodayAttendance = async (
  companyCode,
  employeeId
) => {

  const today = getTodayKey();

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/attendance/records/${today}/${employeeId}`
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();

};

/*
|--------------------------------------------------------------------------
| Get Employee Attendance History
|--------------------------------------------------------------------------
*/

export const getEmployeeAttendanceHistory = async (
  companyCode,
  employeeId,
  year,
  month
) => {

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/attendance/records`
    )
  );

  if (!snapshot.exists()) {
    return [];
  }

  const records = snapshot.val();

  const history = [];

  Object.entries(records).forEach(([date, employees]) => {

    if (!date.startsWith(`${year}-${month}`)) {
      return;
    }

    if (employees[employeeId]) {

      history.push(employees[employeeId]);

    }

  });

  history.sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date)
  );

  return history;

};


/*
|--------------------------------------------------------------------------
| Get Monthly Attendance
|--------------------------------------------------------------------------
*/

export const getMonthlyAttendance = async (
  companyCode,
  year,
  month
) => {

  const snapshot = await get(
    ref(
      db,
      `companies/${companyCode}/attendance/records`
    )
  );

  if (!snapshot.exists()) {
    return {};
  }

  const records = snapshot.val();

  const monthAttendance = {};

  Object.entries(records).forEach(([date, employees]) => {

    if (!date.startsWith(`${year}-${month}`)) {
      return;
    }

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    Object.values(employees).forEach((employee) => {

      switch (employee.status) {

        case "Present":
          present++;
          break;

        case "Late":
          late++;
          break;

        case "Absent":
          absent++;
          break;

        case "Leave":
          leave++;
          break;

        default:
          break;
      }

    });

    monthAttendance[date] = {
      present,
      late,
      absent,
      leave,
    };

  });

  return monthAttendance;

};

/*
|--------------------------------------------------------------------------
| Employee Check In
|--------------------------------------------------------------------------
*/

export const checkInEmployee = async (
  companyCode,
  employee
) => {

  const today = getTodayKey();

  const attendanceRef = ref(
    db,
    `companies/${companyCode}/attendance/records/${today}/${employee.employmentInfo.employeeId}`
  );

  const snapshot = await get(
    attendanceRef
  );

  if (snapshot.exists()) {

    return {
      success: false,
      message: "Attendance already marked.",
    };

  }

  const now = new Date();

  const attendance = {
    employeeId: employee.employmentInfo.employeeId,
    employeeName: employee.personalInfo.name,
    department: employee.employmentInfo.department,
    designation: employee.employmentInfo.designation,

    date: today,

    checkIn: now.getTime(),
    checkInTime: now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),

    checkOut: null,
    checkOutTime: "",

    workingHours: "",

    status: "Present",

    remarks: "",

    createdAt: Date.now(),
  };

  await set(
    attendanceRef,
    attendance
  );

  return {
    success: true,
    data: attendance,
  };

};

/*
|--------------------------------------------------------------------------
| Employee Check Out
|--------------------------------------------------------------------------
*/

export const checkOutEmployee = async (
  companyCode,
  employeeId
) => {

  const today = getTodayKey();

  const attendanceRef = ref(
    db,
    `companies/${companyCode}/attendance/records/${today}/${employeeId}`
  );

  const snapshot = await get(
    attendanceRef
  );

  if (!snapshot.exists()) {

    return {
      success: false,
      message:
        "Check in first.",
    };

  }

  const attendance =
    snapshot.val();

  if (attendance.checkOut) {

    return {
      success: false,
      message:
        "Already checked out.",
    };

  }

  const now = new Date();

  const checkOut = now.getTime();

  await update(attendanceRef, {
    checkOut,
    checkOutTime: now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    workingHours: calculateWorkingHours(
      attendance.checkIn,
      checkOut
    ),
  });

  return {
    success: true,
  };

};

/*
|--------------------------------------------------------------------------
| Manual Attendance (HR/Admin)
|--------------------------------------------------------------------------
*/

export const saveAttendance = async (
  companyCode,
  attendance
) => {

  const attendanceRef = ref(
    db,
    `companies/${companyCode}/attendance/records/${attendance.date}/${attendance.employeeId}`
  );

  const snapshot = await get(attendanceRef);

  if (snapshot.exists()) {
    return {
      success: false,
      message: "Attendance already exists for today.",
    };
  }

  await set(attendanceRef, {
    ...attendance,
    createdAt: Date.now(),
  });

  return {
    success: true,
  };

};


/*
|--------------------------------------------------------------------------
| Apply Attendance Changes
|--------------------------------------------------------------------------
*/
export const updateAttendanceRecord = async (
  companyCode,
  request
) => {

  const attendanceRef = ref(
    db,
    `companies/${companyCode}/attendance/records/${request.date}/${request.employeeId}`
  );

  const snapshot = await get(attendanceRef);

  if (!snapshot.exists()) {

    return {
      success: false,
      message: "Attendance record not found.",
    };

  }

  const attendance = snapshot.val();

  const updates = {};

  if (request.requestedCheckIn) {

    updates.checkIn = request.requestedCheckIn;

    updates.checkInTime = new Date(
      request.requestedCheckIn
    ).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  }

  if (request.requestedCheckOut) {

    updates.checkOut =
      request.requestedCheckOut;

    updates.checkOutTime = new Date(
      request.requestedCheckOut
    ).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  }

  const checkIn =
    updates.checkIn ??
    attendance.checkIn;

  const checkOut =
    updates.checkOut ??
    attendance.checkOut;

  if (checkIn && checkOut) {

    updates.workingHours =
      calculateWorkingHours(
        checkIn,
        checkOut
      );

  }

  await update(
    attendanceRef,
    updates
  );

  return {
    success: true,
  };

};