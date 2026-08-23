import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../../api/resume.api";
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
} from "lucide-react";
import { showToast, showError } from "../../utils/swal";

export default function ResumeEnhancerPage() {
  const navigate = useNavigate();

  // Resume Selection State
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  // Wizard Step State
  // Step 0: Resume Selection
  // Step 1: Target Company & Role
  // Step 2: Key Projects & Impact
  // Step 3: Achievements & Certifications
  // Step 4: Final Enhanced Resume View
  const [currentStep, setCurrentStep] = useState(0);

  // Questions returned from backend / defaults
  const [questions, setQuestions] = useState([]);
  const [isStarting, setIsStarting] = useState(false);

  // Form inputs for the 3 questions
  const [targetCompany, setTargetCompany] = useState("");
  const [keyProjects, setKeyProjects] = useState("");
  const [achievements, setAchievements] = useState("");
  const [makeActive, setMakeActive] = useState(true);

  // Finalize / Result state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [enhancedResume, setEnhancedResume] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setIsLoadingResumes(true);
      const res = await resumeApi.getHistory();
      const list = res.data || [];
      setResumes(list);

      const activeRes = list.find((r) => r.is_active) || list[0];
      if (activeRes) {
        setSelectedResumeId(activeRes.id);
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
        make_active: makeActive,
      };

      const res = await resumeApi.enhancerFinalize(payload);
      setEnhancedResume(res.data);
      setCurrentStep(4);
      showToast("Resume enhanced successfully!", "success");
    } catch (err) {
      showError("Enhancement Failed", err.response?.data?.detail || "Could not generate enhanced resume.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!enhancedResume?.parsed_text) return;
    navigator.clipboard.writeText(enhancedResume.parsed_text);
    setCopied(true);
    showToast("Resume content copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!enhancedResume?.parsed_text) return;
    const element = document.createElement("a");
    const file = new Blob([enhancedResume.parsed_text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `enhanced_resume_${enhancedResume.id || "ai"}.txt`;
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
    fetchResumes();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-purple-200">
            <span>Placement Career Tools</span>
            <span>•</span>
            <span>AI Resume Enhancer</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wand2 className="h-7 w-7 text-purple-300" />
            AI Resume Enhancer
          </h1>
          <p className="mt-1 text-xs text-purple-100">
            Tailor your resume for your dream company. The AI optimizes bullet points, impact metrics, and skills alignment step-by-step.
          </p>
        </div>

        {currentStep > 0 && currentStep < 4 && (
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            <span className="font-semibold text-white">Step {currentStep} of 3</span>
          </div>
        )}
      </div>

      {/* Step 0: Resume Selection */}
      {currentStep === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Select Base Resume</h2>
              <p className="text-xs text-slate-500">Pick an uploaded resume to use as the foundation for AI enhancement.</p>
            </div>
          </div>

          {isLoadingResumes ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Spinner className="h-8 w-8 text-purple-600" />
              <p className="mt-3 text-xs font-medium">Loading your uploaded resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 mb-1">No uploaded resumes found</h3>
              <p className="text-xs text-slate-500 mb-4">
                Please upload a base resume on your Profile page before starting the enhancement wizard.
              </p>
              <Button variant="outline" onClick={() => navigate("/student/profile")}>
                Go to Profile Page
              </Button>
            </div>
          ) : (
            <form onSubmit={handleStartEnhancer} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Choose Base Resume *
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  required
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`Resume #${r.id} — ${r.source === "enhanced" ? "AI Enhanced" : "Uploaded"} ${
                        r.is_active ? "(Active)" : ""
                      }`}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  The AI will preserve your background while reframing experience for your target company.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isStarting}
                  disabled={isStarting || !selectedResumeId}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-purple-100"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Start Enhancement Wizard
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Step-by-Step Questions Wizard (Steps 1, 2, 3) */}
      {currentStep >= 1 && currentStep <= 3 && !isFinalizing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Step {currentStep} of 3</span>
              <span>
                {currentStep === 1
                  ? "Target Role"
                  : currentStep === 2
                  ? "Key Projects"
                  : "Achievements & Active Status"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Step 1: Target Company / Role */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Question 1: Target Company & Role
                  </h2>
                  <p className="text-xs text-slate-500">
                    Which company/role are you targeting with this enhanced resume?
                  </p>
                </div>
              </div>

              <Input
                label="Target Company / Role *"
                placeholder="e.g. Software Engineer at Google, Data Analyst at Deloitte, Full Stack Developer at Amazon"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                This helps the AI tailor industry-specific keywords and impact metrics for recruiters.
              </p>
            </div>
          )}

          {/* Question Step 2: Key Projects */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Question 2: Key Projects & Impact
                  </h2>
                  <p className="text-xs text-slate-500">
                    Describe your major projects, technologies used, and key results/impact.
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
                  placeholder="e.g. Built a real-time placement portal using React and FastAPI. Integrated AI mock interview engine using Groq API, reducing student prep time by 40%..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>
            </div>
          )}

          {/* Question Step 3: Achievements & Active Status */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Question 3: Achievements & Certifications
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
                  placeholder="e.g. AWS Certified Developer Associate (2025), 1st place in National Hackathon 2024, LeetCode 500+ solved..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Make Active Resume Toggle */}
              <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-4 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeActive}
                    onChange={(e) => setMakeActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-purple-950">
                    Set as my active primary resume
                  </span>
                </label>
                <p className="text-[11px] text-purple-800 leading-relaxed pl-7">
                  When enabled, this newly generated AI-enhanced resume will automatically become your active resume for campus drives and mock interview practice.
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
              className="border-slate-200 text-slate-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-purple-100"
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

      {/* Loading state during final generation */}
      {isFinalizing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm space-y-4">
          <Spinner className="mx-auto h-10 w-10 text-purple-600" />
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">AI is Enhancing Your Resume...</h3>
            <p className="text-xs text-slate-500 mt-1">
              Reframing bullet points, highlighting key project outcomes, and aligning keywords for {targetCompany || "your target role"}.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Final Enhanced Resume Result */}
      {currentStep === 4 && enhancedResume && (
        <div className="space-y-6 animate-fade-in">
          {/* Success Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold">Resume Enhanced Successfully!</h3>
                <p className="text-xs text-emerald-800">
                  Saved as Resume #{enhancedResume.id} • Source: <span className="font-semibold uppercase">AI Enhanced</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={enhancedResume.is_active ? "success" : "neutral"}>
                {enhancedResume.is_active ? "Active Primary Resume" : "Enhanced Saved Draft"}
              </Badge>
            </div>
          </div>

          {/* Enhanced Resume Content Viewer */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white text-xs">
              <div className="flex items-center gap-2 font-mono text-slate-300">
                <FileText className="h-4 w-4 text-purple-400" />
                <span>Enhanced Resume Content</span>
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
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download TXT
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 bg-slate-950 text-slate-100 max-h-[500px] overflow-y-auto">
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {enhancedResume.parsed_text || "(No content generated)"}
              </pre>
            </div>
          </div>

          {/* Action CTAs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-slate-200 text-slate-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Enhance Another Resume
            </Button>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate(`/student/resume-analyzer?resumeId=${enhancedResume.id}`)}
                variant="outline"
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <FileSearch className="mr-2 h-4 w-4" />
                Analyze This Resume
              </Button>

              <Button
                onClick={() =>
                  navigate(`/student/mock-interview?resumeId=${enhancedResume.id}`, {
                    state: { resumeId: enhancedResume.id, tab: "resume" },
                  })
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md"
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
