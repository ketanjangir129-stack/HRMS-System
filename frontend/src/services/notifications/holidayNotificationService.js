import {
  createNotification,
} from "./notificationService";

import {
  getAllEmployeeIds,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";

import {
  formatHolidayDateWithDay,
} from "../../utils/holiday/holidayUtils";


/*
|--------------------------------------------------------------------------
| Holiday Notifications
|--------------------------------------------------------------------------
| Leave and attendance notifications are routed: they go to the people who
| have to act on the request. A holiday is not a request, so it goes to the
| whole company — everybody plans around the calendar, so everybody is told.
|
| The day of the week is carried in the message because that is what a
| holiday announcement is read for: "Mon, 05 Aug 2026" says whether it
| lengthens a weekend without anyone having to open the calendar.
|--------------------------------------------------------------------------
*/

export const notifyHolidayAdded = async (
  companyCode,
  holiday,
  holidayId
) => {

  const recipientIds =
    await getAllEmployeeIds(
      companyCode
    );

  if (!recipientIds.length) {
    return;
  }

  const holidayName =
    holiday?.name ||
    "A holiday";

  const dateText =
    formatHolidayDateWithDay(
      holiday?.date
    );

  await Promise.all(

    recipientIds.map(
      (recipientId) =>

        createNotification(
          companyCode,
          recipientId,
          {

            event:
              NOTIFICATION_EVENTS
                .HOLIDAY_ADDED,

            type:
              NOTIFICATION_TYPES.HOLIDAY,

            title:
              "New Holiday Declared",

            message:
              `${holidayName} has been declared as a holiday on ${dateText}.`,

            entityType:
              "holiday",

            entityId:
              holidayId,

            route:
              "/holidays",

            createdBy:
              holiday?.createdBy ||
              "",

          }
        )
    )

  );

};
