import { apiRequest } from "./apiClient";
const jsonRequest = (method, payload) => ({
    method,
    body:JSON.stringify(payload ?? {}),
});

const taskPath = (taskId) => `/tasks/${
    encodeURIComponent(taskId)}`;

    export const getTaskApi = () =>
        apiRequest("/tasks");

    export const createTaskApi = (payload) => 
        apiRequest("/tasks", jsonRequest("POST", payload));

    export const updateTaskApi = (taskId, payload) => 
        apiRequest(taskPath(taskId), jsonRequest("PATCH", payload));

    export const updateTaskStatusApi = (taskId, status) =>
        apiRequest(`${taskPath(taskId)}/status`, 
    jsonRequest("PATCH", {status}));
    export const deleteTaskApi = (taskId) => 
        apiRequest(taskPath(taskId), { method: "DELETE" });

    export const getTaskActivityApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/activity`);