import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function DashboardLayout() {

  const [search,setSearch] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search...");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
      />

      {/*
        `min-w-0` is what keeps a wide table inside its own panel. A flex item
        defaults to `min-width: auto`, so a table wider than the viewport
        stretches this whole column instead of scrolling, which drags the
        navbar and every panel out of alignment with it.
      */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar search={search} setSearch={setSearch} searchPlaceholder={searchPlaceholder} />

        <main className="flex-1 overflow-y-auto bg-gray-100 p-8 hide-scrollbar">
          <Outlet context={{search,setSearch,setSearchPlaceholder}}  />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
