import { Link, NavLink } from "react-router-dom";
import { GraduationCap, Activity, Menu } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import { ROLE_THEME } from "./roleTheme";

export default function Navbar({ onOpenMobileMenu }) {
  const { user } = useAuth();
  const theme = ROLE_THEME[user?.user_type] ?? ROLE_THEME.student;
  const dashboardPath = user?.user_type ? `/${user.user_type}/dashboard` : "/";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-2xs select-none supports-backdrop-filter:bg-white/70">
      <div className="flex items-center gap-2">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        )}
        <Link to={dashboardPath} className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
          <GraduationCap size={22} className={theme.accentText} />
          <span className="hidden xs:inline sm:inline">Placement Portal</span>
          <span className="xs:hidden sm:hidden text-base">Portal</span>
          {user && (
            <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white ${theme.accentBg}`}>
              {theme.label}
            </span>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user?.user_type === "admin" && (
          <NavLink
            to="/admin/activities"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide transition-all border ${
                isActive
                  ? "bg-accent/10 text-accent border-accent/30 shadow-xs ring-1 ring-accent/20"
                  : "bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80"
              }`
            }
            title="Activities: Messages Hub & Audit Logs"
          >
            <div className="relative flex items-center justify-center">
              <Activity size={15} className="text-accent shrink-0" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <span className="hidden sm:inline">Activities</span>
            <span className="hidden md:inline-block rounded px-1.5 py-0.5 bg-white text-[10px] font-medium text-slate-500 border border-slate-200">
              Hub
            </span>
          </NavLink>
        )}
        <NotificationBell />
        <ProfileDropdown variant="default" />
      </div>
    </header>
  );
}
