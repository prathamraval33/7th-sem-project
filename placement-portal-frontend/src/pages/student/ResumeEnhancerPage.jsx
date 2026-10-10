import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../../api/resume.api";
import { studentApi } from "../../api/student.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import {
  Wand2,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Download,
  Check,
  MessagesSquare,
  FileSearch,
  RotateCcw,
  Target,
  Briefcase,
  Award,
  Tag,
  Eye,
  Code,
  ChevronRight,
  Sliders,
  Layers,
} from "lucide-react";
import { showToast, showError } from "../../utils/swal";
import { formatResumeLabel } from "../../utils/resumeFormatter";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
} from "../../components/common/MotionKit";

const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics & Communication",
  "Civil Engineering",
  "Chemical Engineering",
  "General Engineering",
];

export default function ResumeEnhancerPage() {
  const navigate = useNavigate();

  // Resume Selection State
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Computer Engineering");
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  // Wizard Step State: 0 (Select), 1 (Target & Dept), 2 (Key Projects), 3 (Achievements), 4 (Result)
  const [currentStep, setCurrentStep] = useState(0);

  // Questions returned from backend / defaults
  const [questions, setQuestions] = useState([]);
  const [isStarting, setIsStarting] = useState(false);

  // Form inputs
  const [targetCompany, setTargetCompany] = useState("");
  const [keyProjects, setKeyProjects] = useState("");
  const [achievements, setAchievements] = useState("");
  const [makeActive, setMakeActive] = useState(true);

  // Finalize / Result state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [enhancedResume, setEnhancedResume] = useState(null);
  const [viewMode, setViewMode] = useState("preview"); // 'preview' | 'raw'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initPageData();
  }, []);

  const initPageData = async () => {
    try {
      setIsLoadingResumes(true);

      // Fetch student profile to get registered department
      try {
        const profileRes = await studentApi.getProfile();
        if (profileRes.data?.branch) {
          const studentBranch = profileRes.data.branch;
          const match = DEPARTMENTS.find(
            (d) => d.toLowerCase() === studentBranch.toLowerCase()
          );
          setSelectedDepartment(match || studentBranch);
        }
      } catch (e) {
        // Fallback default
      }

      // Fetch resumes
      const res = await resumeApi.getHistory();
      const list = res.data || [];
      setResumes(list);

      const activeRes = list.find((r) => r.is_active) || list[0];
      if (activeRes) {
        setSelectedResumeId(String(activeRes.id));
      }
    } catch (err) {
      showError("Fetch Error", "Could not load your uploaded resumes.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleStartEnhancer = async (e) => {
    if (e) e.preventDefault();

    if (!selectedResumeId) {
      showError("Validation Error", "Please select a resume to enhance.");
      return;
    }

    try {
      setIsStarting(true);
      const res = await resumeApi.enhancerStart(Number(selectedResumeId));
      if (res.data?.questions) {
        setQuestions(res.data.questions);
      }
      setCurrentStep(1);
      showToast("Enhancement session initialized!");
    } catch (err) {
      showError("Start Failed", err.response?.data?.detail || "Could not start resume enhancer.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !targetCompany.trim()) {
      showError("Input Required", "Please enter your target company or role.");
      return;
    }
    if (currentStep === 2 && !keyProjects.trim()) {
      showError("Input Required", "Please describe your key projects.");
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinalizeEnhancement();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinalizeEnhancement = async () => {
    try {
      setIsFinalizing(true);
      const payload = {
        resume_id: Number(selectedResumeId),
        target_company: targetCompany.trim(),
        key_projects: keyProjects.trim(),
        achievements: achievements.trim(),
        department: selectedDepartment,
        make_active: makeActive,
      };

      const res = await resumeApi.enhancerFinalize(payload);
      setEnhancedResume(res.data);
      setCurrentStep(4);
      showToast("Resume enhanced successfully with X-Y-Z formula!", "success");
    } catch (err) {
      showError("Enhancement Failed", err.response?.data?.detail || "Could not generate enhanced resume.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCopyToClipboard = () => {
    const text = enhancedResume?.enhanced_resume_text || enhancedResume?.parsed_text;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Resume content copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const text = enhancedResume?.enhanced_resume_text || enhancedResume?.parsed_text;
    if (!text) return;
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `Enhanced_Resume_${targetCompany.replace(/\s+/g, "_") || "AI"}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("Downloaded enhanced resume file!");
  };

  const handleReset = () => {
    setCurrentStep(0);
    setTargetCompany("");
    setKeyProjects("");
    setAchievements("");
    setEnhancedResume(null);
    initPageData();
  };

  // Helper parser for markdown preview
  const renderFormattedPreview = (markdownText) => {
    if (!markdownText) return <p className="text-slate-400 italic">No content available.</p>;

    const lines = markdownText.split("\n");
    return (
      <div className="space-y-3 font-sans text-sm text-slate-800 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="font-heading text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-2 pt-2">
                {trimmed.replace("# ", "")}
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 mt-5">
                {trimmed.replace("## ", "")}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="font-heading text-xs font-bold text-slate-800 mt-2.5">
                {trimmed.replace("### ", "")}
              </h3>
            );
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-3">
                <span className="text-slate-400 mt-1 text-xs">•</span>
                <span className="text-xs text-slate-700 leading-relaxed">{trimmed.replace(/^[-*]\s+/, "")}</span>
              </div>
            );
          }
          if (trimmed === "") {
            return <div key={idx} className="h-1.5" />;
          }
          return (
            <p key={idx} className="text-xs text-slate-600">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <Wand2 size={13} className="text-emerald-600" />
              <span>ATS Resume Studio</span>
            </span>
            <LiveStatusBeacon label="STUDIO ACTIVE" variant="active" />
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            <AnimatedWords text="AI Resume Enhancer & Optimizer" delay={0.05} />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            Target campus drives by transforming generic bullet points into Google X-Y-Z achievements with department-specific ATS terminology.
          </p>
        </div>

        {currentStep > 0 && currentStep < 4 && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-xs text-xs font-bold text-slate-700 animate-scale-in">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>Step {currentStep} of 3</span>
          </div>
        )}
      </div>

      {/* Student Live Ticker Ribbon */}
      <StudentTickerRibbon />

      {/* ── Step 0: Resume Selection ── */}
      {currentStep === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 animate-slide-up stagger-1 card-hover">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">Select Base Document & Target Discipline</h2>
              <p className="text-xs text-slate-500">Choose the resume you wish to tailor and calibrate for industry expectations.</p>
            </div>
          </div>

          {isLoadingResumes ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 animate-pulse">
              <Spinner className="h-8 w-8 text-indigo-600" />
              <p className="mt-3 text-xs font-medium">Loading uploaded resumes…</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-scale-in">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 mb-1 text-sm">No uploaded resumes found</h3>
              <p className="text-xs text-slate-500 mb-4">
                Please upload a base resume on your Profile page before starting the enhancement wizard.
              </p>
              <Button variant="outline" onClick={() => navigate("/student/profile")}>
                Go to Profile Page
              </Button>
            </div>
          ) : (
            <form onSubmit={handleStartEnhancer} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Choose Base Resume *
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                    required
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatResumeLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Engineering Department *
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600">
                <Layers className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <span className="font-semibold text-slate-800">Domain Calibration:</span> The AI preserves your actual project experience while highlighting industry tools, standards, and quantifiable parameters suitable for <span className="font-semibold text-slate-800">{selectedDepartment}</span>.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isStarting}
                  disabled={isStarting || !selectedResumeId}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Start Enhancement Wizard
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Step-by-Step Questions Wizard (Steps 1, 2, 3) ── */}
      {currentStep >= 1 && currentStep <= 3 && !isFinalizing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 animate-scale-in card-hover">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                Step {currentStep} of 3
              </span>
              <span className="text-slate-500 font-normal">
                {currentStep === 1
                  ? "Target Company & Discipline"
                  : currentStep === 2
                  ? "Key Projects & Deliverables"
                  : "Achievements & Primary Status"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Step 1: Target Company / Role & Department */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Target className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Target Company & Role
                  </h2>
                  <p className="text-xs text-slate-500">
                    Which company or position are you targeting with this resume?
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Target Company / Role *"
                  placeholder="e.g. Software Engineer at Google, Design Engineer at Tata Motors, Structural Engineer at L&T"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Engineering Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                This enables the AI to weave ATS keywords matching real technical recruiter screens.
              </p>
            </div>
          )}

          {/* Question Step 2: Key Projects */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Key Projects & Impact
                  </h2>
                  <p className="text-xs text-slate-500">
                    Describe your major projects, tools used, and key results/deliverables.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Key Projects & Impact Details *
                </label>
                <textarea
                  value={keyProjects}
                  onChange={(e) => setKeyProjects(e.target.value)}
                  rows={5}
                  placeholder={`Describe your projects and outcomes. e.g. for ${selectedDepartment}: "Designed prototype using CAD/FEA simulation, reducing material consumption by 15%..."`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>
            </div>
          )}

          {/* Question Step 3: Achievements & Active Status */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Achievements & Certifications
                  </h2>
                  <p className="text-xs text-slate-500">
                    List any notable achievements, awards, hackathons, or certifications.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Achievements & Certifications (Optional)
                </label>
                <textarea
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  rows={4}
                  placeholder="e.g. 1st place in National Design Competition, AWS Certified, GATE qualified, published research paper..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              {/* Make Active Resume Toggle */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeActive}
                    onChange={(e) => setMakeActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Set as my active primary resume
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed pl-7">
                  When enabled, this newly generated AI-enhanced resume will automatically become your primary resume for campus drives and mock interviews.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
            >
              {currentStep === 3 ? (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Finalize & Generate Resume
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Loading state during final generation ── */}
      {isFinalizing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm space-y-4 animate-scale-in">
          <Spinner className="mx-auto h-10 w-10 text-indigo-600" />
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Generating ATS-Compliant Resume…
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Applying Google X-Y-Z formula, calibrating technical depth for {selectedDepartment}, and injecting keywords for {targetCompany || "your target role"}.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 4: Final Enhanced Resume Result ── */}
      {currentStep === 4 && enhancedResume && (
        <div className="space-y-6 animate-slide-up">
          {/* Success Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold">Resume Enhanced Successfully</h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Target: <strong className="font-bold">{targetCompany}</strong> · Discipline: <strong className="font-bold">{enhancedResume.department || selectedDepartment}</strong> · Source: <span className="font-semibold uppercase text-[11px]">AI Enhanced</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={enhancedResume.is_active ? "success" : "neutral"}>
                {enhancedResume.is_active ? "Active Primary Resume" : "Enhanced Saved Draft"}
              </Badge>
            </div>
          </div>

          {/* Key Changes & Keywords Section */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Key Changes Made */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 card-hover animate-slide-in-left stagger-1">
              <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Key Strategic Changes Made
              </h4>
              {enhancedResume.key_changes_made && enhancedResume.key_changes_made.length > 0 ? (
                <ul className="space-y-2">
                  {enhancedResume.key_changes_made.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Optimized bullet points and structural alignment.</p>
              )}
            </div>

            {/* Tailored Keywords Added */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 card-hover animate-slide-in-right stagger-1">
              <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-600" />
                Tailored Keywords Injected
              </h4>
              <p className="text-[11px] text-slate-500">
                Added for ATS keyword match against {targetCompany}:
              </p>
              {enhancedResume.tailored_keywords_added && enhancedResume.tailored_keywords_added.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {enhancedResume.tailored_keywords_added.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Keywords naturally woven into project bullets.</p>
              )}
            </div>
          </div>

          {/* Enhanced Resume Content Viewer */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-slide-up stagger-2">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-mono text-slate-300">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>Enhanced Resume Document</span>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      viewMode === "preview"
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      viewMode === "raw"
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    Raw Markdown
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy Text"}
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-900 px-3 py-1.5 text-xs font-semibold transition hover:bg-white shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .md
                </button>
              </div>
            </div>

            {/* Document Body */}
            {viewMode === "preview" ? (
              <div className="p-8 bg-white max-h-[600px] overflow-y-auto border-t border-slate-100">
                {renderFormattedPreview(
                  enhancedResume.enhanced_resume_text || enhancedResume.parsed_text
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-950 text-slate-100 max-h-[600px] overflow-y-auto">
                <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {enhancedResume.enhanced_resume_text || enhancedResume.parsed_text || "(No content generated)"}
                </pre>
              </div>
            )}
          </div>

          {/* Action CTAs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 animate-slide-up stagger-3">
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Enhance Another Resume
            </Button>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate(`/student/resume-analyzer?resumeId=${enhancedResume.id}`)}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-white font-semibold"
              >
                <FileSearch className="mr-2 h-4 w-4 text-indigo-500" />
                Score in AI Analyzer
              </Button>

              <Button
                onClick={() =>
                  navigate(`/student/mock-interview?resumeId=${enhancedResume.id}`, {
                    state: { resumeId: enhancedResume.id, tab: "resume" },
                  })
                }
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
              >
                <MessagesSquare className="mr-2 h-4 w-4" />
                Practice in Mock Interview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
