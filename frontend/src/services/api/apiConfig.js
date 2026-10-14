/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
| The backend base URL, read once from the environment so every API module
| resolves to the same value. Hardcoding it per file is what let the upload
| client drift to a port nothing listened on while everything else worked.
|
| Set VITE_API_URL in frontend/.env per environment. The localhost fallback
| keeps local development working when the variable is missing; Vite bakes
| the value in at build time, so deploy builds need a rebuild to pick up a
| change.
|--------------------------------------------------------------------------
*/

export const API_URL =
  (import.meta.env.VITE_API_URL || "").trim() ||
  "http://localhost:5000/api";
