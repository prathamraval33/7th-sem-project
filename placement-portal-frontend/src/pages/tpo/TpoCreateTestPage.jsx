import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { Plus, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { showSuccess, showError } from "../../utils/swal";

export default function TpoCreateTestPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [minPassingMarks, setMinPassingMarks] = useState(5);
  const [isPractice, setIsPractice] = useState(false);

  const [questions, setQuestions] = useState([
    {
      id: 1,
      question_text: "",
      options: ["", "", "", ""],
      correct_option_index: 0,
      marks: 1,
      category: "Technical",
    },
  ]);

  const createMutation = useMutation({
    mutationFn: (data) => testApi.createTest(data),
    onSuccess: () => {
      showSuccess("Test Created!", "Official test has been published successfully.");
      navigate("/tpo/dashboard");
    },
    onError: (err) => {
      showError("Creation Failed", err.response?.data?.detail || "Could not create test.");
    },
  });

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: questions.length + 1,
        question_text: "",
        options: ["", "", "", ""],
        correct_option_index: 0,
        marks: 1,
        category: "Technical",
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showError("Validation Error", "Please provide a test title.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        showError("Validation Error", `Question ${i + 1} text cannot be empty.`);
        return;
      }
      if (questions[i].options.some((o) => !o.trim())) {
        showError("Validation Error", `All 4 options for Question ${i + 1} must be filled.`);
        return;
      }
    }

    createMutation.mutate({
      title,
      duration_minutes: Number(durationMinutes),
      min_passing_marks: Number(minPassingMarks),
      is_practice: isPractice,
      questions,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} className="mr-1" /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-900 font-heading">Create Placement Test</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading border-b pb-2">Test Setup</h2>

          <Input
            label="Test Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. TCS NQT Placement Qualifying Test"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min={1}
              required
            />
            <Input
              label="Passing Score (Marks)"
              type="number"
              value={minPassingMarks}
              onChange={(e) => setMinPassingMarks(e.target.value)}
              min={0}
              required
            />
            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 p-2.5 bg-slate-50 border rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPractice}
                  onChange={(e) => setIsPractice(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Set as Practice Test</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-heading">Questions List ({questions.length})</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
              <Plus size={14} className="mr-1" /> Add Question
            </Button>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 relative">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-500">Question #{qIdx + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>

              <Input
                label="Question Text"
                value={q.question_text}
                onChange={(e) => handleQuestionChange(qIdx, "question_text", e.target.value)}
                placeholder="Enter the question text here..."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Option {String.fromCharCode(65 + oIdx)}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correct_option_index === oIdx}
                        onChange={() => handleQuestionChange(qIdx, "correct_option_index", oIdx)}
                        title="Mark as correct option"
                        className="text-blue-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
            Publish Test <CheckCircle2 size={16} className="ml-1.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
