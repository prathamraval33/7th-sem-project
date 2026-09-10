import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resourcesApi } from "../../api/resources.api";
import { curriculumApi } from "../../api/curriculum.api";
import {
  BookOpen,
  Video,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

export default function AdminResourcesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    category: "aptitude",
    content_type: "document",
    content: "",
    video_url: "",
    selected_branch: "All branches",
  });
  const [formError, setFormError] = useState("");

  // Fetch flat resources
  const { data: resources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => resourcesApi.getResources().then((res) => res.data),
  });

  // Fetch dynamic branches from confirmed curriculum
  const { data: branchesRes } = useQuery({
    queryKey: ["curriculumBranches"],
    queryFn: () => curriculumApi.getBranches().then((res) => res.data.branches || []),
  });

  // Dynamic branch options: "All branches" + distinct confirmed curriculum branches
  const confirmedBranches = branchesRes || [];
  const branchOptions = ["All branches", ...confirmedBranches];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload) => resourcesApi.createResource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["resources"]);
      setIsCreateOpen(false);
      setFormData({
        title: "",
        category: "aptitude",
        content_type: "document",
        content: "",
        video_url: "",
        selected_branch: "All branches",
      });
      setFormError("");
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || "Failed to create resource.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => resourcesApi.deleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["resources"]);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      content_type: formData.content_type,
      content: formData.content.trim() || undefined,
      video_url: formData.content_type === "video" ? formData.video_url.trim() : undefined,
    };
    createMutation.mutate(payload);
  };

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
    { value: "gate_cat_prep", label: "GATE & CAT Prep" },
  ];

  const filteredResources = resources.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (typeFilter !== "all" && r.content_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.content?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Manage Study Materials</h1>
          <p className="text-slate-600 mt-1">
            Publish guides, interview preparation questions, and reference links for your institution.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError("");
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add Material
        </Button>
      </div>

      {/* Dynamic Branch Status Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="text-accent shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Institution Curriculum Status:{" "}
              <span className="text-accent">
                {confirmedBranches.length > 0
                  ? `${confirmedBranches.length} Confirmed Branches (${confirmedBranches.join(", ")})`
                  : "No curriculum uploaded yet"}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Resource target branch filters are dynamically populated from your verified curriculum data.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search materials by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white capitalize"
            >
              <option value="all">All Content Types</option>
              <option value="document">Document / Notes</option>
              <option value="blog">Article / Blog</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {isResourcesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No study materials found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Get started by adding your first study guide, preparation notes, or video link.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
            <Plus size={14} className="mr-1" /> Add First Material
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                    {res.category.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                    {res.content_type === "video" ? (
                      <Video size={14} className="text-red-500" />
                    ) : res.content_type === "blog" ? (
                      <BookOpen size={14} className="text-blue-500" />
                    ) : (
                      <FileText size={14} className="text-amber-500" />
                    )}
                    {res.content_type}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading line-clamp-2 mb-2">
                  {res.title}
                </h3>
                {res.content && (
                  <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                    {res.content}
                  </p>
                )}
                {res.video_url && (
                  <a
                    href={res.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mb-3"
                  >
                    <ExternalLink size={12} /> Open Video Link
                  </a>
                )}
              </div>
              <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">ID #{res.id}</span>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to remove this resource?")) {
                      deleteMutation.mutate(res.id);
                    }
                  }}
                  className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                  title="Delete resource"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Publish Study Material
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Operating Systems Concurrency Notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent"
                  required
                />
              </div>

              {/* Dynamic Applicable Branches Pill Row (Directly addressing Rule §6.3) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable Branches / Departments
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Populated dynamically from your confirmed curriculum.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {branchOptions.map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setFormData({ ...formData, selected_branch: branch })}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        formData.selected_branch === branch
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white"
                  >
                    <option value="aptitude">Aptitude</option>
                    <option value="communication">Communication</option>
                    <option value="os">Operating Systems</option>
                    <option value="dbms">DBMS</option>
                    <option value="cn">Computer Networks</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="interview_qna">Interview Q&A</option>
                    <option value="gate_cat_prep">GATE & CAT Prep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Content Type
                  </label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent bg-white"
                  >
                    <option value="document">Document / Notes</option>
                    <option value="blog">Article / Blog</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>

              {formData.content_type === "video" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Video URL *
                  </label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Summary / Notes Content
                </label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Key concepts, preparation guide, or reference excerpts..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                  Publish Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
