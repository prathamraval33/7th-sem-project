// AuditLogPage — Reverse-chronological action history (§5.9).
// A luxury read-only audit deck of platform-level events.
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import DataTable from "../../components/superadmin/DataTable";
import { Shield, Lock } from "lucide-react";
import {
  AnimatedWords,
  LiveStatusBeacon,
  SuperAdminTickerRibbon,
} from "../../components/common/MotionKit";

export default function AuditLogPage() {
  const auditLog = useSuperAdminStore((s) => s.auditLog);

  const columns = [
    {
      key: "action",
      header: "Action",
      className: "cd-table__cell--bold",
    },
    {
      key: "details",
      header: "Details",
      className: "cd-table__cell--secondary",
    },
    {
      key: "timestamp",
      header: "Timestamp",
      className: "cd-table__cell--meta",
      render: (row) => format(new Date(row.timestamp), "MMM d, yyyy · h:mm a"),
    },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
              <Shield size={13} className="text-indigo-600" />
              <span>Immutable Ledger</span>
            </span>
            <LiveStatusBeacon label="INGESTION LIVE" variant="active" />
          </div>

          <h1 className="cd-topbar__title text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            <AnimatedWords text="Federation Security Audit Log" delay={0.05} />
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time chronological telemetry of all administrative modifications, feature toggles, and security actions.
          </p>
        </div>
      </div>

      <SuperAdminTickerRibbon className="mb-6" />

      <DataTable columns={columns} data={auditLog} />
    </>
  );
}
