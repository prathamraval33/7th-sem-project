import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  BookOpen,
  MessagesSquare,
  FileText,
  TrendingDown,
  Users,
  ListChecks,
  BarChart3,
  Mail,
  Activity,
  ShieldCheck,
} from "lucide-react";

// Role-specific nav items, matching each role's page set from the master
// prompt's frontend folder structure. Routes are wired here now; the pages
// themselves are built in later phases (6-8).
const NAV_ITEMS = {
  student: [
    { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
    { label: "Drives", to: "/student/drives", icon: Briefcase },
    { label: "Tests", to: "/student/tests", icon: ListChecks },
    { label: "Resources", to: "/student/resources", icon: BookOpen },
    { label: "Mock Interview", to: "/student/mock-interview", icon: MessagesSquare },
    { label: "Resume", to: "/student/resume", icon: FileText },
    { label: "Weak Areas", to: "/student/weak-areas", icon: TrendingDown },
  ],
  tpo: [
    { label: "Dashboard", to: "/tpo/dashboard", icon: LayoutDashboard },
    { label: "Manage Drives", to: "/tpo/drives", icon: Briefcase },
    { label: "All Students", to: "/tpo/students", icon: Users },
    { label: "Tests", to: "/tpo/tests", icon: ListChecks },
    { label: "Accreditation Reports", to: "/tpo/reports", icon: ShieldCheck },
    { label: "Analytics", to: "/tpo/analytics", icon: BarChart3 },
    { label: "Contact Messages", to: "/tpo/contact-messages", icon: Mail },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "All Drives", to: "/admin/drives", icon: Briefcase },
    { label: "All Students", to: "/admin/students", icon: Users },
    { label: "Activity Feed", to: "/admin/activity", icon: Activity },
    { label: "Manage Resources", to: "/admin/resources", icon: BookOpen },
    { label: "Contact Messages", to: "/admin/contact-messages", icon: Mail },
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  ],
};

export default function Sidebar({ role }) {
  const items = NAV_ITEMS[role] ?? [];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block shadow-sm z-10">
      <nav className="flex flex-col gap-1">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
