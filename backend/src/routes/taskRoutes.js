const express = require("express");
const {getTasks, createTask, updateTaskStatus, updateTask, deleteTask, getTaskActivity } = require("../controllers/taskController");

const {
    requirePermission,
} = require("../middleware/permissionMiddleware");

const {
    authenticate,
    requireActiveAccount,
} = require("../middleware/authMiddleware");




const router = express.Router();

router.use(authenticate);
router.use(requireActiveAccount);


    router.get(
        "/",
        requirePermission("tasks"),
        getTasks
    );
    router.post(
        "/",
        requirePermission(["tasks.create", "tasks.createOwn"]),
        createTask
        );

        router.patch(
            "/:taskId",
            requirePermission(["tasks.update", "tasks.updateOwn"]),
            updateTask
        );
        router.patch(
            "/:taskId/status",
            requirePermission(["tasks.update", "tasks.updateOwn"]),
            updateTaskStatus

        );

        router.delete(
            "/:taskId",
            requirePermission("tasks.delete"),
            deleteTask


        );

        router.get(
            "/:taskId/activity",
            requirePermission("tasks.activity"),
            getTaskActivity

        );
        module.exports = router;
    