import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { curriculumApi } from "../../api/curriculum.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import { showSuccess, showError, showToast } from "../../utils/swal";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Video,
  FileText,
  Filter,
  Check,
  X,
  Edit3,
  Search,
  Star,
  Layers,
} from "lucide-react";

export default function TpoCurriculumPage() {
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [activeSubjectForReview, setActiveSubjectForReview] = useState(null);

  // Fetch branches
  const { data: branchesRes } = useQuery({
    queryKey: ["curriculumBranches"],
    queryFn: () => curriculumApi.getBranches().then((res) => res.data.branches || []),
  });
  const branches = branchesRes || [];

  // Fetch subjects
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["curriculumSubjects", selectedBranch, selectedSemester],
    queryFn: () =>
      curriculumApi
        .getSubjects({
          branch: selectedBranch !== "all" ? selectedBranch : undefined,
          semester: selectedSemester !== "all" ? Number(selectedSemester) : undefined,
        })
        .then((res) => res.data),
  });

  // Fetch resources for review modal
  const { data: subjectResources = [], isLoading: isResourcesLoading } = useQuery({
    queryKey: ["curriculumSubjectResources", activeSubjectForReview?.id],
    queryFn: () =>
      curriculumApi.getSubjectResources(activeSubjectForReview.id).then((res) => res.data),
    enabled: !!activeSubjectForReview,
  });

  // Prioritize mutation
  const prioritizeMutation = useMutation({
    mutationFn: (subjectId) => curriculumApi.togglePrioritize(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries(["curriculumSubjects"]);
      showToast("Subject priority updated");
    },
  });

  // Curate mutation
  const curateMutation = useMutation({
    mutationFn: (subjectId) => curriculumApi.curateSubject(subjectId),
    onSuccess: (res, subjectId) => {
      queryClient.invalidateQueries(["curriculumSubjects"]);
      queryClient.invalidateQueries(["curriculumSubjectResources", subjectId]);
      showSuccess(
        "Curation Complete",
        `AI has found ${res.data.length} learning resources (books, articles, videos). Please review and approve them.`
      );
      const subj = subjects.find((s) => s.id === subjectId);
      if (subj) setActiveSubjectForReview(subj);
    },
    onError: (err) => {
      showError("Curation Failed", err.response?.data?.detail || "Could not curate resources.");
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ resourceId, payload }) => curriculumApi.reviewResource(resourceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["curriculumSubjects"]);
      queryClient.invalidateQueries(["curriculumSubjectResources", activeSubjectForReview?.id]);
      showToast("Resource review updated");
    },
    onError: (err) => {
      showError("Review Update Failed", err.response?.data?.detail || "Could not update review.");
    },
  });

  const handleReviewAction = (resourceId, status, currentTitle, currentSummary) => {
    reviewMutation.mutate({
      resourceId,
      payload: {
        approval_status: status,
        title: currentTitle,
        ai_summary: currentSummary,
      },
    });
  };

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                Subject Focus & Resource Curation
              </h1>
              <p className="text-sm text-muted-foreground">
                Select market-trend curriculum subjects, trigger AI curation for books/articles/videos, and review recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Branch:
          </span>
          <button
            onClick={() => setSelectedBranch("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedBranch === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Branches
          </button>
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedBranch === b
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semester:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground font-medium"
          >
            <option value="all">All Semesters</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subjects Table */}
      {isSubjectsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Curriculum Subjects Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {branches.length === 0
              ? "Your College Administrator has not uploaded or confirmed an official syllabus yet."
              : "No subjects match the selected branch and semester filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Curation Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((subj) => {
                  let statusBadge = null;
                  if (subj.approved_count > 0) {
                    statusBadge = (
                      <Badge variant="success" className="text-xs">
                        Curated ({subj.approved_count} approved)
                      </Badge>
                    );
                  } else if (subj.pending_count > 0) {
                    statusBadge = (
                      <Badge variant="warning" className="text-xs">
                        Awaiting Review ({subj.pending_count})
                      </Badge>
                    );
                  } else if (subj.is_prioritized) {
                    statusBadge = (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                        Prioritized
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="secondary" className="text-xs">
                        Not Curated
                      </Badge>
                    );
                  }

                  return (
                    <tr key={subj.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => prioritizeMutation.mutate(subj.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            subj.is_prioritized
                              ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={subj.is_prioritized ? "Prioritized for placement prep" : "Mark as market-trend priority"}
                        >
                          <Star className={`h-4 w-4 ${subj.is_prioritized ? "fill-amber-500" : ""}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{subj.subject_name}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{subj.branch_name}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">Semester {subj.semester_number}</td>
                      <td className="py-3 px-4">{statusBadge}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {subj.resources_count > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveSubjectForReview(subj)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Review ({subj.resources_count})
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => curateMutation.mutate(subj.id)}
                            isLoading={curateMutation.isPending && curateMutation.variables === subj.id}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            Find AI Resources
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Candidate Resources Modal */}
      {activeSubjectForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground font-heading">
                  Review Resources: {activeSubjectForReview.subject_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeSubjectForReview.branch_name} — Semester {activeSubjectForReview.semester_number}
                </p>
              </div>
              <button
                onClick={() => setActiveSubjectForReview(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isResourcesLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : subjectResources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No resources curated for this subject yet. Click "Find AI Resources" to trigger search.
                </p>
              ) : (
                subjectResources.map((res) => {
                  const isApproved = res.approval_status === "approved";
                  const isRejected = res.approval_status === "rejected";

                  let typeIcon = <FileText className="h-4 w-4 text-blue-500" />;
                  if (res.resource_type === "book") typeIcon = <BookOpen className="h-4 w-4 text-emerald-500" />;
                  if (res.resource_type === "video") typeIcon = <Video className="h-4 w-4 text-red-500" />;

                  return (
                    <div
                      key={res.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isApproved
                          ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                          : isRejected
                          ? "border-destructive/30 bg-destructive/5 opacity-75"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">{typeIcon}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{res.title}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {res.resource_type}
                              </Badge>
                              {isApproved && (
                                <Badge variant="success" className="text-[10px]">
                                  Approved
                                </Badge>
                              )}
                              {isRejected && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Rejected
                                </Badge>
                              )}
                            </div>
                            <a
                              href={res.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1 font-mono break-all"
                            >
                              {res.link} <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        </div>

                        {/* Approve / Reject Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleReviewAction(res.id, "approved", res.title, res.ai_summary)}
                            disabled={isApproved || reviewMutation.isPending}
                            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                              isApproved
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                            title="Approve for students"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReviewAction(res.id, "rejected", res.title, res.ai_summary)}
                            disabled={isRejected || reviewMutation.isPending}
                            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                              isRejected
                                ? "bg-destructive text-white cursor-default"
                                : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
                            }`}
                            title="Reject resource"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* AI Summary */}
                      <div className="bg-muted/40 p-3 rounded-lg text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground block mb-1">AI Recommendation Summary:</span>
                        <p>{res.ai_summary}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => curateMutation.mutate(activeSubjectForReview.id)}
                isLoading={curateMutation.isPending}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Refresh Recommendations
              </Button>
              <Button size="sm" onClick={() => setActiveSubjectForReview(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
