import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 overflow-x-hidden">
      <Navbar />
      <div className="flex flex-1 min-w-0">
        <Sidebar role={user?.user_type} />
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
