
import { apiRequest } from "./apiClient";

const jsonRequest = (method, payload) => ({
  method,
  body: JSON.stringify(payload ?? {}),
});

export const getHolidaysApi = (year) => {
  const yearQuery = Array.isArray(year) ? year.join(",") : year;
  return apiRequest(`/holidays?year=${encodeURIComponent(yearQuery)}`);
};

export const getUpcomingHolidaysApi = ({ limit = 5, from } = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (from) params.set("from", String(from));
  const query = params.toString();
  return apiRequest(`/holidays/upcoming${query ? `?${query}` : ""}`);
};

export const createHolidayApi = (payload) =>
  apiRequest("/holidays", jsonRequest("POST", payload));

export const updateHolidayApi = (date, holidayId, payload) =>
  apiRequest(
    `/holidays/${encodeURIComponent(date)}/${encodeURIComponent(holidayId)}`,
    jsonRequest("PATCH", payload)
  );

export const deleteHolidayApi = (date, holidayId) =>
  apiRequest(
    `/holidays/${encodeURIComponent(date)}/${encodeURIComponent(holidayId)}`,
    { method: "DELETE" }
  );

export const importHolidaysApi = (holidays) =>
  apiRequest("/holidays/import", jsonRequest("POST", { holidays }));

export const uploadHolidayImageApi = (date, holidayId, file) => {
  const body = new FormData();
  body.append("image", file);
  return apiRequest(
    `/holidays/${encodeURIComponent(date)}/${encodeURIComponent(holidayId)}/image`,
    { method: "PUT", body }
  );
};

export const removeHolidayImageApi = (date, holidayId) =>
  apiRequest(
    `/holidays/${encodeURIComponent(date)}/${encodeURIComponent(holidayId)}/image`,
    { method: "DELETE" }
  );
