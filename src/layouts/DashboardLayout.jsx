import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function DashboardLayout() {

  const [search,setSearch] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search...");

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar search={search} setSearch={setSearch} searchPlaceholder={searchPlaceholder} />

        <main className="flex-1 overflow-y-auto bg-gray-100 p-8 hide-scrollbar">
          <Outlet context={{search,setSearch,setSearchPlaceholder}}  />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;