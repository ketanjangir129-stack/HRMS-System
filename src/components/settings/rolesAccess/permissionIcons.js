import {
  MdDashboard,
  MdOutlineBeachAccess,
  MdOutlineCelebration,
  MdOutlinePolicy,
} from "react-icons/md";
import { FaBuilding, FaTasks } from "react-icons/fa";
import { BsFillPersonLinesFill, BsCalendarCheck } from "react-icons/bs";
import { PiPersonSimpleSnowboardLight } from "react-icons/pi";
import { GiTakeMyMoney } from "react-icons/gi";
import { BadgeIndianRupee, Layers } from "lucide-react";

/*
|--------------------------------------------------------------------------
| Permission Icons
|--------------------------------------------------------------------------
| The same icon each module already carries in the sidebar, so a group in
| Roles & Access is recognised as the thing it switches on and off.
|
| Kept out of the registry because that file is imported by services and pure
| utilities, and neither should be pulling in JSX.
|--------------------------------------------------------------------------
*/

export const PERMISSION_ICONS = {
  dashboard: MdDashboard,
  departments: FaBuilding,
  employees: BsFillPersonLinesFill,
  onboarding: PiPersonSimpleSnowboardLight,
  attendance: BsCalendarCheck,
  leave: MdOutlineBeachAccess,
  holidays: MdOutlineCelebration,
  salary: GiTakeMyMoney,
  payroll: BadgeIndianRupee,
  hrPolicy: MdOutlinePolicy,
  tasks: FaTasks,
};

/*
| A page the map does not name still gets an icon, so a newly registered page
| renders as a group rather than as a hole where one should be.
*/

export const FALLBACK_PERMISSION_ICON = Layers;
