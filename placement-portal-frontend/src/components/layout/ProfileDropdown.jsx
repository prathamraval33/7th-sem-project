import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { ROLE_THEME } from "./roleTheme";
import { useHoverPinnedDropdown } from "../../hooks/useHoverPinnedDropdown";

export default function ProfileDropdown({ variant = "default" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    isOpen,
    wrapperRef,
    handleMouseEnter,
    handleMouseLeave,
    handleTogglePin,
    closeDropdown,
  } = useHoverPinnedDropdown();

  const isCommandDeck = variant === "commandDeck";
  const theme = ROLE_THEME[user?.user_type] ?? ROLE_THEME.student;

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    closeDropdown();
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const profilePath = isCommandDeck
    ? "/superadmin/dashboard"
    : `/${user?.user_type || "student"}/profile`;

  if (isCommandDeck) {
    return (
      <div
        ref={wrapperRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={handleTogglePin}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-100 focus:outline-none"
          aria-label="SuperAdmin menu"
          aria-expanded={isOpen}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm ring-1 ring-blue-500/20">
            {initials}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-tight text-slate-900">
              {user?.email?.split("@")[0] || "SuperAdmin"}
            </p>
            <p className="text-[10px] font-medium leading-none text-slate-500">
              Platform Admin
            </p>
          </div>
        </button>

        {isOpen && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                  <Shield size={10} /> SuperAdmin
                </span>
              </div>
            </div>

            <div className="py-1">
              <Link
                to={profilePath}
                onClick={closeDropdown}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
              >
                <User size={15} /> Dashboard Overview
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant (TPO / Student / Admin)
  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleTogglePin}
        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-100"
        aria-label="User profile menu"
        aria-expanded={isOpen}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${theme.accentBg}`}
        >
          {initials}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card shadow-md">
          <Link
            to={profilePath}
            onClick={closeDropdown}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            <User size={16} /> Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error-600 hover:bg-neutral-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
