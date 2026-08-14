import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, GraduationCap, ShieldAlert, Download, Printer } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import { tpoReportsApi } from "../../api/tpo_reports.api";
import { showError, showToast } from "../../utils/swal";

const REPORT_TYPES = [
  { id: "company_selections", label: "Company Selections", icon: FileSpreadsheet },
  { id: "branch_ctc", label: "Branch CTC Analysis", icon: GraduationCap },
  { id: "unplaced_students", label: "Unplaced Students", icon: ShieldAlert },
  { id: "proctoring_audits", label: "Proctoring Audit Logs", icon: FileText },
];

const REPORT_COLUMNS = {
  company_selections: [
    { key: "company_name", label: "Company" },
    { key: "student_name", label: "Student" },
    { key: "roll_no", label: "Roll No" },
    { key: "branch", label: "Branch" },
    { key: "cgpa", label: "CGPA" },
    { key: "package_offered", label: "Package" },
    { key: "selected_date", label: "Selected Date" },
  ],
  branch_ctc: [
    { key: "branch", label: "Branch" },
    { key: "total_students", label: "Total Students" },
    { key: "placed_count", label: "Placed" },
    { key: "placement_percentage", label: "Placement %" },
    { key: "highest_ctc", label: "Highest CTC" },
    { key: "average_ctc", label: "Average CTC" },
  ],
  unplaced_students: [
    { key: "student_name", label: "Student" },
    { key: "roll_no", label: "Roll No" },
    { key: "branch", label: "Branch" },
    { key: "cgpa", label: "CGPA" },
    { key: "contact_email", label: "Contact Email" },
    { key: "backlogs_count", label: "Backlogs" },
  ],
  proctoring_audits: [
    { key: "test_title", label: "Test" },
    { key: "student_name", label: "Student" },
    { key: "total_strikes", label: "Total Strikes" },
    { key: "noise_warnings", label: "Noise" },
    { key: "face_headpose_flags", label: "Face/Headpose" },
    { key: "status", label: "Status" },
    { key: "timestamp", label: "Timestamp" },
  ],
};

function MetricCard({ title, value, accent = "text-blue-700" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
    </Card>
  );
}

export default function TpoReportsPage() {
  const [activeReport, setActiveReport] = useState("company_selections");

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["tpo-report-summary"],
    queryFn: () => tpoReportsApi.getReportSummary().then((res) => res.data),
  });

  const { data: previewData, isLoading: loadingPreview } = useQuery({
    queryKey: ["tpo-report-preview", activeReport],
    queryFn: () => tpoReportsApi.getReportPreview(activeReport).then((res) => res.data),
  });

  const columns = REPORT_COLUMNS[activeReport];
  const rows = previewData?.rows ?? [];

  const avgBranchCtc = useMemo(() => {
    if (!summary?.avg_ctc_by_branch?.length) return "-";
    const total = summary.avg_ctc_by_branch.reduce((acc, item) => acc + Number(item.average_ctc || 0), 0);
    return `₹${(total / summary.avg_ctc_by_branch.length).toFixed(2)} LPA`;
  }, [summary]);

  const handleDownloadCsv = async () => {
    try {
      const res = await tpoReportsApi.downloadReportCSV(activeReport);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      showToast("CSV exported successfully");
    } catch (error) {
      showError("Export Failed", error.response?.data?.detail || "Failed to export CSV report.");
    }
  };

  const handlePrintPdf = async () => {
    try {
      const res = await tpoReportsApi.printReportPDF(activeReport);
      const blob = new Blob([res.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      showToast("Printable report opened in new tab");
    } catch (error) {
      showError("Open Printable Report Failed", error.response?.data?.detail || "Failed to open printable report.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Accreditation Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Export NAAC/NIRF-ready placement reports as CSV or printable PDF.
        </p>
      </div>

      {loadingSummary ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Placed Students" value={summary?.placed_count ?? 0} accent="text-green-700" />
          <MetricCard title="Unplaced Students" value={summary?.unplaced_count ?? 0} accent="text-amber-700" />
          <MetricCard title="Highest CTC" value={`₹${summary?.highest_ctc ?? 0} LPA`} accent="text-blue-700" />
          <MetricCard title="Avg Branch CTC" value={avgBranchCtc} accent="text-indigo-700" />
          <MetricCard
            title="Flagged Proctoring Audits"
            value={summary?.flagged_proctoring_audits ?? 0}
            accent="text-red-700"
          />
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setActiveReport(report.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeReport === report.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <report.icon size={16} />
                {report.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadCsv} className="inline-flex items-center gap-2">
              <Download size={14} />
              Export CSV
            </Button>
            <Button onClick={handlePrintPdf} className="inline-flex items-center gap-2">
              <Printer size={14} />
              Print PDF Report
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          {loadingPreview ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-semibold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                      No rows found for this report.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={`${activeReport}-row-${idx}`} className="hover:bg-slate-50">
                      {columns.map((col) => (
                        <td key={`${col.key}-${idx}`} className="px-4 py-3 text-slate-700">
                          {row[col.key] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
