
const holidayService = require("../services/holidayService");
const { getDateKey } = require("../utils/attendanceDate");

const MAX_YEARS_PER_REQUEST = 5;

const sendResult = (res, result, fallbackStatus = 200) => {
  const { status, ...payload } = result || {};
  return res.status(status || fallbackStatus).json(payload);
};

const handleError = (res, error, fallbackMessage) => {
  console.error("Holiday controller error:", error);

  const status = Number(error.statusCode) || 500;

  return res.status(status).json({
    success: false,
    code:
      error.code ||
      (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message:
      status < 500
        ? error.message
        : fallbackMessage || "An unexpected error occurred.",
  });
};

const getHolidays = async (req, res) => {
  try {
    // Default year in IST, not the server clock's timezone.
    const rawYear =
      req.query.year || req.query.years || getDateKey(Date.now()).slice(0, 4);
    // De-duplicated (2026,2026 would return every holiday twice) and capped:
    // each year is one full read, so an unbounded list is a cheap way to make
    // the server do thousands of reads in one request.
    const yearList = [
      ...new Set(
        String(rawYear)
          .split(",")
          .map((y) => y.trim())
          .filter((y) => /^\d{4}$/.test(y))
      ),
    ];

    if (yearList.length === 0) {
      return res.status(400).json({
        success: false,
        code: "BAD_REQUEST",
        message: "A valid four-digit year is required.",
      });
    }

    if (yearList.length > MAX_YEARS_PER_REQUEST) {
      return res.status(400).json({
        success: false,
        code: "BAD_REQUEST",
        message: `At most ${MAX_YEARS_PER_REQUEST} years can be requested at once.`,
      });
    }

    if (yearList.length === 1) {
      const year = yearList[0];
      const holidays = await holidayService.listHolidays(
        req.user.companyCode,
        year
      );

      return sendResult(res, {
        success: true,
        year: Number(year),
        holidays,
      });
    }

    const lists = await Promise.all(
      yearList.map((y) =>
        holidayService.listHolidays(req.user.companyCode, y)
      )
    );

    const holidays = lists
      .flat()
      .sort((a, b) =>
        String(a?.date || "").localeCompare(String(b?.date || ""))
      );

    return sendResult(res, {
      success: true,
      years: yearList.map(Number),
      holidays,
    });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve holidays.");
  }
};

const getUpcomingHolidays = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);
    const from =
      typeof req.query.from === "string" ? req.query.from.trim() : undefined;

    const holidays = await holidayService.getUpcomingHolidays(
      req.user.companyCode,
      { limit, from }
    );

    return sendResult(res, {
      success: true,
      holidays,
    });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve upcoming holidays.");
  }
};

const getHolidayById = async (req, res) => {
  try {
    const holiday = await holidayService.getHoliday(
      req.user.companyCode,
      req.params.date,
      req.params.holidayId
    );

    return sendResult(res, { success: true, holiday });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve the holiday.");
  }
};

const createHoliday = async (req, res) => {
  try {
    const result = await holidayService.createHoliday(
      req.user.companyCode,
      req.body,
      req.user
    );

    return sendResult(
      res,
      { success: true, ...result },
      201
    );
  } catch (error) {
    return handleError(res, error, "Unable to create the holiday.");
  }
};

const updateHoliday = async (req, res) => {
  try {
    const result = await holidayService.updateHoliday(
      req.user.companyCode,
      req.params.date,
      req.params.holidayId,
      req.body,
      req.user
    );

    return sendResult(res, { success: true, ...result });
  } catch (error) {
    return handleError(res, error, "Unable to update the holiday.");
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const result = await holidayService.deleteHoliday(
      req.user.companyCode,
      req.params.date,
      req.params.holidayId
    );

    return sendResult(res, { success: true, ...result });
  } catch (error) {
    return handleError(res, error, "Unable to delete the holiday.");
  }
};

module.exports = {
  getHolidays,
  getUpcomingHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
};
