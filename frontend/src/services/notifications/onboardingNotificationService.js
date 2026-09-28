import {
  createNotification,
} from "./notificationService";

import {
  getLeaveApproverIds,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";


/*
|--------------------------------------------------------------------------
| Onboarding Form Submitted
|--------------------------------------------------------------------------
| Raised the moment a candidate finishes the public onboarding link, so the
| HR team learns of a request that is now waiting on them. Nothing else in
| the project polls `onboardingRequests`: without this the form sits at
| "Pending Approval" until somebody happens to open the requests screen.
|
| The name is read off the request itself rather than through
| `getEmployeeName`. A candidate has no record under `companies/{code}/
| employees` until the request is approved, so the directory lookup every
| other notification service uses would always come back empty here.
*/

export const notifyOnboardingSubmitted = async (
  companyCode,
  request,
  employeeId
) => {

  const recipientIds =
    await getLeaveApproverIds(
      companyCode
    );

  if (!recipientIds.length) {
    return;
  }

  const employeeName =
    request?.employmentInfo?.name ||
    employeeId ||
    "A candidate";

  await Promise.all(

    recipientIds.map(
      (recipientId) =>

        createNotification(
          companyCode,
          recipientId,
          {

            event:
              NOTIFICATION_EVENTS
                .ONBOARDING_REQUEST,

            type:
              NOTIFICATION_TYPES.ONBOARDING,

            title:
              "New Onboarding Request",

            message:
              `${employeeName} (${employeeId}) has submitted the onboarding form.`,

            entityType:
              "onboarding",

            entityId:
              employeeId,

            route:
              "/OnboardDashboard/OnBoardRequest",

            createdBy:
              employeeId || "",

          }
        )
    )

  );

};
