const express = require("express");
const {
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
} = require("../controllers/taskController");

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

    // /:taskId se pehle — warna "team" ko taskId maan leta
    router.get(
        "/team",
        requirePermission("tasks.team"),
        getTeam
    );

    router.post(
        "/",
        requirePermission(["tasks.create", "tasks.createOwn"]),
        createTask
        );

        router.patch(
            "/:taskId",
            requirePermission(["tasks.update", "tasks.updateOwn", "tasks.create"]),
            updateTask
        );

        /*
        | Status aur kaam: page ka haq kaafi hai. Task par kaun hai, ye
        | service dekhti hai — jise task mila hai wo apna status badal sake,
        | chahe uske paas "update" ka haq na ho.
        */
        router.patch(
            "/:taskId/status",
            requirePermission("tasks"),
            updateTaskStatus

        );

        router.post(
            "/:taskId/work",
            requirePermission("tasks"),
            setWork
        );

        // Task par kitna waqt — jo task dekh sakta hai wahi (service dekhti hai)
        router.get(
            "/:taskId/time",
            requirePermission("tasks"),
            getTaskTime
        );

        router.delete(
            "/:taskId",
            requirePermission("tasks.delete"),
            deleteTask


        );

        router.post(
            "/:taskId/restore",
            requirePermission("tasks.delete"),
            restoreTask
        );

        router.get(
            "/:taskId/activity",
            requirePermission("tasks.activity"),
            getTaskActivity

        );

        /* Steps (subtasks) — kaun kya kar sakta hai, service tay karti hai */
        router.get("/:taskId/subtasks", requirePermission("tasks"), listSubtasks);
        router.get("/:taskId/subtask-assignees", requirePermission("tasks"), subtaskAssignees);
        router.post("/:taskId/subtasks", requirePermission("tasks"), addSubtask);
        router.patch("/:taskId/subtasks/:subtaskId", requirePermission("tasks"), updateSubtask);
        router.delete("/:taskId/subtasks/:subtaskId", requirePermission("tasks"), deleteSubtask);

        module.exports = router;
