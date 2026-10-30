import { useState } from "react";
import { toast } from "react-toastify";

import {
  removeHolidayImage,
  uploadHolidayImage,
} from "../services/holidayServices/holidayService";
import {
  HOLIDAY_IMAGE_ACCEPT,
  HOLIDAY_IMAGE_MAX_BYTES,
} from "../utils/holiday/holidayConstants";

/*
|--------------------------------------------------------------------------
| Holiday Image
|--------------------------------------------------------------------------
| Upload or remove the banner picture of a holiday from any panel that shows
| one. `busyId` is the holiday being worked on, so only its banner shows a
| spinner. `onChanged` runs after a successful change so the panel can
| re-read its list.
|--------------------------------------------------------------------------
*/

const ALLOWED_TYPES = HOLIDAY_IMAGE_ACCEPT.split(",");

function useHolidayImage(companyCode, onChanged) {

  const [busyId, setBusyId] = useState("");

  const upload = async (holiday, file) => {

    if (!file || busyId) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or GIF images are allowed.");
      return;
    }

    if (file.size > HOLIDAY_IMAGE_MAX_BYTES) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setBusyId(holiday.holidayId);

    try {

      const result = await uploadHolidayImage(companyCode, holiday, file);

      if (!result.success) {
        toast.error(result.message || "Failed to upload the image.");
        return;
      }

      toast.success(`Image set for ${holiday.name}.`);
      onChanged?.();

    } catch (error) {

      toast.error(error.message || "Failed to upload the image.");

    } finally {

      setBusyId("");

    }

  };

  const remove = async (holiday) => {

    if (busyId) return;

    setBusyId(holiday.holidayId);

    try {

      const result = await removeHolidayImage(companyCode, holiday);

      if (!result.success) {
        toast.error(result.message || "Failed to remove the image.");
        return;
      }

      toast.success(`Image removed from ${holiday.name}.`);
      onChanged?.();

    } catch (error) {

      toast.error(error.message || "Failed to remove the image.");

    } finally {

      setBusyId("");

    }

  };

  return { busyId, upload, remove };

}

export default useHolidayImage;
