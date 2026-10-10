import React, { useState, useEffect, useMemo } from "react";
import { resourcesApi } from "../../api/resources.api";
import { GraduationCap, Video, BookOpen, FileText, Search, ExternalLink, Sparkles } from "lucide-react";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  InteractiveSearchBox,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function GateCatPrepPage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState("all");

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        const res = await resourcesApi.getResources({ category: "gate_cat_prep" });
        setResources(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResources();
  }, []);

  const filterChips = [
    { id: "all", label: "All Content", count: resources.length },
    { id: "gate", label: "GATE Track", count: resources.filter(r => r.title.toLowerCase().includes("gate")).length },
    { id: "cat", label: "CAT Track", count: resources.filter(r => r.title.toLowerCase().includes("cat")).length },
    { id: "video", label: "Video Lectures", count: resources.filter(r => r.content_type === "video").length },
    { id: "document", label: "Documents & Notes", count: resources.filter(r => ["blog", "document"].includes(r.content_type)).length },
  ];

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (res.title || "").toLowerCase().includes(q) ||
        (res.content || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const titleLower = res.title.toLowerCase();
      if (activeChip === "gate" && !titleLower.includes("gate")) return false;
      if (activeChip === "cat" && !titleLower.includes("cat")) return false;
      if (activeChip === "video" && res.content_type !== "video") return false;
      if (activeChip === "document" && !["blog", "document"].includes(res.content_type)) return false;

      return true;
    });
  }, [resources, searchQuery, activeChip]);

  const getTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5 text-rose-500" />;
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
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "CAT":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "GATE & CAT":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
              <GraduationCap size={13} className="text-indigo-600" />
              <span>Competitive Examination Track</span>
            </span>
            <LiveStatusBeacon label="CURATED CONTENT" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="GATE & CAT Preparation Track" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Curated syllabus roadmaps, previous year question analyses, video masterclasses, and strategy guides.
          </p>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ INTERACTIVE SEARCH & CHIP FILTER ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <InteractiveSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search resources by topic title, subject domain, or exam keyword..."
            chips={filterChips}
            activeChip={activeChip}
            onChipClick={setActiveChip}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{filteredResources.length}</strong> exam preparation modules
            </span>
            <span>Bookmark modules for offline review</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ CONTENT GRID / EMPTY STATE ════════════ */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
          <Search className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No exam modules found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {resources.length === 0
              ? "Exam prep content will appear here once populated by your department."
              : "Try refining your search keyword or clearing the active filter chip."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const examBadge = getExamBadge(res.title);
            return (
              <div
                key={res.id}
                className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="p-6 flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${getBadgeColor(examBadge)}`}
                      >
                        {examBadge}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold capitalize">
                        {res.content_type}
                      </span>
                    </div>
                    {getTypeIcon(res.content_type)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 font-heading line-clamp-2 group-hover:text-indigo-700 transition-colors">
                    {res.title}
                  </h3>

                  {(res.content_type === "blog" || res.content_type === "document") && res.content && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {res.content}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-slate-50/70 border-t border-slate-100 mt-auto">
                  {res.content_type === "video" && res.video_url ? (
                    <a
                      href={res.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Video size={14} />
                      <span>Watch Video Lecture</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <button className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all shadow-2xs">
                      Read Module Documentation
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
