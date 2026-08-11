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
    <div className="flex h-screen">
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
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The list button lives in the navbar, to the left of the search
            box - see Navbar.jsx. */}
        <Navbar
          search={search}
          setSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8 hide-scrollbar">
          <Outlet context={{search,setSearch,setSearchPlaceholder}}  />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
