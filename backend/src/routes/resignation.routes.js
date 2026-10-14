const express = require("express");

const router = express.Router({ mergeParams: true });

const {
  authenticate,
  requireActiveAccount,
  requirePasswordChanged,
} = require("../middleware/authMiddleware");

const controller = require("../controllers/resignation.controller");

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
| Every resignation API requires:
| 1. Valid JWT
| 2. Active employee account
| 3. Temporary password must be changed
|--------------------------------------------------------------------------
*/

router.use(authenticate);
router.use(requireActiveAccount);
router.use(requirePasswordChanged);

/*
|--------------------------------------------------------------------------
| Employee resignation
|--------------------------------------------------------------------------
*/

/**
 * Create resignation
 *
 * POST
 * /api/v1/companies/:companyCode/resignations
 */
router.post(
  "/",
  controller.createResignation
);

/**
 * Get logged-in employee's resignations
 *
 * GET
 * /api/v1/companies/:companyCode/resignations
 */
router.get(
  "/",
  controller.getEmployeeResignations
);

/**
 * Get resignation by ID
 *
 * GET
 * /api/v1/companies/:companyCode/resignations/:resignationId
 */
router.get(
  "/:resignationId",
  controller.getResignationById
);

/*
|--------------------------------------------------------------------------
| Manager actions
|--------------------------------------------------------------------------
*/

/**
 * Manager approves resignation
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/manager/approve
 */
router.patch(
  "/:resignationId/manager/approve",
  controller.approveByManager
);

/**
 * Manager rejects resignation
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/manager/reject
 */
router.patch(
  "/:resignationId/manager/reject",
  controller.rejectByManager
);

/*
|--------------------------------------------------------------------------
| HR actions
|--------------------------------------------------------------------------
*/

/**
 * HR approves resignation
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/hr/approve
 */
router.patch(
  "/:resignationId/hr/approve",
  controller.approveByHr
);

/**
 * HR rejects resignation
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/hr/reject
 */
router.patch(
  "/:resignationId/hr/reject",
  controller.rejectByHr
);

/*
|--------------------------------------------------------------------------
| Equipment
|--------------------------------------------------------------------------
*/

/**
 * Employee submits equipment
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/equipment
 */
router.patch(
  "/:resignationId/equipment",
  controller.submitEquipment
);

/**
 * Attach the filing-time document URL
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/document
 */
router.patch(
  "/:resignationId/document",
  controller.attachDocument
);

/*
|--------------------------------------------------------------------------
| F&F
|--------------------------------------------------------------------------
*/

/**
 * Save F&F draft
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/fnf
 */
router.patch(
  "/:resignationId/fnf",
  controller.saveFnF
);

/**
 * Submit F&F for HR review
 *
 * POST
 * /api/v1/companies/:companyCode/resignations/:resignationId/fnf/submit
 */
router.post(
  "/:resignationId/fnf/submit",
  controller.submitFnFForReview
);

/**
 * HR reviews F&F
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/fnf/review
 */
router.patch(
  "/:resignationId/fnf/review",
  controller.reviewFnF
);

/**
 * HR returns F&F to employee
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/fnf/return
 */
router.patch(
  "/:resignationId/fnf/return",
  controller.returnFnF
);

/*
|--------------------------------------------------------------------------
| Finance
|--------------------------------------------------------------------------
*/

/**
 * Finance approves and exits employee
 *
 * PATCH
 * /api/v1/companies/:companyCode/resignations/:resignationId/finance/approve
 */
router.patch(
  "/:resignationId/finance/approve",
  controller.approveFinanceAndExit
);

module.exports = router;