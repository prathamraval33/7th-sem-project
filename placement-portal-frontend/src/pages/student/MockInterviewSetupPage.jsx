import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { interviewApi } from "../../api/interview.api";
import { resumeApi } from "../../api/resume.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Spinner from "../../components/ui/Spinner";
import { MessagesSquare, FileText, Sparkles, Building2, Wand2, BrainCircuit, CheckCircle2 } from "lucide-react";
import { showToast, showError } from "../../utils/swal";

export default function MockInterviewSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const passedResumeId = location.state?.resumeId || searchParams.get("resumeId");
  const passedSkill = location.state?.skill || searchParams.get("skill") || "";
  const passedCompany = location.state?.companyName || searchParams.get("companyName") || "";
  const initialTab = location.state?.tab || (passedResumeId ? "resume" : "manual");

  const [activeTab, setActiveTab] = useState(initialTab); // "manual" | "resume"

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

      // Pre-select passed resumeId or active resume
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
        resumeCompanyName.trim()
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading flex items-center gap-2">
          <BrainCircuit className="w-7 h-7 text-accent" />
          AI Mock Interview Setup
        </h1>
        <p className="text-slate-600 mt-1">
          Prepare for real placement technical & HR rounds with personalized AI-driven interview questions.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center space-x-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 font-bold text-base transition-colors ${
            activeTab === "manual"
              ? "text-accent border-b-2 border-accent pb-3 -mb-3"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Wand2 size={18} />
          <span>Manual Setup</span>
        </button>

        <span className="text-slate-300 font-light text-xl">|</span>

        <button
          onClick={() => setActiveTab("resume")}
          className={`flex items-center gap-2 font-bold text-base transition-colors ${
            activeTab === "resume"
              ? "text-teal-600 border-b-2 border-teal-600 pb-3 -mb-3"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={18} />
          <span>Start From Resume</span>
        </button>
      </div>

      {/* Tab Content (a): Manual Setup */}
      {activeTab === "manual" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 font-heading">Customized Topic & Skill Interview</h2>
              <p className="text-sm text-slate-500">Configure company target, technical skills, and session depth.</p>
            </div>
          </div>

          <form onSubmit={handleStartManual} className="space-y-5">
            <Input
              label="Target Company Name *"
              placeholder="e.g. Google, TCS, Infosys, Amazon"
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
                helperText="Leave empty for general placement questions or specify key skill domains."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interview Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="full">Full Session (Comprehensive - Technical & HR)</option>
                <option value="technical">Technical Focus Only</option>
                <option value="aptitude">Aptitude & Problem Solving</option>
                <option value="coding">Coding & Data Structures</option>
                <option value="hr">HR & Behavioral Focus Only</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isStartingManual}
                className="w-full sm:w-auto px-8"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Mock Interview
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content (b): Start from Resume */}
      {activeTab === "resume" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 font-heading">Resume-Grounded Interview</h2>
              <p className="text-sm text-slate-500">
                The AI reads your uploaded resume projects & skills to generate tailored interview questions.
              </p>
            </div>
          </div>

          {isLoadingResumes ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Spinner size="lg" />
              <p className="mt-3 text-sm">Loading your resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 mb-1">No uploaded resumes found</h3>
              <p className="text-sm text-slate-500 mb-4">
                Please upload a resume on your Profile page before starting a resume-based mock interview.
              </p>
              <Button variant="outline" onClick={() => navigate("/student/profile")}>
                Go to Profile Page
              </Button>
            </div>
          ) : (
            <form onSubmit={handleStartFromResume} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Resume *
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
                <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-teal-600" />
                  Your resume content will be analyzed to generate interview questions.
                </p>
              </div>

              <Input
                label="Target Company Name *"
                placeholder="e.g. Microsoft, Deloitte, Accenture"
                value={resumeCompanyName}
                onChange={(e) => setResumeCompanyName(e.target.value)}
                required
              />

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isStartingResume}
                  className="w-full sm:w-auto px-8"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
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
