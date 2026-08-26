import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

function DashboardLayout() {

  const [search,setSearch] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search...");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  /*
    Below `lg` the sidebar is off screen and this is what brings it back.
    It is separate from `isSidebarCollapsed` on purpose: collapsing is the
    desktop rail's half-width state, opening is the phone drawer's, and
    sharing one flag would leave the desktop rail collapsed after a phone
    visit.
  */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  // Escape closes the drawer, the same as tapping the dimmed page behind it.
  useEffect(() => {
    if (!isSidebarOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="flex h-dvh">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
        isMobileOpen={isSidebarOpen}
        onMobileClose={closeSidebar}
      />

      {/* The open drawer floats over the page, so the page behind it is
          dimmed and takes the tap that closes it. */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/*
        `min-w-0` is what keeps a wide table inside its own panel. A flex item
        defaults to `min-width: auto`, so a table wider than the viewport
        stretches this whole column instead of scrolling, which drags the
        navbar and every panel out of alignment with it.

        The column is the scroller now, rather than the `main` inside it. That
        is what lets the navbar be sticky rather than fixed: it scrolls in the
        same box as the content, stays pinned at the top of it, and the page
        passing underneath is what the blur on it is for. With the scroll on
        `main`, the bar sat outside the scrolling box and had nothing to blur.
      */}
      <div className="hide-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto bg-canvas">
        {/* The list button lives in the navbar, to the left of the search
            box - see Navbar.jsx. */}
        <Navbar
          search={search}
          setSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/*
          Capped and centred. Past about 1600px a full width column stops
          being one page and becomes a band of content with a field of empty
          grey either side of it; the cap keeps the line lengths readable
          while still leaving a wide table more room than it needs.
        */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet context={{search,setSearch,setSearchPlaceholder}}  />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
