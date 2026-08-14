import { Link } from "react-router-dom";
import { User, LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import NotificationBell from "./NotificationBell";
import { ROLE_THEME } from "./roleTheme";
import { useHoverPinnedDropdown } from "../../hooks/useHoverPinnedDropdown";

export default function Navbar() {
  const { user, logout } = useAuth();
  const {
    isOpen: isMenuOpen,
    wrapperRef: profileMenuRef,
    handleMouseEnter: handleProfileMouseEnter,
    handleMouseLeave: handleProfileMouseLeave,
    handleTogglePin: handleProfileTogglePin,
    closeDropdown: closeProfileMenu,
  } = useHoverPinnedDropdown();

  const theme = ROLE_THEME[user?.user_type] ?? ROLE_THEME.student;

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dashboardPath = user?.user_type ? `/${user.user_type}/dashboard` : "/";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
      <Link to={dashboardPath} className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
        <GraduationCap size={22} className={theme.accentText} />
        Placement Portal
        {user && (
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${theme.accentBg}`}>
            {theme.label}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div
          ref={profileMenuRef}
          className="relative"
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          <button
            type="button"
            onClick={handleProfileTogglePin}
            className="flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-100"
            aria-label="User profile menu"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${theme.accentBg}`}
            >
              {initials}
            </span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card shadow-md">
              <Link
                to={`/${user?.user_type || "student"}/profile`}
                onClick={closeProfileMenu}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <User size={16} /> Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeProfileMenu();
                  logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error-600 hover:bg-neutral-50"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
