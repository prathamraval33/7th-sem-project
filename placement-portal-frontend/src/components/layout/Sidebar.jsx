import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  BookOpen,
  MessagesSquare,
  FileText,
  Wand2,
  TrendingDown,
  Users,
  ListChecks,
  BarChart3,
  Mail,
  Activity,
  ShieldCheck,
  Puzzle,
  GraduationCap,
  Building2,
} from "lucide-react";
import { useActiveFeatures } from "../../hooks/useActiveFeatures";

// Role-specific nav items. Items with `featureCode` are dynamically hidden
// if that feature is not ACTIVE for the user's institution.
const NAV_ITEMS = {
  student: [
    { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
    { label: "Drives", to: "/student/drives", icon: Briefcase },
    { label: "Tests", to: "/student/tests", icon: ListChecks, featureCode: "instant_tests" },
    { label: "Resources", to: "/student/resources", icon: BookOpen, featureCode: "study_resources" },
    { label: "GATE & CAT Prep", to: "/student/gate-cat-prep", icon: GraduationCap, featureCode: "gate_cat_prep" },
    { label: "Mock Interview", to: "/student/mock-interview", icon: MessagesSquare, featureCode: "mock_interviews" },
    { label: "Resume", to: "/student/resume", icon: FileText },
    { label: "Resume Enhancer", to: "/student/resume-enhancer", icon: Wand2, featureCode: "resume_analyzer" },
    { label: "Weak Areas", to: "/student/weak-areas", icon: TrendingDown },
  ],
  tpo: [
    { label: "Dashboard", to: "/tpo/dashboard", icon: LayoutDashboard },
    { label: "Manage Drives", to: "/tpo/drives", icon: Briefcase },
    { label: "All Students", to: "/tpo/students", icon: Users },
    { label: "Tests", to: "/tpo/tests", icon: ListChecks, featureCode: "instant_tests" },
    { label: "Curriculum Resources", to: "/tpo/curriculum", icon: BookOpen, featureCode: "study_resources" },
    { label: "Accreditation Reports", to: "/tpo/reports", icon: ShieldCheck },
    { label: "Analytics", to: "/tpo/analytics", icon: BarChart3 },
    { label: "Contact Messages", to: "/tpo/contact-messages", icon: Mail },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Curriculum Setup", to: "/admin/curriculum", icon: GraduationCap, featureCode: "study_resources" },
    { label: "Study Materials", to: "/admin/resources", icon: BookOpen, featureCode: "study_resources" },
    { label: "All Drives", to: "/admin/drives", icon: Briefcase },
    { label: "All Students", to: "/admin/students", icon: Users },
    { label: "Activity Feed", to: "/admin/activity", icon: Activity },
    { label: "Available Features", to: "/admin/features", icon: Puzzle },
    { label: "Contact Messages", to: "/admin/contact-messages", icon: Mail },
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    { label: "Institution Settings", to: "/admin/settings", icon: Building2 },
  ],
};

export default function Sidebar({ role }) {
  const { isFeatureActive } = useActiveFeatures();
  const rawItems = NAV_ITEMS[role] ?? [];

  // Hide nav items whose features have been revoked or not activated
  const visibleItems = rawItems.filter(
    (item) => !item.featureCode || isFeatureActive(item.featureCode)
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block shadow-sm z-10">
      <nav className="flex flex-col gap-1">
        {visibleItems.map(({ label, to, icon: Icon }) => (
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

