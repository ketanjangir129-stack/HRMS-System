import { apiRequest } from "./apiClient";
const jsonRequest = (method, payload) => ({
    method,
    body:JSON.stringify(payload ?? {}),
});

const taskPath = (taskId) => `/tasks/${
    encodeURIComponent(taskId)}`;

    // archived: true → sirf archive kiye hue (tasks.delete wale ke liye)
    export const getTaskApi = ({ archived = false } = {}) =>
        apiRequest(archived ? "/tasks?archived=1" : "/tasks");

    export const createTaskApi = (payload) =>
        apiRequest("/tasks", jsonRequest("POST", payload));

    export const updateTaskApi = (taskId, payload) =>
        apiRequest(taskPath(taskId), jsonRequest("PATCH", payload));

    export const updateTaskStatusApi = (taskId, status) =>
        apiRequest(`${taskPath(taskId)}/status`,
    jsonRequest("PATCH", {status}));

    // DELETE ab archive karta hai; permanent sirf Owner
    export const deleteTaskApi = (taskId, { permanent = false } = {}) =>
        apiRequest(`${taskPath(taskId)}${permanent ? "?permanent=1" : ""}`, { method: "DELETE" });

    export const restoreTaskApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/restore`, jsonRequest("POST"));

    // action: "start" | "stop" — team ka ek insaan apna kaam. subtaskId ho
    // to kaam us step par shuru hota hai
    export const setTaskWorkApi = (taskId, action, subtaskId) =>
        apiRequest(`${taskPath(taskId)}/work`,
    jsonRequest("POST", subtaskId ? { action, subtaskId } : { action }));

    // Task par kitna waqt — kul, insaan-wise, step-wise, sessions
    export const getTaskTimeApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/time`);

    export const getTaskActivityApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/activity`);

    export const getTaskTeamApi = () =>
        apiRequest("/tasks/team");

    /* Steps (subtasks) */
    export const getSubtasksApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/subtasks`);

    export const getSubtaskAssigneesApi = (taskId) =>
        apiRequest(`${taskPath(taskId)}/subtask-assignees`);

    export const addSubtaskApi = (taskId, payload) =>
        apiRequest(`${taskPath(taskId)}/subtasks`, jsonRequest("POST", payload));

    export const updateSubtaskApi = (taskId, subtaskId, payload) =>
        apiRequest(`${taskPath(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    jsonRequest("PATCH", payload));

    export const deleteSubtaskApi = (taskId, subtaskId) =>
        apiRequest(`${taskPath(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`,
    { method: "DELETE" });
