import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { interviewApi } from "../../api/interview.api";
import { resumeApi } from "../../api/resume.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Spinner from "../../components/ui/Spinner";
import {
  BrainCircuit,
  FileText,
  Sparkles,
  Wand2,
  CheckCircle2,
  Gauge,
  ChevronRight,
  Layers,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";
import { showToast, showError } from "../../utils/swal";
import { formatResumeLabel } from "../../utils/resumeFormatter";

const DIFFICULTY_OPTIONS = [
  {
    id: "fresher",
    label: "Fresher",
    description: "Final year student, foundational campus placement questions",
    badge: "Entry Level",
  },
  {
    id: "mid_level",
    label: "Mid-Level",
    description: "1-2 years experience equivalent, architectural & system depth",
    badge: "Intermediate",
  },
  {
    id: "senior",
    label: "Senior",
    description: "3+ years equivalent or product tier-1 problem solving",
    badge: "Advanced",
  },
];

export default function MockInterviewSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const passedResumeId = location.state?.resumeId || searchParams.get("resumeId");
  const passedSkill = location.state?.skill || searchParams.get("skill") || "";
  const passedCompany = location.state?.companyName || searchParams.get("companyName") || "";
  const initialTab = location.state?.tab || (passedResumeId ? "resume" : "manual");

  const [activeTab, setActiveTab] = useState(initialTab); // "manual" | "resume"
  const [difficultyLevel, setDifficultyLevel] = useState("fresher"); // "fresher" | "mid_level" | "senior"

  // Manual form state
  const [companyName, setCompanyName] = useState(passedCompany);
  const [skillsInput, setSkillsInput] = useState(passedSkill);
  const [mode, setMode] = useState("full");
  const [isStartingManual, setIsStartingManual] = useState(false);

  // Resume form state
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(passedResumeId ? String(passedResumeId) : "");
  const [resumeCompanyName, setResumeCompanyName] = useState("");
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isStartingResume, setIsStartingResume] = useState(false);

  // Fetch resumes when tab switches to 'resume'
  useEffect(() => {
    if (activeTab === "resume" && resumes.length === 0) {
      fetchResumes();
    }
  }, [activeTab]);

  const fetchResumes = async () => {
    try {
      setIsLoadingResumes(true);
      const res = await resumeApi.getHistory();
      const list = res.data || [];
      setResumes(list);

      const targetId = passedResumeId ? String(passedResumeId) : null;
      const foundRes = targetId ? list.find((r) => String(r.id) === targetId) : null;
      const activeRes = foundRes || list.find((r) => r.is_active) || list[0];
      if (activeRes) {
        setSelectedResumeId(String(activeRes.id));
      }
    } catch (err) {
      showError("Fetch Error", "Could not load your uploaded resumes.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleStartManual = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showError("Validation Error", "Please enter a target company name.");
      return;
    }

    const skillsArray = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsStartingManual(true);
      const res = await interviewApi.start({
        companyName: companyName.trim(),
        skills: skillsArray,
        mode,
        difficultyLevel,
      });

      const sessionId = res.data?.session_id;
      showToast("Mock interview session started!");
      if (sessionId) {
        navigate(`/student/mock-interview/${sessionId}`);
      }
    } catch (err) {
      showError("Start Failed", err.response?.data?.detail || "Failed to start mock interview session.");
    } finally {
      setIsStartingManual(false);
    }
  };

  const handleStartFromResume = async (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      showError("Validation Error", "Please select a resume.");
      return;
    }
    if (!resumeCompanyName.trim()) {
      showError("Validation Error", "Please enter a target company name.");
      return;
    }

    try {
      setIsStartingResume(true);
      const res = await interviewApi.startFromResume(
        Number(selectedResumeId),
        resumeCompanyName.trim(),
        difficultyLevel
      );

      const sessionId = res.data?.session_id;
      showToast("Resume-based mock interview session started!");
      if (sessionId) {
        navigate(`/student/mock-interview/${sessionId}`);
      }
    } catch (err) {
      showError("Start Failed", err.response?.data?.detail || "Failed to start interview from resume.");
    } finally {
      setIsStartingResume(false);
    }
  };

  const renderDifficultySelector = () => (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <Gauge className="w-3.5 h-3.5 text-indigo-500" />
        Interview Difficulty Calibration *
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DIFFICULTY_OPTIONS.map((opt) => {
          const isSelected = difficultyLevel === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setDifficultyLevel(opt.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between card-hover ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white shadow-md ring-1 ring-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {opt.label}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {opt.description}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold">
                {isSelected ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Selected
                  </span>
                ) : (
                  <span className="text-slate-400">Click to select</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="animate-slide-down">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
          <span>Placement Practice</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Mock Interview Setup</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
          AI Mock Interview Setup
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
          Prepare for real campus placements with technical & HR rounds calibrated to your target company and experience level.
        </p>
      </div>

      {/* ── Tab Switcher (Segmented Control) ── */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 max-w-md animate-slide-up stagger-1">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
            activeTab === "manual"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>Manual Setup</span>
        </button>

        <button
          onClick={() => setActiveTab("resume")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
            activeTab === "resume"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Start From Resume</span>
        </button>
      </div>

      {/* ── Tab Content: Manual Setup ── */}
      {activeTab === "manual" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 animate-scale-in card-hover">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">Customized Topic & Skill Session</h2>
              <p className="text-xs text-slate-500">Configure target company, technical focus, and interview difficulty.</p>
            </div>
          </div>

          <form onSubmit={handleStartManual} className="space-y-5">
            <Input
              label="Target Company Name *"
              placeholder="e.g. Google, TCS, Infosys, Amazon, Microsoft, Flipkart"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <div>
              <Input
                label="Key Skills & Topics"
                placeholder="e.g. React, Data Structures, Python, SQL (comma-separated)"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                helperText="Leave empty for general placement assessment or specify skill domains."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Interview Mode (10 Questions Total)
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="full">Full Comprehensive Session (Aptitude, Technical, Coding, HR)</option>
                <option value="technical">Technical Focus (Core Domain & Architecture)</option>
                <option value="aptitude">Aptitude & Problem Solving</option>
                <option value="coding">Coding & Algorithms</option>
                <option value="hr">HR & Behavioral Focus</option>
              </select>
            </div>

            {/* Difficulty Selector */}
            {renderDifficultySelector()}

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                isLoading={isStartingManual}
                disabled={isStartingManual || !companyName.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start Mock Interview
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab Content: Start from Resume ── */}
      {activeTab === "resume" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 animate-scale-in card-hover">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">Resume-Grounded Interview</h2>
              <p className="text-xs text-slate-500">
                The AI analyzes your uploaded projects and experiences to ask genuine interviewer follow-up questions.
              </p>
            </div>
          </div>

          {isLoadingResumes ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 animate-pulse">
              <Spinner className="h-8 w-8 text-indigo-600" />
              <p className="mt-3 text-xs font-medium">Loading your resumes…</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-scale-in">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 mb-1 text-sm">No uploaded resumes found</h3>
              <p className="text-xs text-slate-500 mb-4">
                Please upload a resume on your Profile page before starting a resume-based mock interview.
              </p>
              <Button variant="outline" onClick={() => navigate("/student/profile")}>
                Go to Profile Page
              </Button>
            </div>
          ) : (
            <form onSubmit={handleStartFromResume} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Resume Document *
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
                <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Your real projects, internship experience, and listed achievements will be queried.
                </p>
              </div>

              <Input
                label="Target Company Name *"
                placeholder="e.g. Microsoft, Google, Deloitte, Accenture"
                value={resumeCompanyName}
                onChange={(e) => setResumeCompanyName(e.target.value)}
                required
              />

              {/* Difficulty Selector */}
              {renderDifficultySelector()}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  isLoading={isStartingResume}
                  disabled={isStartingResume || !selectedResumeId || !resumeCompanyName.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Resume Mock Interview
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
