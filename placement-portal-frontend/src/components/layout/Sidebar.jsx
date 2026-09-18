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
  FileCheck,
  CreditCard,
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
    { label: "Fee Verification", to: "/tpo/fee-verification", icon: FileCheck },
    { label: "Curriculum Resources", to: "/tpo/curriculum", icon: BookOpen, featureCode: "study_resources" },
    { label: "Accreditation Reports", to: "/tpo/reports", icon: ShieldCheck },
    { label: "Analytics", to: "/tpo/analytics", icon: BarChart3 },
    { label: "Contact Messages", to: "/tpo/contact-messages", icon: Mail },
  ],
  admin: [
    { type: "section", label: "Overview" },
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Activities", to: "/admin/activities", icon: Activity },
    { label: "Reports & Analytics", to: "/admin/analytics", icon: BarChart3 },
    { type: "section", label: "Administration" },
    { label: "User Management", to: "/admin/users", icon: Users },
    { label: "Modules & Add-ons", to: "/admin/features", icon: Puzzle },
    { label: "Billing & Subscription", to: "/admin/billing", icon: CreditCard },
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
    <aside className="hidden w-56 md:w-60 shrink-0 border-r border-border bg-card p-3 md:p-4 md:block shadow-sm z-10 select-none">
      <nav className="flex flex-col gap-1">
        {visibleItems.map((item, idx) => {
          if (item.type === "section") {
            return (
              <div
                key={`section-${idx}`}
                className="pt-3.5 pb-1 px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400"
              >
                {item.label}
              </div>
            );
          }
          const { label, to, icon: Icon } = item;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-accent/10 text-accent font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

