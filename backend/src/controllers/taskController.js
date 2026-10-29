const taskService = require("../services/taskService");
const taskSubtaskService = require("../services/taskSubtaskService");

const handleError = (res, error, fallbackMessage) => {
    console.error("Task controller error:", error);
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

/*
| Har handler ek hi shakal ka tha — service bulao, nateeja bhejo, galti par
| handleError. Naye routes isi se bante hain; purane neeche waise hi hain.
*/
const handle = (work, fallbackMessage) => async (req, res) => {
  try {
    const { status = 200, ...body } = await work(req);
    return res.status(status).json({ success: true, ...body });
  } catch (error) {
    return handleError(res, error, fallbackMessage);
  }
};

const context = (req) => ({
  companyCode: req.user.companyCode,
  user: req.user,
  taskId: req.params.taskId,
});

const getTasks = async (req, res) => {
  try {
    const { tasks, people } = await taskService.getTasks(
      req.user.companyCode,
      req.user,
      { archived: req.query?.archived === "1" }
    );

    return res.status(200).json({
      success: true,
      tasks,
      people,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch tasks.");
  }
};

const createTask = async (req, res) => {
  try {
    const result = await taskService.createTask({
      companyCode: req.user.companyCode,
      user: req.user,
      payload: req.body,
    });

    return res.status(result.status || 201).json({
      success: true,
      task: result.task,
    });
  } catch (error) {
    return handleError(res, error, "Failed to create task.");
  }
};
const updateTaskStatus = async (req, res) => {
  try {
    const result = await taskService.updateTaskStatus({
      companyCode: req.user.companyCode,
      user: req.user,
      taskId: req.params.taskId,
      status: req.body?.status,
    });

    return res.status(200).json({
      success: true,
      changed: result.changed,
      paused: result.paused,
      // Team ke baaki kaam kar rahe the — sirf is insaan ka kaam ruka
      ...(result.onlyMine ? { onlyMine: true } : {}),
    });
  } catch (error) {
    return handleError(res, error, "Failed to update task status.");
  }
};
const updateTask = async (req, res) => {
  try {
    const result = await taskService.updateTask({
      companyCode: req.user.companyCode,
      user: req.user,
      taskId: req.params.taskId,
      payload: req.body,
    });

    return res.status(200).json({
      success: true,
      changed: result.changed,
      task: result.task,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update task.");
  }
  };

// DELETE ab archive karta hai; ?permanent=1 sirf Owner ke liye
const deleteTask = async (req, res) => {
  try {
    const result = await taskService.deleteTask({
      companyCode: req.user.companyCode,
      user: req.user,
      taskId: req.params.taskId,
      permanent: req.query?.permanent === "1",
    });

    return res.status(200).json({
      success: true,
      deleted: Boolean(result.deleted),
      archived: Boolean(result.archived),
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete task.");
  }
};

const getTaskActivity = async (req, res) => {
  try {
    const result = await taskService.getTaskActivity({
      companyCode: req.user.companyCode,
      user: req.user,
      taskId: req.params.taskId,
    });

    return res.status(200).json({
      success: true,
      activity: result.activity,
      people: result.people,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch task activity.");
  }
};

const restoreTask = handle(
  (req) => taskService.restoreTask(context(req)),
  "Failed to restore task."
);

// subtaskId ho to kaam us step par shuru hota hai
const setWork = handle(
  (req) =>
    taskService.setWork({
      ...context(req),
      action: req.body?.action,
      subtaskId: req.body?.subtaskId || undefined,
    }),
  "Failed to update your work on this task."
);

const getTaskTime = handle(
  (req) => taskService.getTaskTime(context(req)),
  "Failed to load time for this task."
);

const getTeam = handle(
  (req) => taskService.getTeam(context(req)),
  "Failed to load the team."
);

const listSubtasks = handle(
  (req) => taskSubtaskService.listSubtasks(context(req)),
  "Failed to load steps."
);

const addSubtask = handle(
  (req) => taskSubtaskService.addSubtask({ ...context(req), payload: req.body }),
  "Failed to add the step."
);

const updateSubtask = handle(
  (req) =>
    taskSubtaskService.updateSubtask({
      ...context(req),
      subtaskId: req.params.subtaskId,
      payload: req.body,
    }),
  "Failed to update the step."
);

const deleteSubtask = handle(
  (req) =>
    taskSubtaskService.deleteSubtask({
      ...context(req),
      subtaskId: req.params.subtaskId,
    }),
  "Failed to remove the step."
);

const subtaskAssignees = handle(
  (req) => taskSubtaskService.subtaskAssignees(context(req)),
  "Failed to load people."
);

module.exports = {
  getTasks,
createTask,
updateTaskStatus,
updateTask,
deleteTask,
getTaskActivity,
restoreTask,
setWork,
getTaskTime,
getTeam,
listSubtasks,
addSubtask,
updateSubtask,
deleteSubtask,
subtaskAssignees,
};
