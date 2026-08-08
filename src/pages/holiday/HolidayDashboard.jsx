import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import DeleteHolidayModal from "../../components/holiday/DeleteHolidayModal";
import HolidayCalendar from "../../components/holiday/HolidayCalendar/HolidayCalendar";
import HolidayHeader from "../../components/holiday/HolidayHeader";
import HolidayModal from "../../components/holiday/HolidayModal";
import HolidayStatsCards from "../../components/holiday/HolidayStatsCards";
import HolidayTable from "../../components/holiday/HolidayTable";
import UpcomingHolidayCard from "../../components/holiday/UpcomingHolidayCard";
import useAuth from "../../hooks/useAuth";
import useHolidays from "../../hooks/useHolidays";
import useRoleAccess from "../../hooks/useRoleAccess";
import useUpcomingHolidays from "../../hooks/useUpcomingHolidays";
import { getHolidayStats } from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Holiday Dashboard
|--------------------------------------------------------------------------
| The company holiday year: the counts, the calendar, what is coming up and
| the full list, with add, edit and delete on top.
|
| The year selector drives every panel, because holidays are declared and
| stored per year. The upcoming panel is the one exception: it reads from
| today forwards and crosses into the next year on its own, so it keeps
| answering "what is next" even while a past year is being reviewed.
|
| Both lists are reloaded after a change. The year on screen is the obvious
| one; the upcoming list is reloaded too because a holiday added to next year
| belongs in it even though it is not part of the list below.
|--------------------------------------------------------------------------
*/

