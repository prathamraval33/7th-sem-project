import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar role={user?.user_type} />
        <main className="flex-1 bg-neutral-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
