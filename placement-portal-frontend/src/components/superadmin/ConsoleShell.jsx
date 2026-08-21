// ConsoleShell — Global layout shell for the SuperAdmin console.
// Fixed 240px sidebar with navigation + live pending badge,
// top bar with page title, and scrollable content area (§3).
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Puzzle,
  MessageSquareWarning,
  BarChart3,
  Megaphone,
  ScrollText,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { useSuperAdminStore } from "../../pages/superadmin/superAdminStore";
import "../../styles/commandDeck.css";

const NAV_ITEMS = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/superadmin/colleges", label: "Colleges", icon: Building2 },
  { to: "/superadmin/features", label: "Feature Catalog", icon: Puzzle },
  { to: "/superadmin/requests", label: "Feature Requests", icon: MessageSquareWarning, showBadge: true },
  { to: "/superadmin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/superadmin/audit-log", label: "Audit Log", icon: ScrollText },
];

export default function ConsoleShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const toast = useSuperAdminStore((s) => s.toast);
  const location = useLocation();

  const pendingCount = featureRequests.filter((r) => r.status === "pending").length;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="cd-shell">
      {/* ---- Sidebar ---- */}
      <aside className="cd-sidebar">
        {/* Logo */}
        <div className="cd-sidebar__logo">
          <div className="cd-sidebar__logo-icon">
            <Shield size={16} />
          </div>
          <span>Dashboard</span>
        </div>

        {/* Navigation */}
        <nav className="cd-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`cd-sidebar__nav-item ${isActive ? "cd-sidebar__nav-item--active" : ""}`}
              >
                <Icon className="cd-sidebar__nav-icon" />
                <span>{item.label}</span>
                {item.showBadge && pendingCount > 0 && (
                  <span className={`cd-sidebar__badge ${pendingCount > 5 ? "cd-sidebar__badge--urgent" : ""}`}>
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Account area */}
        <div className="cd-sidebar__account">
          <span className="cd-sidebar__account-label" title={user?.email || "SuperAdmin"}>
            {user?.email || "SuperAdmin"}
          </span>
          <button className="cd-sidebar__signout" title="Sign out" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ---- Content area ---- */}
      <div className="cd-content">
        <Outlet />
      </div>

      {/* ---- Toast notification ---- */}
      {toast && (
        <div className="cd-toast">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.2" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
