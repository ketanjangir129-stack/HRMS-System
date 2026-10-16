const taskService = require("../services/taskService");

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

const getTasks = async (req, res) => {
  try {
    const tasks = await taskService.getTasks(
      req.user.companyCode,
      req.user
    );

    return res.status(200).json({
      success: true,
      tasks,
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
      task: result.task,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update task.");
  }
  };

const deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask({
      companyCode: req.user.companyCode,
      user: req.user,
      taskId: req.params.taskId,
    });

    return res.status(200).json({
      success: true,
      deleted: true,
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
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch task activity.");
  }
};
module.exports = {
  getTasks,
createTask,
updateTaskStatus,
updateTask,
deleteTask,
getTaskActivity

};
