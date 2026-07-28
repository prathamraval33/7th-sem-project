import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { ListChecks, Users, BarChart } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

export default function PastTestsPage() {
  const { data: tests, isLoading, error } = useQuery({
    queryKey: ["tpo-tests-history"],
    queryFn: async () => {
      const { data } = await tpoApi.getInstantTestHistory();
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  if (error) return <div className="p-4 text-red-500">Error loading past tests: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Past Tests</h1>
        <p className="text-slate-600 mt-1">History of all AI-generated Instant Tests.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Test ID</th>
                <th className="px-4 py-3 font-medium">Drive ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Attempts</th>
                <th className="px-4 py-3 font-medium text-center">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tests?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                    No past tests found.
                  </td>
                </tr>
              ) : (
                tests?.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <ListChecks size={16} className="text-accent" />
                        #{test.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {test.drive_id ? (
                        <Link to={`/tpo/drives/${test.drive_id}`} className="text-accent hover:underline">
                          #{test.drive_id}
                        </Link>
                      ) : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={test.status === "open" ? "success" : "neutral"}>
                        {test.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      <div className="flex items-center justify-center gap-1">
                        <Users size={14} className="text-slate-400" />
                        {test.attempted_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-medium text-slate-900">
                        <BarChart size={14} className="text-brand" />
                        {test.average_score}%
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
