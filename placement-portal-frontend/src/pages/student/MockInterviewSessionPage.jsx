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
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import { showToast, showError, showConfirm } from "../../utils/swal";

const RATING_CONFIG = {
  interview_ready: {
    label: "Interview Ready",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-200",
    pillClass: "bg-purple-600 text-white",
  },
  good: {
    label: "Good",
    color: "yellow",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
    pillClass: "bg-amber-500 text-white",
  },
  somewhat_closer: {
    label: "Somewhat There",
    color: "green",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
    pillClass: "bg-emerald-600 text-white",
  },
  not_relevant: {
    label: "Not Relevant",
    color: "red",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200",
    pillClass: "bg-rose-600 text-white",
  },
};

export default function MockInterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory] = useState([]); // Array of { question, answerText, aiFeedback, rating, whatWasMissing, interviewerNoteReveal, codeLanguage }
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

  const MAX_QUESTIONS = 10;

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
        rating: answer?.rating,
        whatWasMissing: answer?.what_was_missing,
        interviewerNoteReveal: answer?.interviewer_note_reveal,
        codeLanguage: currentQuestion?.q_type === "coding" ? codeLanguage : null,
      };

      setHistory((prev) => [...prev, historyItem]);
      setAnswerInput("");

      const currentOrder = currentQuestion?.order_index !== undefined ? currentQuestion.order_index : history.length;
      if (session_status === "completed" || !next_question || currentOrder + 1 >= MAX_QUESTIONS) {
        setIsSessionEnded(true);
        showToast("Mock Interview Completed! All 10 questions evaluated.", "success");
        setTimeout(() => {
          navigate(`/student/mock-interview/${sessionId}/result`);
        }, 1500);
      } else {
        setCurrentQuestion(next_question);
        showToast(`Answer recorded! Question ${next_question.order_index + 1} of ${MAX_QUESTIONS} loaded.`);
      }
    } catch (err) {
      showError("Submission Failed", err.response?.data?.detail || "Could not submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitSession = async () => {
    const answeredCount = history.length;
    const confirmed = await showConfirm({
      title: "Exit Mock Interview?",
      text: `You have answered ${answeredCount} of ${MAX_QUESTIONS} questions. Your progress up to now will be saved.`,
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
        return { label: "Coding Challenge", icon: Code2, bg: "bg-purple-50 text-purple-800 border-purple-200" };
      case "technical":
        return { label: "Technical Question", icon: Terminal, bg: "bg-blue-50 text-blue-800 border-blue-200" };
      case "hr":
        return { label: "Behavioral & HR", icon: User, bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "aptitude":
        return { label: "Aptitude & Reasoning", icon: BrainCircuit, bg: "bg-amber-50 text-amber-800 border-amber-200" };
      case "resume":
        return { label: "Resume Follow-up", icon: FileText, bg: "bg-teal-50 text-teal-800 border-teal-200" };
      default:
        return { label: qType || "Question", icon: FileText, bg: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center animate-pulse">
        <div className="text-center">
          <Spinner className="mx-auto h-10 w-10 text-indigo-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Preparing your AI Mock Interview session…</p>
        </div>
      </div>
    );
  }

  const questionIndex = currentQuestion?.order_index !== undefined ? currentQuestion.order_index + 1 : history.length + 1;
  const isFinalQuestion = questionIndex === MAX_QUESTIONS;
  const progressPercent = Math.min(100, Math.round((Math.min(questionIndex, MAX_QUESTIONS) / MAX_QUESTIONS) * 100));
  const isCoding = currentQuestion?.q_type === "coding";

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      {/* ── Session Top Bar ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3 animate-slide-down">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitSession}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit Session
            </button>
            <div>
              <h1 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit className="h-4.5 w-4.5 text-indigo-600" />
                Live Mock Interview Assessment
              </h1>
              <p className="text-[11px] text-slate-400">Company-Calibrated Technical & Behavioral Round</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFinalQuestion && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 text-xs font-bold animate-pulse">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                Final Question (10/10)
              </span>
            )}

            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 border border-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Question {Math.min(questionIndex, MAX_QUESTIONS)} of {MAX_QUESTIONS}
              </span>
            </div>

            {currentQuestion && (
              <Badge variant={getDifficultyBadgeVariant(currentQuestion.difficulty)}>
                {currentQuestion.difficulty?.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* 10-Question Progress Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>
              Question {Math.min(questionIndex, MAX_QUESTIONS)} of {MAX_QUESTIONS} · {history.length} completed
            </span>
            <span className="font-bold text-slate-900">{progressPercent}% Completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Chat Thread Window ── */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden min-h-[500px] animate-slide-up stagger-1">
        {/* Scrollable Conversation Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-h-[600px]">
          {/* Welcome / Context Banner */}
          {history.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 flex items-start gap-3 shadow-sm animate-scale-in">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Welcome to your AI Mock Interview session!</p>
                <p className="mt-0.5 text-slate-500 leading-relaxed">
                  Questions are generated based on your target company and engineering discipline. Take your time to write detailed, structured answers.
                </p>
              </div>
            </div>
          )}

          {/* Past Q&A History */}
          {history.map((item, idx) => {
            const typeInfo = getQuestionTypeBadge(item.question.q_type);
            const ratingInfo = item.rating ? RATING_CONFIG[item.rating] : null;

            return (
              <div key={idx} className="space-y-4 animate-slide-up">
                {/* Past Question (AI Interviewer) */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <BrainCircuit className="h-4.5 w-4.5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white p-4 shadow-sm border border-slate-200 card-hover">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="font-bold">AI Interviewer</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 font-normal">{typeInfo.label}</span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">Q{idx + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {item.question.question_text}
                    </p>
                  </div>
                </div>

                {/* Past Answer (Candidate) */}
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-slate-900 text-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-700 pb-1.5">
                      <span className="text-xs font-semibold text-slate-300">Your Answer</span>
                      {item.codeLanguage && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.codeLanguage}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm font-sans whitespace-pre-wrap font-normal leading-relaxed text-slate-100 overflow-x-auto">
                      {item.answerText}
                    </pre>
                  </div>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 shadow-sm">
                    <User className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* AI Evaluation Card */}
                {(item.aiFeedback || item.rating) && (
                  <div className="ml-12 max-w-[85%] rounded-2xl bg-white border border-slate-200 p-4 shadow-sm text-xs space-y-3 card-hover">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        AI Interviewer Feedback
                      </span>
                      {ratingInfo && (
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${ratingInfo.badgeClass}`}>
                          {ratingInfo.label}
                        </span>
                      )}
                    </div>

                    {/* Constructive feedback */}
                    {item.aiFeedback && (
                      <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {item.aiFeedback}
                      </p>
                    )}

                    {/* What was missing */}
                    {item.whatWasMissing && (
                      <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-amber-900">
                        <p className="font-semibold text-amber-950 mb-0.5 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          To reach the next level:
                        </p>
                        <p className="text-amber-800 leading-relaxed">{item.whatWasMissing}</p>
                      </div>
                    )}

                    {/* Interviewer Note Reveal */}
                    {item.interviewerNoteReveal && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-900">
                        <p className="font-semibold text-slate-950 mb-0.5 flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                          What a strong answer covers:
                        </p>
                        <p className="text-slate-700 leading-relaxed">{item.interviewerNoteReveal}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Current Active Question (AI Interviewer) */}
          {currentQuestion && !isSessionEnded && (
            <div className="flex items-start gap-3 animate-slide-up">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <BrainCircuit className="h-4.5 w-4.5" />
              </div>
              <div className="w-full max-w-[90%] rounded-2xl rounded-tl-none bg-white p-5 shadow-sm border border-slate-200 card-hover">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">AI Interviewer</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Current Question
                    </span>
                  </div>
                  {(() => {
                    const badge = getQuestionTypeBadge(currentQuestion.q_type);
                    const IconComp = badge.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                        <IconComp className="h-3 w-3" />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <p className="text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </p>

                {isCoding && (
                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <span>Provide your complete code or pseudocode response below. You can select your preferred programming language.</span>
                  </div>
                )}

                {isFinalQuestion && (
                  <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold">
                      This is Question 10 of 10 (Final Question). Submit your response to finalize the interview and generate your performance scorecard!
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Indicator when submitting answer */}
          {isSubmitting && (
            <div className="flex items-start gap-3 animate-slide-up">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <BrainCircuit className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-white p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                <Spinner className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-slate-600">
                  AI interviewer is reviewing your response against evaluation criteria…
                </span>
              </div>
            </div>
          )}

          {/* Completion state */}
          {isSessionEnded && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-sm animate-scale-in">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
              <h3 className="text-lg font-bold text-emerald-950 font-heading">
                Interview Session Complete! (10/10 Questions Evaluated)
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                You have answered all 10 questions. Redirecting you to your interview scorecard…
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Answer Input Controls ── */}
        {!isSessionEnded && currentQuestion && (
          <div className="border-t border-slate-200 bg-white p-4 md:p-5 shadow-sm">
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
                      className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
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
                      <RotateCcw className="h-3 w-3" />
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
                      ? "// Write your solution code or pseudocode here...\nfunction solution() {\n  \n}"
                      : "Type your structured response here... Explain your reasoning and practical approach."
                  }
                  rows={isCoding ? 8 : 4}
                  disabled={isSubmitting}
                  className={`w-full transition-all ${
                    isCoding
                      ? "font-mono text-sm leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-b-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      : "font-sans text-sm p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  }`}
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
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
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
                >
                  {isFinalQuestion ? (
                    <>
                      <Award className="mr-2 h-4 w-4" />
                      Submit & Complete Interview (10/10)
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Answer ({Math.min(questionIndex, MAX_QUESTIONS)}/{MAX_QUESTIONS})
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
