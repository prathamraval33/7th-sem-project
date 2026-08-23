// AuditLogPage — Reverse-chronological action history (§5.9).
// Simplest screen — a read-only table of platform-level events.
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import DataTable from "../../components/superadmin/DataTable";

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
        <h1 className="cd-topbar__title">Audit Log</h1>
      </div>

      <DataTable columns={columns} data={auditLog} />
    </>
  );
}
