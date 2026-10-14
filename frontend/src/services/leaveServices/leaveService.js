import {
  getLeaveRequestsApi,
  createLeaveRequestApi,
  updateLeaveRequestApi,
  deleteLeaveRequestApi,
  approveLeaveRequestApi,
  rejectLeaveRequestApi,
  getLeaveSettingsApi,
  updateLeaveSettingsApi,
  getLeaveUsageApi,
} from "../api/leaveApi";

import {
  notifyLeaveApprovers,
  notifyLeaveApproved,
  notifyLeaveRejected,
} from "../notifications/leaveNotificationService";

/*
 * All leave data mutations go through the backend API.
 * companyCode is retained in the function signatures for compatibility
 * with existing UI components; the backend derives company scope from auth.
 */

/*
 * In-memory client cache to deduplicate simultaneous requests
 * and eliminate redundant network round trips during fast tab navigation.
 */
let settingsCache = { data: null, expiresAt: 0, pending: null };
let requestsCache = { data: null, expiresAt: 0, pending: null };
const usageCache = new Map(); // key: `${employeeId}_${year}` -> { data, expiresAt, pending }

export const invalidateLeaveCache = () => {
  settingsCache = { data: null, expiresAt: 0, pending: null };
  requestsCache = { data: null, expiresAt: 0, pending: null };
  usageCache.clear();
};

const DEFAULT_SETTINGS = {
  annualLeaves: 12,
  monthlyAccrual: 1,
  allowCarryForward: true,
  maxCarryForward: 5,
};

/*
|--------------------------------------------------------------------------
| Leave Settings
|--------------------------------------------------------------------------
*/

export const getLeaveSettings = async (_companyCode, { forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && settingsCache.data && settingsCache.expiresAt > now) {
    return settingsCache.data;
  }
  if (!forceRefresh && settingsCache.pending) {
    return settingsCache.pending;
  }

  const promise = (async () => {
    try {
      const result = await getLeaveSettingsApi();

      if (!result || result.success === false) {
        return DEFAULT_SETTINGS;
      }

      const merged = {
        ...DEFAULT_SETTINGS,
        ...(result.settings || {}),
      };
      settingsCache.data = merged;
      settingsCache.expiresAt = Date.now() + 5000;
      return merged;
    } catch (error) {
      console.error("Failed to fetch leave settings:", error);
      return DEFAULT_SETTINGS;
    } finally {
      settingsCache.pending = null;
    }
  })();

  settingsCache.pending = promise;
  return promise;
};

