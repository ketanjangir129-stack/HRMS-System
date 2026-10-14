const db = require("../config/firebase");

const getAttendanceRecords = async ({
  companyCode,
  year,
  month,
  date,
  employeeId,
}) => {
  let attendanceRef = db.ref(
    `companies/${companyCode}/attendance/records`
  );

  // Optional filters
  if (year) {
    attendanceRef = attendanceRef.child(year);
  }

  if (month) {
    attendanceRef = attendanceRef.child(month);
  }

  if (date) {
    attendanceRef = attendanceRef.child(date);
  }

  if (employeeId && date) {
    attendanceRef = attendanceRef.child(employeeId.toUpperCase());
  }

  const snapshot = await attendanceRef.once("value");

  if (!snapshot.exists()) {
    return {
      success: true,
      records: [],
    };
  }

  const data = snapshot.val();

  const records = [];

  const processRecord = (record) => {
    if (!record || typeof record !== "object") {
      return;
    }

    records.push(record);
  };

  // Date + employee
  if (date && employeeId) {
    processRecord(data);
  }

  // Date only
  else if (date) {
    Object.entries(data).forEach(
      ([employeeKey, record]) => {
        processRecord({
          employeeId:
            record.employeeId || employeeKey,
          ...record,
        });
      }
    );
  }

  // Year/month/date hierarchy
  else {
    Object.entries(data).forEach(
      ([dateKey, employees]) => {
        if (!employees || typeof employees !== "object") {
          return;
        }

        Object.entries(employees).forEach(
          ([employeeKey, record]) => {
            if (!record || typeof record !== "object") {
              return;
            }

            records.push({
              employeeId:
                record.employeeId || employeeKey,
              date:
                record.date || dateKey,
              ...record,
            });
          }
        );
      }
    );
  }

  return {
    success: true,
    records,
  };
};

module.exports = {
  getAttendanceRecords,
};