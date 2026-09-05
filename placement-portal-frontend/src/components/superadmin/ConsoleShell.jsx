// ConsoleShell — Global layout shell for the SuperAdmin console.
// Fixed 240px sidebar with navigation + live pending badge,
// top bar with page title, and scrollable content area (§3).
import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Puzzle,
  CreditCard,
  BarChart3,
  Megaphone,
  ScrollText,
  GraduationCap,
} from "lucide-react";
import { useSuperAdminStore } from "../../pages/superadmin/superAdminStore";
import NotificationBell from "../layout/NotificationBell";
import ProfileDropdown from "../layout/ProfileDropdown";
import "../../styles/commandDeck.css";

const NAV_ITEMS = [
  { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/superadmin/colleges", label: "Colleges", icon: Building2 },
  { to: "/superadmin/features", label: "Feature Management", icon: Puzzle, showBadge: true },
  { to: "/superadmin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/superadmin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/superadmin/audit-log", label: "Audit Log", icon: ScrollText },
];

export default function ConsoleShell() {
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const toast = useSuperAdminStore((s) => s.toast);
  const hydrateSuperAdmin = useSuperAdminStore((s) => s.hydrateSuperAdmin);
  const location = useLocation();

  useEffect(() => {
    hydrateSuperAdmin();
  }, [hydrateSuperAdmin]);

  const pendingCount = featureRequests.filter((r) => r.status === "pending" || r.status === "pending_review").length;

  return (
    <div className="cd-shell">
      {/* ---- Sidebar ---- */}
      <aside className="cd-sidebar">
        {/* Brand Home Link (matching rest of the platform) */}
        <Link
          to="/superadmin/dashboard"
          className="cd-sidebar__logo"
          title="Go to Dashboard Home"
        >
          <GraduationCap size={24} className="text-blue-600 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-sm font-bold text-slate-900 leading-snug truncate">
              Placement Portal
            </span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
              SuperAdmin
            </span>
          </div>
        </Link>

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
      </aside>

      {/* ---- Main Layout Area ---- */}
      <div className="cd-main-area">
        {/* Persistent Top Header Bar */}
        <header className="cd-header-bar">
          <div className="cd-header-bar__title">
            <span className="cd-header-bar__brand">Command Deck</span>
            <span className="cd-header-bar__divider">/</span>
            <span className="cd-header-bar__role">SuperAdmin Console</span>
          </div>

          <div className="cd-header-bar__actions">
            <NotificationBell variant="commandDeck" />
            <div className="cd-header-bar__sep" />
            <ProfileDropdown variant="commandDeck" />
          </div>
        </header>

        {/* Content area */}
        <main className="cd-content">
          <Outlet />
        </main>
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
