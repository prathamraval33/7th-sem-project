import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import { ROLE_THEME } from "./roleTheme";

export default function Navbar() {
  const { user } = useAuth();
  const theme = ROLE_THEME[user?.user_type] ?? ROLE_THEME.student;
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
        <ProfileDropdown variant="default" />
      </div>
    </header>
  );
}
