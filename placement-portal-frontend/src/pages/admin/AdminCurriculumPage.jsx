import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { curriculumApi } from "../../api/curriculum.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/ui/Badge";
import { showConfirm, showSuccess, showError } from "../../utils/swal";
import {
  GraduationCap,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  BookOpen,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

export default function AdminCurriculumPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [activeBranchIdx, setActiveBranchIdx] = useState(0);

  // Fetch latest upload state
  const { data: latestUpload, isLoading: isUploadLoading } = useQuery({
    queryKey: ["latestCurriculumUpload"],
    queryFn: async () => {
      const res = await curriculumApi.getLatestUpload();
      if (res.data && res.data.raw_extracted_data && !draftData) {
        setDraftData(res.data.raw_extracted_data);
      }
      return res.data;
    },
  });

  // Fetch active confirmed subjects
  const { data: activeSubjects = [] } = useQuery({
    queryKey: ["curriculumSubjects"],
    queryFn: () => curriculumApi.getSubjects().then((res) => res.data),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return curriculumApi.uploadCurriculum(fd);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["latestCurriculumUpload"]);
      setSelectedFile(null);
      if (res.data.raw_extracted_data) {
        setDraftData(res.data.raw_extracted_data);
      }
      showSuccess(
        "Extraction Complete",
        "AI has parsed the syllabus structure. Please review and make any needed corrections below before confirming."
      );
    },
    onError: (err) => {
      showError("Curriculum Upload Failed", err.response?.data?.detail || "Could not parse syllabus PDF.");
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: (payload) => curriculumApi.confirmCurriculum(latestUpload.id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["latestCurriculumUpload"]);
      queryClient.invalidateQueries(["curriculumSubjects"]);
      queryClient.invalidateQueries(["curriculumBranches"]);
      showSuccess("Curriculum Confirmed", res.data.message);
    },
    onError: (err) => {
      showError("Confirmation Failed", err.response?.data?.detail || "Could not confirm curriculum structure.");
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showError("Invalid File", "Only PDF curriculum files are supported.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showError("File Too Large", "Maximum syllabus file size is 15MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleAddBranch = () => {
    const name = prompt("Enter Branch Name (e.g. Information Technology, Mechanical Engineering):");
    if (!name || !name.trim()) return;
    const newBranches = [...(draftData?.branches || [])];
    newBranches.push({
      name: name.trim(),
      semesters: [
        { number: 1, subjects: [] },
        { number: 2, subjects: [] },
      ],
    });
    setDraftData({ branches: newBranches });
    setActiveBranchIdx(newBranches.length - 1);
  };

  const handleRemoveBranch = (bIdx) => {
    const newBranches = [...(draftData?.branches || [])];
    newBranches.splice(bIdx, 1);
    setDraftData({ branches: newBranches });
    if (activeBranchIdx >= newBranches.length) {
      setActiveBranchIdx(Math.max(0, newBranches.length - 1));
    }
  };

  const handleAddSemester = (bIdx) => {
    const branch = draftData.branches[bIdx];
    const maxSem = branch.semesters.reduce((m, s) => Math.max(m, s.number), 0);
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters.push({ number: maxSem + 1, subjects: [] });
    setDraftData({ branches: newBranches });
  };

  const handleAddSubject = (bIdx, sIdx) => {
    const name = prompt("Enter Subject Name (e.g. Database Management Systems):");
    if (!name || !name.trim()) return;
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters[sIdx].subjects.push(name.trim());
    setDraftData({ branches: newBranches });
  };

  const handleRemoveSubject = (bIdx, sIdx, subjIdx) => {
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters[sIdx].subjects.splice(subjIdx, 1);
    setDraftData({ branches: newBranches });
  };

  const handleConfirmSubmit = async () => {
    if (!draftData || !draftData.branches || draftData.branches.length === 0) {
      showError("Empty Curriculum", "Curriculum must contain at least one branch.");
      return;
    }

    const confirmed = await showConfirm(
      "Confirm Curriculum Structure?",
      "This will establish the official subject catalog for your college. Any previous curriculum data will be replaced.",
      "Yes, confirm curriculum"
    );

    if (confirmed) {
      confirmMutation.mutate(draftData);
    }
  };

  if (isUploadLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isConfirmed = latestUpload?.extraction_status === "confirmed";
  const branches = draftData?.branches || [];
  const currentBranch = branches[activeBranchIdx] || null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">Curriculum Setup</h1>
            <p className="text-sm text-muted-foreground">
              Upload your institution's syllabus document. AI extracts branches, semesters, and subjects for curation.
            </p>
          </div>
        </div>
        {isConfirmed && (
          <Badge variant="success" className="px-3 py-1 font-medium text-sm flex items-center gap-1.5 self-start md:self-auto">
            <CheckCircle2 className="h-4 w-4" /> Active Curriculum ({activeSubjects.length} Subjects)
          </Badge>
        )}
      </div>

      {/* Upload Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Upload Curriculum / Syllabus PDF</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload your university or college syllabus document (PDF up to 15MB). The AI engine will read the document,
          detect all academic branches, and extract semester-wise subject lists.
        </p>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              id="curriculum-file-input"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-border rounded-lg p-2 bg-background"
            />
            <Button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending}
              isLoading={uploadMutation.isPending}
              className="shrink-0"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              {uploadMutation.isPending ? "Extracting with AI..." : "Upload & Parse"}
            </Button>
          </div>
          {selectedFile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Selected: <strong>{selectedFile.name}</strong> (
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </form>
      </div>

      {/* Review & Edit Draft Section */}
      {draftData && branches.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Review & Confirm Extracted Curriculum
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review the AI-extracted structure. Edit, add, or remove subjects before confirming.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddBranch}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Branch
              </Button>
              <Button size="sm" onClick={handleConfirmSubmit} isLoading={confirmMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Curriculum
              </Button>
            </div>
          </div>

          {/* Branch Navigation Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
            {branches.map((b, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBranchIdx(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 flex items-center gap-2 ${
                  activeBranchIdx === idx
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {b.name}
              </button>
            ))}
          </div>

          {/* Active Branch Content */}
          {currentBranch && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl">
                <div>
                  <h3 className="font-semibold text-foreground text-base">{currentBranch.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {currentBranch.semesters.reduce((acc, s) => acc + s.subjects.length, 0)} subjects across{" "}
                    {currentBranch.semesters.length} semesters
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSemester(activeBranchIdx)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Semester
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveBranch(activeBranchIdx)}
                    disabled={branches.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Branch
                  </Button>
                </div>
              </div>

              {/* Semesters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentBranch.semesters.map((sem, sIdx) => (
                  <div key={sIdx} className="rounded-lg border border-border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-sm text-foreground">Semester {sem.number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleAddSubject(activeBranchIdx, sIdx)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
                      </Button>
                    </div>

                    {sem.subjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No subjects listed for Semester {sem.number}.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {sem.subjects.map((subj, subjIdx) => (
                          <li
                            key={subjIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 text-xs text-foreground group"
                          >
                            <span className="font-medium truncate">{subj}</span>
                            <button
                              onClick={() => handleRemoveSubject(activeBranchIdx, sIdx, subjIdx)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                              title="Delete subject"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