function HolidayDashboard() {

  const { company, currentUser } = useAuth();

  const { canAccessSection } = useRoleAccess();

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const companyCode = company?.companyCode;

  const showCalendar = canAccessSection("holidays.calendar");
  const showUpcoming = canAccessSection("holidays.upcoming");
  const showList = canAccessSection("holidays.list");
  const canAddHoliday = canAccessSection("holidays.add");
  const canEditHoliday = canAccessSection("holidays.edit");
  const canDeleteHoliday = canAccessSection("holidays.delete");

  const [year, setYear] = useState(() => new Date().getFullYear());

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    holidays,
    loading,
    error,
    reload,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  } = useHolidays(companyCode, year);

  const {
    holidays: upcoming,
    loading: upcomingLoading,
    error: upcomingError,
    reload: reloadUpcoming,
  } = useUpcomingHolidays(companyCode);

  useEffect(() => {

    setSearchPlaceholder("Search holidays...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };

  }, [setSearch, setSearchPlaceholder]);

  const stats = useMemo(
    () => getHolidayStats(holidays),
    [holidays]
  );

  /*
  | Who declared the holiday, stored on the record so a company calendar can
  | be traced back to the person who published it.
  */
  const actorName =
    currentUser?.personalInfo?.name ||
    currentUser?.name ||
    currentUser?.email ||
    "Admin";

  const handleRefresh = () => {
    reload();
    reloadUpcoming();
  };

  /*
  |--------------------------------------------------------------------------
  | Add / Edit
  |--------------------------------------------------------------------------
  | One handler for both, because the modal is one form: an id on the holiday
  | being edited is the only thing that tells them apart.
  */

  const openAddModal = () => {
    setEditHoliday(null);
    setShowHolidayModal(true);
  };

  const openEditModal = (holiday) => {
    setEditHoliday(holiday);
    setShowHolidayModal(true);
  };

  const closeHolidayModal = () => {

    if (submitting) return;

    setShowHolidayModal(false);
    setEditHoliday(null);

  };

  const handleSave = async (payload) => {

    if (!companyCode) {
      toast.error("Company not found.");
      return;
    }

    /*
    | The buttons are already hidden without these permissions. Checked again
    | on the way in because this handler is what writes, and it should not
    | depend on a button being the only route to it.
    |
    | One handler serves both, so which permission applies is decided the same
    | way the modal decides its title: by whether a holiday is being edited.
    */
    if (editHoliday ? !canEditHoliday : !canAddHoliday) {
      toast.error(
        editHoliday
          ? "You are not allowed to edit holidays."
          : "You are not allowed to add holidays."
      );
      return;
    }

    setSubmitting(true);

    try {

      const result = editHoliday
        ? await updateHoliday(editHoliday, payload)
        : await createHoliday({
            ...payload,
            createdBy: actorName,
          });

      if (!result?.success) {

        toast.error(
          result?.message ||
            `Failed to ${editHoliday ? "update" : "add"} holiday.`
        );

        return;

      }

      /*
      | A holiday saved into a year other than the one on screen would vanish
      | without a word, so the toast says where it went.
      */
      const savedElsewhere =
        result.year && Number(result.year) !== Number(year);

      toast.success(
        editHoliday
          ? savedElsewhere
            ? `Holiday updated and moved to ${result.year}.`
            : "Holiday updated successfully."
          : savedElsewhere
            ? `Holiday added to ${result.year}.`
            : "Holiday added successfully."
      );

      reloadUpcoming();

      setShowHolidayModal(false);
      setEditHoliday(null);

    } catch (saveError) {

      console.error(saveError);

      toast.error(
        saveError?.message ||
          `Failed to ${editHoliday ? "update" : "add"} holiday.`
      );

    } finally {

      setSubmitting(false);

    }

  };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const handleDelete = async () => {

    if (!deleteTarget?.holidayId) return;

    if (!canDeleteHoliday) {
      toast.error("You are not allowed to delete holidays.");
      return;
    }

    setDeleting(true);

    try {

      const result = await deleteHoliday(deleteTarget);

      if (!result?.success) {
        toast.error(result?.message || "Failed to delete holiday.");
        return;
      }

      toast.success("Holiday deleted successfully.");

      reloadUpcoming();

      setDeleteTarget(null);

    } catch (deleteError) {

      console.error(deleteError);

      toast.error(deleteError?.message || "Failed to delete holiday.");

    } finally {

      setDeleting(false);

    }

  };

  return (

    <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

      <HolidayHeader
        year={year}
        setYear={setYear}
        loading={loading || upcomingLoading}
        onRefresh={handleRefresh}
        onAddHoliday={openAddModal}
        canAddHoliday={canAddHoliday}
        totalHolidays={stats.total}
      />

      <HolidayStatsCards stats={stats} loading={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {(showCalendar || showUpcoming) && (

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

          {showCalendar && (
            <div className={showUpcoming ? "xl:col-span-5" : "xl:col-span-12"}>
              <HolidayCalendar
                holidays={holidays}
                loading={loading}
                year={year}
              />
            </div>
          )}

          {showUpcoming && (
            <div className={showCalendar ? "xl:col-span-7" : "xl:col-span-12"}>
              <UpcomingHolidayCard
                holidays={upcoming}
                loading={upcomingLoading}
                error={upcomingError}
                onRetry={reloadUpcoming}
              />
            </div>
          )}

        </div>

      )}

      {showList && (
        <HolidayTable
          holidays={holidays}
          loading={loading}
          error={error}
          onRetry={reload}
          year={year}
          headerSearch={search}
          /*
          | Withheld rather than disabled. The table builds its Actions column
          | only when it is given a handler, so a role with neither loses the
          | column instead of looking at two buttons it cannot press.
          */
          onEdit={canEditHoliday ? openEditModal : undefined}
          onDelete={canDeleteHoliday ? setDeleteTarget : undefined}
          emptyMessage={`No holiday has been declared for ${year} yet.`}
        />
      )}

      <HolidayModal
        open={showHolidayModal}
        holiday={editHoliday}
        holidays={holidays}
        year={year}
        submitting={submitting}
        onSubmit={handleSave}
        onClose={closeHolidayModal}
      />

      <DeleteHolidayModal
        open={Boolean(deleteTarget)}
        holiday={deleteTarget}
        deleting={deleting}
        onConfirm={handleDelete}
        onClose={() => {

          if (deleting) return;

          setDeleteTarget(null);

        }}
      />

    </div>

  );

}

export default HolidayDashboard;
