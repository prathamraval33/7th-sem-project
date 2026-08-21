// SuperAdminDashboard — Home screen (§5.1).
// 5 top-line KPI cards + Recent Activity feed.
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  Plus,
  Ban,
} from "lucide-react";
import { useSuperAdminStore } from "./superAdminStore";
import KpiCard from "../../components/superadmin/KpiCard";
import { format } from "date-fns";

const ICON_MAP = {
  green: { Icon: Plus, cls: "cd-activity-row__icon--green" },
  amber: { Icon: AlertCircle, cls: "cd-activity-row__icon--amber" },
  blue: { Icon: CheckCircle, cls: "cd-activity-row__icon--blue" },
  red: { Icon: Ban, cls: "cd-activity-row__icon--red" },
};

export default function SuperAdminDashboard() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const activity = useSuperAdminStore((s) => s.activity);
  const navigate = useNavigate();

  const totalColleges = colleges.length;
  const totalStudents = colleges.reduce((sum, c) => sum + (c.students || 0), 0);
  const totalTPOs = colleges.reduce((sum, c) => sum + (c.tpos || 0), 0);
  const totalDrives = colleges.reduce((sum, c) => sum + (c.drives || 0), 0);
  const pendingRequests = featureRequests.filter((r) => r.status === "pending").length;

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="cd-kpi-grid">
        <KpiCard label="Total Colleges" value={totalColleges} trend={{ direction: "up", percentage: "+2 this quarter" }} />
        <KpiCard label="Total Students" value={totalStudents} trend={{ direction: "up", percentage: "+12%" }} />
        <KpiCard label="Total TPOs" value={totalTPOs} />
        <KpiCard label="Total Drives" value={totalDrives} trend={{ direction: "up", percentage: "+8%" }} />
        <KpiCard
          label="Pending Requests"
          value={pendingRequests}
          warning
          onClick={() => navigate("/superadmin/requests")}
        />
      </div>

      {/* Recent Activity */}
      <div className="cd-mt-lg">
        <div className="cd-panel">
          <div className="cd-panel__header">Recent Activity</div>
          <div className="cd-panel__body">
            {activity.slice(0, 8).map((item) => {
              const mapped = ICON_MAP[item.color] || ICON_MAP.blue;
              const { Icon } = mapped;
              return (
                <div key={item.id} className="cd-activity-row">
                  <div className={`cd-activity-row__icon ${mapped.cls}`}>
                    <Icon size={16} />
                  </div>
                  <span className="cd-activity-row__text">{item.text}</span>
                  <span className="cd-activity-row__time">
                    {format(new Date(item.time), "MMM d, yyyy")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
