import React, { useState, useEffect } from "react";
import { resourcesApi } from "../../api/resources.api";
import { GraduationCap, Video, BookOpen, FileText, Search, ExternalLink } from "lucide-react";

const EXAM_TABS = [
  { value: "all", label: "All Content" },
  { value: "gate", label: "GATE" },
  { value: "cat", label: "CAT" },
];

const CONTENT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "video", label: "Videos" },
  { value: "blog", label: "Articles" },
  { value: "document", label: "Documents" },
];

export default function GateCatPrepPage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterExam, setFilterExam] = useState("all");

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        const res = await resourcesApi.getResources({ category: "gate_cat_prep" });
        setResources(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResources();
  }, []);

  const filteredResources = resources.filter((res) => {
    if (filterType !== "all" && res.content_type !== filterType) return false;
    if (filterExam !== "all") {
      const titleLower = res.title.toLowerCase();
      if (filterExam === "gate" && !titleLower.includes("gate")) return false;
      if (filterExam === "cat" && !titleLower.includes("cat")) return false;
    }
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5 text-red-500" />;
      case "blog":
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      case "document":
        return <FileText className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const getExamBadge = (title) => {
    const t = title.toLowerCase();
    if (t.includes("gate") && t.includes("cat")) return "GATE & CAT";
    if (t.includes("gate")) return "GATE";
    if (t.includes("cat")) return "CAT";
    return "General";
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case "GATE":
        return "bg-indigo-100 text-indigo-700";
      case "CAT":
        return "bg-emerald-100 text-emerald-700";
      case "GATE & CAT":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            GATE & CAT Exam Prep
          </h1>
          <p className="text-slate-600 mt-1">
            Curated study materials, previous-year questions, and strategy guides for competitive exams.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
            Exam
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAM_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterExam(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filterExam === tab.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
            Type
          </label>
          <div className="flex space-x-2">
            {CONTENT_TYPE_FILTERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filterType === t.value
                    ? "bg-slate-100 text-slate-900 border-slate-300"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No resources found</h3>
          <p className="text-slate-500">
            {resources.length === 0
              ? "Exam prep content will appear here once it's been added."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const examBadge = getExamBadge(res.title);
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getBadgeColor(examBadge)}`}
                      >
                        {examBadge}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-medium capitalize">
                        {res.content_type}
                      </span>
                    </div>
                    {getTypeIcon(res.content_type)}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 font-heading mb-2 line-clamp-2">
                    {res.title}
                  </h3>
                  {(res.content_type === "blog" || res.content_type === "document") && res.content && (
                    <p className="text-sm text-slate-600 line-clamp-3">{res.content}</p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                  {res.content_type === "video" && res.video_url ? (
                    <a
                      href={res.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={14} />
                      Watch Video
                    </a>
                  ) : (
                    <button className="w-full text-sm font-medium text-slate-700 hover:text-slate-900 text-center">
                      Read More
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
