import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useAuth from "./useAuth";

import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notifications/notificationService";

import { getUserRole } from "../utils/attendance/attendanceRequestUtils";

import { OWNER_ROLE } from "../utils/permissions/permissionConstants";

import { isOwnerRole } from "../utils/permissions/permissionUtils";

function useNotifications() {

  const { company, currentUser } = useAuth();

  const companyCode =
    company?.companyCode;

  /*
  | Which box to read. The owner has no employee record — `currentUser` is
  | only { role, name, email } — so the employee chain alone left the bell
  | permanently empty for the one account that can never be locked out of
  | anything. The owner reads the fixed `owner` key instead, which is where
  | `getLeaveApproverIds` writes and the same identity `getCurrentActor`
  | hands to the rest of the project.
  */

  const employeeId =
    isOwnerRole(getUserRole(currentUser))
      ? OWNER_ROLE
      : currentUser?.employmentInfo?.employeeId ||
        currentUser?.account?.username ||
        currentUser?.employeeId;

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    if (
      !companyCode ||
      !employeeId
    ) {

      setNotifications([]);
      setLoading(false);

      return;
    }

    setLoading(true);

    const unsubscribe =
      subscribeToNotifications(
        companyCode,
        employeeId,
        (data) => {

          setNotifications(data);

          setLoading(false);
        }
      );

    return unsubscribe;

  }, [
    companyCode,
    employeeId,
  ]);


  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.isRead
      ).length,
    [notifications]
  );


  const markAsRead =
    useCallback(
      async (notificationId) => {

        await markNotificationAsRead(
          companyCode,
          employeeId,
          notificationId
        );

      },
      [
        companyCode,
        employeeId,
      ]
    );


  const markAllAsRead =
    useCallback(
      async () => {

        await markAllNotificationsAsRead(
          companyCode,
          employeeId,
          notifications
        );

      },
      [
        companyCode,
        employeeId,
        notifications,
      ]
    );


  return {

    notifications,

    unreadCount,

    loading,

    markAsRead,

    markAllAsRead,

  };
}

export default useNotifications;