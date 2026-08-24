import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaBell,
  FaCheck,
} from "react-icons/fa";

import {
  useNavigate,
} from "react-router-dom";

import useNotifications
  from "../../hooks/useNotifications";

function NotificationBell() {

  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [
    open,
    setOpen,
  ] = useState(false);

  const containerRef =
    useRef(null);


  /*
  |--------------------------------------------------------------------------
  | Close when clicking outside
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    const handleClickOutside =
      (event) => {

        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target
          )
        ) {
          setOpen(false);
        }

      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  const handleNotificationClick =
    async (notification) => {

      if (!notification.isRead) {

        await markAsRead(
          notification.id
        );

      }

      setOpen(false);

      if (notification.route) {

        navigate(
          notification.route
        );

      }

    };


  const visibleNotifications =
    notifications.slice(0, 8);


  return (

    <div
      ref={containerRef}
      className="relative"
    >

      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface-muted hover:text-brand cursor-pointer"
      >

        <FaBell className="text-lg" />

        {unreadCount > 0 && (

          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>

        )}

      </button>


      {open && (

        <div
          className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
        >

          {/* Header */}

          <div
            className="flex items-center justify-between border-b border-line-subtle px-4 py-3"
          >

            <div>

              <h3 className="text-sm font-semibold text-ink">
                Notifications
              </h3>

              <p className="text-xs text-ink-subtle">
                {unreadCount} unread
              </p>

            </div>

            {unreadCount > 0 && (

              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover"
              >
                <FaCheck />
                Mark all read
              </button>

            )}

          </div>


          {/* Body */}

          <div className="max-h-[420px] overflow-y-auto">

            {loading ? (

              <div className="px-4 py-10 text-center text-sm text-ink-faint">
                Loading notifications...
              </div>

            ) : visibleNotifications.length === 0 ? (

              <div className="px-4 py-12 text-center">

                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                  <FaBell />
                </div>

                <p className="text-sm font-medium text-ink-muted">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-ink-faint">
                  You're all caught up.
                </p>

              </div>

            ) : (

              visibleNotifications.map(
                (notification) => (

                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`flex w-full gap-3 border-b border-line-subtle px-4 py-3 text-left transition-colors hover:bg-surface-muted ${
                      !notification.isRead
                        ? "bg-blue-50/40 dark:bg-blue-500/10"
                        : ""
                    }`}
                  >

                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-3">

                        <p className="text-sm font-semibold text-ink">
                          {notification.title}
                        </p>

                        {!notification.isRead && (

                          <span className="shrink-0 text-[10px] font-semibold text-brand">
                            NEW
                          </span>

                        )}

                      </div>

                      <p className="mt-1 text-xs leading-5 text-ink-subtle">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[10px] text-ink-faint">
                        {formatNotificationTime(
                          notification.createdAt
                        )}
                      </p>

                    </div>

                  </button>

                )
              )

            )}

          </div>

        </div>

      )}

    </div>

  );
}


function formatNotificationTime(
  timestamp
) {

  if (!timestamp) {
    return "";
  }

  const diff =
    Date.now() - timestamp;

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;


  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {

    return `${Math.floor(
      diff / minute
    )}m ago`;

  }

  if (diff < day) {

    return `${Math.floor(
      diff / hour
    )}h ago`;

  }

  return new Date(timestamp)
    .toLocaleDateString();
}

export default NotificationBell;