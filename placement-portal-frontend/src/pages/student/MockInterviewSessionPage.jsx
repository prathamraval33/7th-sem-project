import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { interviewApi } from "../../api/interview.api";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import {
  BrainCircuit,
  User,
  Send,
  Code2,
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Star,
  AlertCircle,
  Terminal,
  RotateCcw,
  Award,
} from "lucide-react";
import { showToast, showError, showConfirm } from "../../utils/swal";

export default function MockInterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory] = useState([]); // Array of { question, answerText, aiFeedback, score, codeLanguage }
  const [answerInput, setAnswerInput] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  // Fetch current question on mount
  useEffect(() => {
    fetchInitialQuestion();
  }, [sessionId]);

  // Auto-scroll to bottom of chat when history or current question updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, currentQuestion, isSubmitting]);

  const fetchInitialQuestion = async () => {
    try {
      setIsLoading(true);
      const res = await interviewApi.getNextQuestion(sessionId);
      if (res.data) {
        setCurrentQuestion(res.data);
      } else {
        // Session might already be completed
        showToast("Interview session is completed.", "info");
        navigate(`/student/mock-interview/${sessionId}/result`);
      }
    } catch (err) {
      showError("Session Error", err.response?.data?.detail || "Failed to load interview session.");
      navigate("/student/mock-interview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Support Tab indent for code editor
    if (currentQuestion?.q_type === "coding" && e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newText = answerInput.substring(0, start) + "  " + answerInput.substring(end);
      setAnswerInput(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
      return;
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();

    if (!answerInput.trim()) {
      showError("Input Required", "Please enter an answer before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await interviewApi.submitAnswer(sessionId, answerInput.trim());
      const { answer, next_question, session_status } = res.data;

      // Add to conversation history
      const historyItem = {
        question: currentQuestion,
        answerText: answerInput.trim(),
        aiFeedback: answer?.ai_feedback,
        score: answer?.score,
        codeLanguage: currentQuestion?.q_type === "coding" ? codeLanguage : null,
      };

      setHistory((prev) => [...prev, historyItem]);
      setAnswerInput("");

      if (session_status === "completed" || !next_question) {
        setIsSessionEnded(true);
        showToast("Mock Interview Completed!", "success");
        setTimeout(() => {
          navigate(`/student/mock-interview/${sessionId}/result`);
        }, 1500);
      } else {
        setCurrentQuestion(next_question);
        showToast("Answer recorded! Next question loaded.");
      }
    } catch (err) {
      showError("Submission Failed", err.response?.data?.detail || "Could not submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitSession = async () => {
    const confirmed = await showConfirm({
      title: "Exit Mock Interview?",
      text: "Your current progress will be saved up to the last answered question.",
      confirmButtonText: "Yes, Exit",
    });
    if (confirmed) {
      navigate("/student/mock-interview");
    }
  };

  const getDifficultyBadgeVariant = (diff) => {
    switch (diff?.toLowerCase()) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "neutral";
    }
  };

  const getQuestionTypeBadge = (qType) => {
    switch (qType?.toLowerCase()) {
      case "coding":
        return { label: "Coding Challenge", icon: Code2, bg: "bg-purple-100 text-purple-800 border-purple-200" };
      case "technical":
        return { label: "Technical Question", icon: Terminal, bg: "bg-blue-100 text-blue-800 border-blue-200" };
      case "hr":
        return { label: "Behavioral & HR", icon: User, bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "aptitude":
        return { label: "Aptitude & Problem Solving", icon: BrainCircuit, bg: "bg-amber-100 text-amber-800 border-amber-200" };
      default:
        return { label: qType || "Question", icon: FileText, bg: "bg-neutral-100 text-neutral-800 border-neutral-200" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-3 text-sm font-medium text-neutral-600">Preparing your AI Mock Interview session...</p>
        </div>
      </div>
    );
  }

  const questionIndex = history.length + 1;
  const isCoding = currentQuestion?.q_type === "coding";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Session Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitSession}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Session
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-600" />
              AI Mock Interview
            </h1>
            <p className="text-xs text-slate-500">Session ID: #{sessionId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 border border-indigo-100">
            <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-900">
              Question #{questionIndex}
            </span>
          </div>

          {currentQuestion && (
            <Badge variant={getDifficultyBadgeVariant(currentQuestion.difficulty)}>
              {currentQuestion.difficulty?.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Chat Thread Window */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden min-h-[500px]">
        {/* Scrollable Conversation Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-h-[600px]">
          {/* Welcome / Context Banner */}
          {history.length === 0 && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 text-xs text-indigo-900 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-950">Welcome to your AI Mock Interview session!</p>
                <p className="mt-0.5 text-indigo-800">
                  Answer each question carefully. The AI will evaluate your answers step-by-step and provide instant feedback upon submission.
                </p>
              </div>
            </div>
          )}

          {/* Past Q&A History */}
          {history.map((item, idx) => {
            const typeInfo = getQuestionTypeBadge(item.question.q_type);

            return (
              <div key={idx} className="space-y-4">
                {/* Past Question (AI Interviewer) */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-indigo-600">AI Interviewer</span>
                      <span className="text-[10px] font-medium text-slate-400">Q{idx + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {item.question.question_text}
                    </p>
                  </div>
                </div>

                {/* Past Answer (Candidate) */}
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-indigo-900 text-white p-4 shadow-md">
                    <div className="flex items-center justify-between gap-2 mb-2 border-b border-indigo-700/60 pb-1.5">
                      <span className="text-xs font-semibold text-indigo-200">Your Answer</span>
                      {item.codeLanguage && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-800 text-indigo-200">
                          {item.codeLanguage}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm font-sans whitespace-pre-wrap font-normal leading-relaxed text-indigo-50 overflow-x-auto">
                      {item.answerText}
                    </pre>
                  </div>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-md">
                    <User className="h-5 w-5" />
                  </div>
                </div>

                {/* AI Instant Feedback */}
                {item.aiFeedback && (
                  <div className="ml-12 max-w-[80%] rounded-xl bg-emerald-50 border border-emerald-200 p-3 shadow-sm text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        AI Evaluation & Feedback
                      </span>
                      {item.score !== undefined && item.score !== null && (
                        <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-white text-[11px] font-bold">
                          Score: {item.score}/100
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-800 leading-relaxed whitespace-pre-wrap pt-1">
                      {item.aiFeedback}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Current Active Question (AI Interviewer) */}
          {currentQuestion && !isSessionEnded && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="w-full max-w-[90%] rounded-2xl rounded-tl-none bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600">AI Interviewer</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Current Question
                    </span>
                  </div>
                  {(() => {
                    const badge = getQuestionTypeBadge(currentQuestion.q_type);
                    const IconComp = badge.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                        <IconComp className="h-3.5 w-3.5" />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <p className="text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </p>

                {isCoding && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>Provide your complete code response below. You can select your preferred programming language.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Indicator when submitting answer */}
          {isSubmitting && (
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <BrainCircuit className="h-5 w-5 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-white p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                <Spinner className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-medium text-slate-600">
                  AI is reviewing your answer and generating feedback...
                </span>
              </div>
            </div>
          )}

          {/* Completion state */}
          {isSessionEnded && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
              <h3 className="text-lg font-bold text-emerald-950 font-heading">Interview Session Complete!</h3>
              <p className="text-xs text-emerald-800 mt-1">
                Redirecting you to the interview performance dashboard...
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Answer Input Controls */}
        {!isSessionEnded && currentQuestion && (
          <div className="border-t border-slate-200 bg-white p-4 md:p-5 shadow-inner">
            <form onSubmit={handleSubmitAnswer} className="space-y-3">
              {/* Header toolbar for coding questions */}
              {isCoding && (
                <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-2 rounded-t-xl text-slate-300 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    <span>Code Editor</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[11px] text-slate-400 font-sans">Language:</label>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="sql">SQL</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setAnswerInput("")}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                      title="Clear editor"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Text Input area */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCoding
                      ? "// Write your solution code here...\nfunction solution() {\n  \n}"
                      : "Type your detailed response here... Explain your thoughts clearly."
                  }
                  rows={isCoding ? 8 : 4}
                  disabled={isSubmitting}
                  className={`w-[100%] transition-all ${
                    isCoding
                      ? "font-mono text-sm leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-b-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      : "font-sans text-sm p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  }`}
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>Pro-tip: Press</span>
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 border border-slate-200">
                    Ctrl + Enter
                  </kbd>
                  <span>to submit your answer</span>
                </p>

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!answerInput.trim() || isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-indigo-200"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Answer
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
