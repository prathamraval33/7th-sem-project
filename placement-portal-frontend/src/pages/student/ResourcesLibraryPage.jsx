import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { resourcesApi } from "../../api/resources.api";
import { curriculumApi } from "../../api/curriculum.api";
import {
  BookOpen,
  Video,
  FileText,
  Search,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Flame,
  ArrowLeft,
  BookMarked,
  Layers,
  Filter,
  Info,
  CheckCircle,
} from "lucide-react";
import { useActiveFeatures } from "../../hooks/useActiveFeatures";
import { Button } from "../../components/ui/Button";

export default function ResourcesLibraryPage() {
  const { isFeatureActive } = useActiveFeatures();

  // Top-level tab: "curriculum" vs "flat"
  const [activeTab, setActiveTab] = useState("curriculum");

  // --- Flat Library State ---
  const [flatResources, setFlatResources] = useState([]);
  const [isFlatLoading, setIsFlatLoading] = useState(true);
  const [flatCategory, setFlatCategory] = useState("all");
  const [flatType, setFlatType] = useState("all");
  const [flatSearch, setFlatSearch] = useState("");
  const [readingModalResource, setReadingModalResource] = useState(null);

  useEffect(() => {
    const fetchFlatResources = async () => {
      try {
        setIsFlatLoading(true);
        const res = await resourcesApi.getResources();
        setFlatResources(res.data);
      } catch (err) {
        console.error("Error fetching flat resources:", err);
      } finally {
        setIsFlatLoading(false);
      }
    };
    fetchFlatResources();
  }, []);

  // --- Curriculum Library State ---
  const [selectedBranch, setSelectedBranch] = useState("All branches");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [curriculumSearch, setCurriculumSearch] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");

  // Fetch branches dynamically from confirmed curriculum
  const { data: branchesRes } = useQuery({
    queryKey: ["curriculumBranches"],
    queryFn: () => curriculumApi.getBranches().then((res) => res.data.branches || []),
  });
  const branches = branchesRes || [];

  // Fetch subjects dynamically based on branch & semester
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: [
      "curriculumSubjects",
      selectedBranch,
      selectedSemester,
      priorityOnly,
    ],
    queryFn: () => {
      const params = {};
      if (selectedBranch !== "All branches") params.branch = selectedBranch;
      if (selectedSemester !== "all") params.semester = Number(selectedSemester);
      if (priorityOnly) params.prioritized_only = true;
      return curriculumApi.getSubjects(params).then((res) => res.data);
    },
  });

  // Fetch approved resources for selected subject
  const { data: subjectResources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ["subjectApprovedResources", selectedSubject?.id],
    queryFn: () =>
      selectedSubject
        ? curriculumApi.getSubjectResources(selectedSubject.id).then((res) => res.data)
        : Promise.resolve([]),
    enabled: Boolean(selectedSubject),
  });

  // Filter subjects by search keyword
  const filteredSubjects = subjects.filter((s) => {
    if (!curriculumSearch.trim()) return true;
    const q = curriculumSearch.toLowerCase();
    return (
      s.subject_name.toLowerCase().includes(q) ||
      s.branch_name.toLowerCase().includes(q)
    );
  });

  // Filter subject resources by resource type
  const filteredSubjectResources = subjectResources.filter((r) => {
    if (resourceTypeFilter === "all") return true;
    return r.resource_type === resourceTypeFilter;
  });

  // Flat library categories
  const categories = [
    { value: "all", label: "All Topics" },
    { value: "aptitude", label: "Aptitude" },
    { value: "communication", label: "Communication" },
    { value: "os", label: "Operating Systems" },
    { value: "dbms", label: "DBMS" },
    { value: "cn", label: "Computer Networks" },
    { value: "java", label: "Java" },
    { value: "python", label: "Python" },
    { value: "interview_qna", label: "Interview Q&A" },
    ...(isFeatureActive("gate_cat_prep")
      ? [{ value: "gate_cat_prep", label: "GATE & CAT Prep" }]
      : []),
  ];

  const filteredFlatResources = flatResources.filter((res) => {
    if (flatCategory !== "all" && res.category !== flatCategory) return false;
    if (flatType !== "all" && res.content_type !== flatType) return false;
    if (flatSearch.trim()) {
      const q = flatSearch.toLowerCase();
      return (
        res.title?.toLowerCase().includes(q) ||
        res.content?.toLowerCase().includes(q) ||
        res.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getFlatTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4 text-red-500" />;
      case "blog":
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "document":
        return <FileText className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSubjectResourceIcon = (type) => {
    switch (type) {
      case "book":
        return <BookMarked className="w-4 h-4 text-blue-600" />;
      case "article":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "video":
        return <Video className="w-4 h-4 text-red-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Resource Center</h1>
        <p className="text-slate-600 mt-1">
          Curriculum-aligned textbooks, curated articles, and interview preparation materials.
        </p>
      </div>

      {/* Top Organization Tabs (§6.2) */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("curriculum");
            setSelectedSubject(null);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "curriculum"
              ? "border-accent text-accent"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GraduationCap size={18} />
          By Subject (Curriculum)
        </button>
        <button
          onClick={() => {
            setActiveTab("flat");
            setSelectedSubject(null);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "flat"
              ? "border-accent text-accent"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen size={18} />
          Study Materials Library
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CURRICULUM-DRIVEN BY SUBJECT (Part 6.1) */}
      {/* ========================================================================= */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          {/* Detail View of a Selected Subject */}
          {selectedSubject ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <button
                onClick={() => setSelectedSubject(null)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors"
              >
                <ArrowLeft size={16} /> Back to Subjects
              </button>

              {/* Subject Banner */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {selectedSubject.branch_name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        Semester {selectedSubject.semester_number}
                      </span>
                      {selectedSubject.is_prioritized && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Flame size={12} className="fill-amber-600" /> Placement Priority
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 font-heading">
                      {selectedSubject.subject_name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle size={14} />
                      {subjectResources.length} Approved Resource{subjectResources.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {/* Honest Framing & Copyright Notice (§4.3) */}
                <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">AI-Curated & Faculty-Approved:</strong>{" "}
                    Recommendations include original concise summaries and direct links to
                    authoritative publications, open documentation, and free educational videos. No
                    copyrighted full texts or paywalled copies are hosted.
                  </div>
                </div>
              </div>

              {/* Filter by Resource Type */}
              <div className="flex items-center gap-2 flex-wrap">
                {["all", "book", "article", "video"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setResourceTypeFilter(type)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
                      resourceTypeFilter === type
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {type === "all" ? "All Formats" : `${type}s`}
                  </button>
                ))}
              </div>

              {/* Resources List */}
              {isResourcesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
              ) : filteredSubjectResources.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-1">
                    No approved resources for this category
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Faculty curation for this subject is in progress. Please check back shortly or
                    try another format.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSubjectResources.map((res) => (
                    <div
                      key={res.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 capitalize">
                            {getSubjectResourceIcon(res.resource_type)}
                            {res.resource_type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            <Sparkles size={11} /> AI-recommended
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 font-heading mb-2 line-clamp-2">
                          {res.title}
                        </h4>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{res.ai_summary}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <a
                          href={res.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <ExternalLink size={13} />
                          Open {res.resource_type === "video" ? "Video" : res.resource_type === "book" ? "Book" : "Article"} &rarr;
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Subject Browser View */
            <div className="space-y-6">
              {/* Dynamic Branch Pills & Semester Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                {/* Branch Pills (§6.3) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Select Branch
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All branches", ...branches].map((branch) => (
                      <button
                        key={branch}
                        onClick={() => setSelectedBranch(branch)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          selectedBranch === branch
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Semester & Search & Priority Controls */}
                <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-100">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search subjects by name (e.g. DBMS, Operating Systems)..."
                      value={curriculumSearch}
                      onChange={(e) => setCurriculumSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white"
                    >
                      <option value="all">All Semesters</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setPriorityOnly(!priorityOnly)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                        priorityOnly
                          ? "bg-amber-100 text-amber-900 border-amber-300 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Flame
                        size={14}
                        className={priorityOnly ? "fill-amber-600 text-amber-600" : "text-slate-400"}
                      />
                      Placement Priority Only
                    </button>
                  </div>
                </div>
              </div>

              {/* No Curriculum Uploaded Fallback (§6.3) */}
              {branches.length === 0 && !isSubjectsLoading && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
                  <Info className="w-8 h-8 text-amber-600 mx-auto" />
                  <h3 className="text-base font-bold text-amber-900 font-heading">
                    Curriculum Pending Confirmation
                  </h3>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">
                    Your college administrator has not yet uploaded and confirmed your institution's
                    official syllabus. You can explore the general{" "}
                    <button
                      onClick={() => setActiveTab("flat")}
                      className="underline font-semibold text-amber-900 hover:text-amber-950"
                    >
                      Study Materials Library
                    </button>{" "}
                    in the meantime!
                  </p>
                </div>
              )}

              {/* Subject Grid */}
              {isSubjectsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-1">No subjects match</h3>
                  <p className="text-xs text-slate-500">
                    Try clearing your search query or choosing another branch/semester filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSubjects.map((subj) => (
                    <div
                      key={subj.id}
                      onClick={() => setSelectedSubject(subj)}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            Sem {subj.semester_number} &bull; {subj.branch_name}
                          </span>
                          {subj.is_prioritized && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Flame size={11} className="fill-amber-600" /> Priority
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-accent transition-colors line-clamp-2 mb-2">
                          {subj.subject_name}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                            subj.approved_count > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {subj.approved_count > 0
                            ? `${subj.approved_count} Approved Resource${subj.approved_count === 1 ? "" : "s"}`
                            : "No resources yet"}
                        </span>
                        <span className="text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">
                          Browse &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: FLAT STUDY MATERIALS LIBRARY (§6.2) */}
      {/* ========================================================================= */}
      {activeTab === "flat" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Topic
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setFlatCategory(c.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      flatCategory === c.value
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Type
              </label>
              <div className="flex space-x-2">
                {["all", "video", "blog", "document"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFlatType(t)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border capitalize transition-colors ${
                      flatType === t
                        ? "bg-slate-100 text-slate-900 border-slate-300"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search study materials by title or keyword..."
              value={flatSearch}
              onChange={(e) => setFlatSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white"
            />
          </div>

          {/* Grid */}
          {isFlatLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredFlatResources.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No resources found</h3>
              <p className="text-slate-500">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFlatResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                        {res.category.replace("_", " ")}
                      </span>
                      {getFlatTypeIcon(res.content_type)}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 font-heading mb-2 line-clamp-2">
                      {res.title}
                    </h3>

                    {res.content_type === "blog" || res.content_type === "document" ? (
                      <p className="text-sm text-slate-600 line-clamp-3">{res.content}</p>
                    ) : null}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                    {res.content_type === "video" && res.video_url ? (
                      <a
                        href={res.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center"
                      >
                        Watch Video &rarr;
                      </a>
                    ) : (
                      <button
                        onClick={() => setReadingModalResource(res)}
                        className="w-full text-sm font-medium text-slate-700 hover:text-slate-900 text-center"
                      >
                        Read More
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reader Modal for Flat Library Document/Blog */}
      {readingModalResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                  {readingModalResource.category.replace("_", " ")}
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-heading mt-1">
                  {readingModalResource.title}
                </h3>
              </div>
              <button
                onClick={() => setReadingModalResource(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
              {readingModalResource.content || "No extended content provided for this document."}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReadingModalResource(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
