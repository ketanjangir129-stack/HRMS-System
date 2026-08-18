import {
  ref,
  push,
  set,
  update,
  get,
  onValue,
} from "firebase/database";

import { db } from "../../firebase/firebase";

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const notificationsPath = (companyCode) => `companies/${companyCode}/notifications`;

const userNotificationsPath = (
  companyCode,
  employeeId
) =>
  `${notificationsPath(companyCode)}/${employeeId}`;


/*
|--------------------------------------------------------------------------
| Create Notification
|--------------------------------------------------------------------------
*/

export const createNotification = async (
  companyCode,
  recipientId,
  notification
) => {

  if (!companyCode) {
    throw new Error("Company code is required.");
  }

  if (!recipientId) {
    throw new Error("Notification recipient is required.");
  }

  const notificationRef = push(
    ref(
      db,
      userNotificationsPath(
        companyCode,
        recipientId
      )
    )
  );

  const notificationId = notificationRef.key;

  const payload = {

    event: notification.event || "SYSTEM",

    type: notification.type || "system",

    title: notification.title || "Notification",

    message: notification.message || "",

    entityType: notification.entityType || "",

    entityId: notification.entityId || "",

    route: notification.route || "",

    isRead: false,

    createdAt: Date.now(),

    readAt: null,

    createdBy: notification.createdBy || "",

  };

  await set(
    notificationRef,
    payload
  );

  return {
    success: true,
    notificationId,
    data: payload,
  };
};


/*
|--------------------------------------------------------------------------
| Get Notifications
|--------------------------------------------------------------------------
*/

export const getNotifications = async (
  companyCode,
  employeeId
) => {

  if (!companyCode || !employeeId) {
    return [];
  }

  const snapshot = await get(
    ref(
      db,
      userNotificationsPath(
        companyCode,
        employeeId
      )
    )
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .map(([id, notification]) => ({
      id,
      ...notification,
    }))
    .sort(
      (a, b) =>
        (b.createdAt || 0) -
        (a.createdAt || 0)
    );
};


/*
|--------------------------------------------------------------------------
| Mark One Notification As Read
|--------------------------------------------------------------------------
*/

export const markNotificationAsRead = async (
  companyCode,
  employeeId,
  notificationId
) => {

  if (
    !companyCode ||
    !employeeId ||
    !notificationId
  ) {
    return;
  }

  await update(
    ref(
      db,
      `${userNotificationsPath(
        companyCode,
        employeeId
      )}/${notificationId}`
    ),
    {
      isRead: true,
      readAt: Date.now(),
    }
  );
};


/*
|--------------------------------------------------------------------------
| Mark All Notifications As Read
|--------------------------------------------------------------------------
*/

export const markAllNotificationsAsRead = async (
  companyCode,
  employeeId,
  notifications
) => {

  if (
    !companyCode ||
    !employeeId ||
    !notifications?.length
  ) {
    return;
  }

  const updates = {};

  notifications
    .filter(
      (notification) =>
        !notification.isRead
    )
    .forEach((notification) => {

      updates[
        `${userNotificationsPath(
          companyCode,
          employeeId
        )}/${notification.id}/isRead`
      ] = true;

      updates[
        `${userNotificationsPath(
          companyCode,
          employeeId
        )}/${notification.id}/readAt`
      ] = Date.now();

    });

  if (Object.keys(updates).length === 0) {
    return;
  }

  await update(
    ref(db),
    updates
  );
};


/*
|--------------------------------------------------------------------------
| Delete Notification
|--------------------------------------------------------------------------
*/

export const deleteNotification = async (
  companyCode,
  employeeId,
  notificationId
) => {

  if (
    !companyCode ||
    !employeeId ||
    !notificationId
  ) {
    return;
  }

  await update(
    ref(
      db,
      `${userNotificationsPath(
        companyCode,
        employeeId
      )}/${notificationId}`
    ),
    {
      deletedAt: Date.now(),
    }
  );
};


/*
|--------------------------------------------------------------------------
| Subscribe To Notifications
|--------------------------------------------------------------------------
*/

export const subscribeToNotifications = (
  companyCode,
  employeeId,
  callback
) => {

  if (!companyCode || !employeeId) {
    return () => {};
  }

  const notificationRef = ref(
    db,
    userNotificationsPath(
      companyCode,
      employeeId
    )
  );

  return onValue(
    notificationRef,
    (snapshot) => {

      if (!snapshot.exists()) {

        callback([]);

        return;
      }

      const notifications =
        Object.entries(
          snapshot.val()
        )
          .map(([id, notification]) => ({
            id,
            ...notification,
          }))
          .filter(
            (notification) =>
              !notification.deletedAt
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          );

      callback(notifications);
    }
  );
};