import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { insightsApi } from "../../api/insights.api";
import { RefreshCw, ExternalLink, Lightbulb, Briefcase, TrendingUp } from "lucide-react";
import Button from "../common/Button";

function ExternalOpportunityCard({ item }) {
  return (
    <a 
      href={item.source_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
      <p className="text-xs text-blue-600 font-medium mt-1">{item.company}</p>
      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.snippet}</p>
    </a>
  );
}

function ResumeSuggestionCard({ tip }) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
      <div className="flex items-start space-x-3">
        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-slate-800">{tip.tip}</p>
          <p className="text-xs text-amber-700 font-medium mt-1.5">Based on trend: {tip.based_on_trend}</p>
        </div>
      </div>
    </div>
  );
}

export default function InsightsWidget() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await insightsApi.getDashboardInsights();
      setData(res.data);
    } catch (err) {
      setError("Failed to load insights. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError("");
      await insightsApi.refreshInsights();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || "Rate limit reached for manual refreshes.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-white rounded-2xl border border-slate-200 p-6 h-64 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 mt-4">Loading Live Career Insights...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Live Career Insights</h2>
          <p className="text-sm text-slate-500">Personalized opportunities and resume tips powered by real-time web search.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="hidden sm:flex"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Internal Matches */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">Top Internal Matches</h3>
          </div>
          
          {data.internal_drives && data.internal_drives.length > 0 ? (
            <div className="space-y-3">
              {data.internal_drives.slice(0, 3).map(drive => (
                <Link 
                  key={drive.id} 
                  to={`/student/drives/${drive.id}`}
                  className="block p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all"
                >
                  <h4 className="font-semibold text-slate-900 text-sm">{drive.company?.name || "Company"} - {drive.role}</h4>
                  <div className="mt-2 flex items-center space-x-3 text-xs text-slate-600">
                    <span className="bg-white px-2 py-1 rounded border border-slate-200">Deadline: {new Date(drive.deadline).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
              <div className="pt-2 text-center">
                <Link to="/student/drives" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all internal drives &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 p-4 border border-dashed border-slate-300 rounded-xl text-center">
              No matching internal drives open right now.
            </p>
          )}
        </div>

        {/* External Opportunities & Resume Tips */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800">Live External Opportunities</h3>
          </div>

          <div className="space-y-3">
            {data.external_opportunities?.slice(0, 2).map((item, i) => (
              <ExternalOpportunityCard key={i} item={item} />
            ))}
            
            {data.resume_suggestions?.slice(0, 1).map((tip, i) => (
              <ResumeSuggestionCard key={i} tip={tip} />
            ))}

            {data.external_opportunities?.length > 2 && (
              <div className="pt-2 text-center">
                <a href={`https://www.google.com/search?q=${encodeURIComponent(data.trending_skills?.join(' ') + ' jobs')}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-600 hover:text-emerald-800 inline-flex items-center">
                  Search web for more <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