export const updateLeaveSettings = async (
  _companyCode,
  settings
) => {
  try {
    const result = await updateLeaveSettingsApi(settings);

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to update leave settings.",
      };
    }

    invalidateLeaveCache();

    return {
      success: true,
      settings: result.settings,
    };
  } catch (error) {
    console.error("Failed to update leave settings:", error);
    return {
      success: false,
      message: error.message || "Failed to update leave settings.",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Leave Usage
|--------------------------------------------------------------------------
| Preserve the return shape: { used, lwp, carryForward }.
|--------------------------------------------------------------------------
*/

export const getLeaveUsage = async (
  _companyCode,
  employeeId,
  year,
  { forceRefresh = false } = {}
) => {
  if (!year) {
    return {
      used: 0,
      lwp: 0,
      carryForward: 0,
    };
  }

  const cacheKey = `${employeeId || "all"}_${year}`;
  const now = Date.now();
  const cached = usageCache.get(cacheKey);

  if (!forceRefresh && cached?.data && cached.expiresAt > now) {
    return cached.data;
  }
  if (!forceRefresh && cached?.pending) {
    return cached.pending;
  }

  const promise = (async () => {
    try {
      const result = await getLeaveUsageApi(year, employeeId);

      if (!result || result.success === false) {
        return {
          used: 0,
          lwp: 0,
          carryForward: 0,
        };
      }

      const usage = {
        used: 0,
        lwp: 0,
        carryForward: 0,
        ...(result.usage || {}),
      };

      usageCache.set(cacheKey, {
        data: usage,
        expiresAt: Date.now() + 4000,
        pending: null,
      });

      return usage;
    } catch (error) {
      console.error("Failed to fetch leave usage:", error);
      return {
        used: 0,
        lwp: 0,
        carryForward: 0,
      };
    }
  })();

  usageCache.set(cacheKey, {
    data: cached?.data || null,
    expiresAt: cached?.expiresAt || 0,
    pending: promise,
  });

  return promise;
};

export const updateLeaveUsage = async () => {
  return {
    success: false,
    message: "Direct leave usage updates are disabled. Use an authorized backend operation.",
  };
};

/*
|--------------------------------------------------------------------------
| Create Leave Request
|--------------------------------------------------------------------------
*/

export const createLeaveRequest = async (
  companyCode,
  request
) => {
  if (!request || typeof request !== "object") {
    return {
      success: false,
      message: "A valid leave request is required.",
    };
  }

  if (!request.employeeId) {
    return {
      success: false,
      message: "An employee is required to raise a leave request.",
    };
  }

  try {
    const result = await createLeaveRequestApi(request);

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to create leave request.",
      };
    }

    const createdRequest = result.request || {
      ...request,
      requestId: result.requestId,
    };
    const requestId = createdRequest.requestId || result.requestId;

    invalidateLeaveCache();

    // Trigger leave application notification like previous version
    try {
      await notifyLeaveApprovers(
        companyCode,
        createdRequest,
        requestId
      );
    } catch (notificationError) {
      console.error(
        "Leave application notification failed:",
        notificationError
      );
    }

    return {
      success: true,
      requestId,
      request: createdRequest,
    };
  } catch (error) {
    console.error("Create Leave Request Error:", error);
    return {
      success: false,
      message: error.message || "Failed to create leave request.",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Get Leave Requests
|--------------------------------------------------------------------------
*/

export const getLeaveRequests = async (_companyCode, { forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && requestsCache.data && requestsCache.expiresAt > now) {
    return requestsCache.data;
  }
  if (!forceRefresh && requestsCache.pending) {
    return requestsCache.pending;
  }

  const promise = (async () => {
    try {
      const result = await getLeaveRequestsApi();

      if (!result || result.success === false) {
        return [];
      }

      const requests = Array.isArray(result)
        ? result
        : Array.isArray(result.requests)
        ? result.requests
        : [];

      requestsCache.data = requests;
      requestsCache.expiresAt = Date.now() + 4000;
      return requests;
    } catch (error) {
      console.error("Get Leave Requests Error:", error);
      return [];
    } finally {
      requestsCache.pending = null;
    }
  })();

  requestsCache.pending = promise;
  return promise;
};

/*
|--------------------------------------------------------------------------
| Approve Leave Request
|--------------------------------------------------------------------------
| The server derives the approver from the authenticated session.
| Attendance sync and balance updates are completed by the backend.
|--------------------------------------------------------------------------
*/

export const approveLeaveRequest = async (
  companyCode,
  request,
  approver
) => {
  const requestId = request?.requestId || request?.id;

  if (!requestId) {
    return {
      success: false,
      message: "This leave request has no request ID. Refresh the list and try again.",
    };
  }

  try {
    const result = await approveLeaveRequestApi(
      requestId,
      request?.remarks || "",
      approver || ""
    );

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to approve leave request.",
      };
    }

    invalidateLeaveCache();

    // Trigger leave approval notification like previous version
    try {
      await notifyLeaveApproved(
        companyCode,
        request,
        requestId,
        approver
      );
    } catch (notificationError) {
      console.error(
        "Leave approval notification failed:",
        notificationError
      );
    }

    return {
      success: true,
      ...(result.request ? { request: result.request } : {}),
    };
  } catch (error) {
    console.error("Approve Leave Error:", error);
    return {
      success: false,
      message: error.message || "Failed to approve leave request.",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Reject Leave Request
|--------------------------------------------------------------------------
*/

export const rejectLeaveRequest = async (
  companyCode,
  request,
  approver,
  remarks
) => {
  const requestId = request?.requestId || request?.id;

  if (!requestId) {
    return {
      success: false,
      message: "This leave request has no request ID. Refresh the list and try again.",
    };
  }

  if (!String(remarks || "").trim()) {
    return {
      success: false,
      message: "A rejection reason is required.",
    };
  }

  try {
    const result = await rejectLeaveRequestApi(
      requestId,
      String(remarks).trim(),
      approver || ""
    );

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to reject leave request.",
      };
    }

    invalidateLeaveCache();

    // Trigger leave rejection notification like previous version
    try {
      await notifyLeaveRejected(
        companyCode,
        request,
        requestId,
        approver
      );
    } catch (notificationError) {
      console.error(
        "Leave rejection notification failed:",
        notificationError
      );
    }

    return {
      success: true,
      ...(result.request ? { request: result.request } : {}),
    };
  } catch (error) {
    console.error("Reject Leave Error:", error);
    return {
      success: false,
      message: error.message || "Failed to reject leave request.",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Update Leave Request
|--------------------------------------------------------------------------
*/

export const updateLeaveRequest = async (
  _companyCode,
  request,
  updates
) => {
  const requestId = request?.requestId || request?.id;

  if (!requestId) {
    return {
      success: false,
      message: "This leave request has no request ID. Refresh the list and try again.",
    };
  }

  if (!updates || typeof updates !== "object") {
    return {
      success: false,
      message: "Valid leave request updates are required.",
    };
  }

  try {
    const payload = {
      requestType: updates.requestType,
      fromDate: updates.fromDate,
      toDate: updates.toDate,
      halfDaySession: updates.halfDaySession ?? "",
      reason: updates.reason,
    };

    const result = await updateLeaveRequestApi(requestId, payload);

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to update leave request.",
      };
    }

    invalidateLeaveCache();

    return {
      success: true,
      ...(result.request ? { request: result.request } : {}),
    };
  } catch (error) {
    console.error("Update Leave Request Error:", error);
    return {
      success: false,
      message: error.message || "Failed to update leave request.",
    };
  }
};

/*
|--------------------------------------------------------------------------
| Delete Leave Request
|--------------------------------------------------------------------------
*/

export const deleteLeaveRequest = async (
  _companyCode,
  request
) => {
  const requestId = request?.requestId || request?.id;

  if (!requestId) {
    return {
      success: false,
      message: "This leave request has no request ID. Refresh the list and try again.",
    };
  }

  try {
    const result = await deleteLeaveRequestApi(requestId);

    if (!result || result.success === false) {
      return {
        success: false,
        message: result?.message || "Failed to delete leave request.",
      };
    }

    invalidateLeaveCache();

    return {
      success: true,
      deleted: result.deleted ?? true,
    };
  } catch (error) {
    console.error("Delete Leave Error:", error);
    return {
      success: false,
      message: error.message || "Failed to delete leave request.",
    };
  }
};
