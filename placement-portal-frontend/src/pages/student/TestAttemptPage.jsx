import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { 
  ShieldCheck, 
  Clock, 
  Volume2, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Bookmark,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Camera,
  EyeOff
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import { showError, showSuccess } from "../../utils/swal";

export default function TestAttemptPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));

  // If passed in navigation state, use it; otherwise fetch active attempt from API
  const navAttemptData = location.state?.attemptData;

  const { data: fetchedAttemptData, isLoading: isFetchingAttempt } = useQuery({
    queryKey: ["test-attempt-start", id],
    queryFn: () => testApi.startAttempt(id).then((res) => res.data),
    enabled: !navAttemptData && !!id,
  });

  const attemptData = navAttemptData || fetchedAttemptData;
  const attemptId = attemptData?.attempt_id;
  const questions = attemptData?.questions || [];
  const durationMinutes = attemptData?.duration_minutes || 30;
  const testTitle = attemptData?.title || "Placement Qualifying Test";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visited, setVisited] = useState(new Set([0]));
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(durationMinutes * 60);

  const [strikeCount, setStrikeCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [latestWarning, setLatestWarning] = useState(null);
  const [autoEnded, setAutoEnded] = useState(false);
  const [currentDb, setCurrentDb] = useState(22);
  const [cameraActive, setCameraActive] = useState(false);
  const [headposeStatus, setHeadposeStatus] = useState("centered"); // "centered", "away", "missing"
  const [headposeDirection, setHeadposeDirection] = useState("Centered (OK)");

  const lastNoiseStrikeTime = useRef(0);
  const lastNoFaceStrikeTime = useRef(0);
  const lastFaceAwayStrikeTime = useRef(0);

  // 1. Shared Final Submit Handler
  const handleFinalSubmit = useCallback(async (isAuto = false) => {
    if (!attemptId) return;
    try {
      await testApi.submitAttempt(attemptId);
      if (!isAuto) {
        showSuccess("Test Submitted!", "Your test responses have been graded.");
      }
      navigate(`/student/tests/${attemptId}/results`, { replace: true });
    } catch (err) {
      showError("Submission Error", err.response?.data?.detail || "Error submitting test.");
    }
  }, [attemptId, navigate]);

  // 2. Shared Violation Report Handler
  const reportViolation = useCallback(async (violationType, meta = {}) => {
    if (!attemptId || autoEnded) return;
    try {
      const res = await testApi.logViolation(attemptId, violationType, meta);
      const { strike_number, global_total, auto_ended: isEnded, ended_reason, category_counts } = res.data;

      setStrikeCount(global_total);
      if (category_counts) {
        setCategoryCounts(category_counts);
      }
      
      let msg = "";
      if (violationType === "tab_switch") {
        msg = `Warning (Strike ${strike_number} of 3 in Tab Switching): Exiting tab/fullscreen is prohibited.`;
      } else if (violationType === "copy_attempt") {
        msg = `Warning (Strike ${strike_number} of 3 in Copying): Copying text is disabled.`;
      } else if (violationType === "devtools") {
        msg = `Warning (Strike ${strike_number} of 3 in DevTools): Shortcut/inspection key blocked.`;
      } else if (violationType === "noise") {
        msg = `Warning (Strike ${strike_number} of 3 in Noise): Background noise reached ${meta.noise_db || 42} dB (Safe limit: 30 dB, Max limit: 40 dB).`;
      } else if (violationType === "no_face") {
        msg = `Warning (Strike ${strike_number} of 3 in Camera): Face not visible or camera covered. Stay in camera frame.`;
      } else if (violationType === "face_away") {
        msg = `Warning (Strike ${strike_number} of 3 in Headpose): Looking away from test screen detected. Stay focused.`;
      }

      setLatestWarning(msg);

      if (isEnded) {
        setAutoEnded(true);
        showError(
          "Test Auto-Ended & Submitted",
          "Your test attempt has been force-ended and auto-submitted due to proctoring violation limits (3 strikes in a category or 5 total strikes)."
        );

        try {
          await testApi.submitAttempt(attemptId);
        } catch (e) {
          console.warn("Auto-submit attempt error:", e);
        }

        setTimeout(() => {
          navigate(`/student/tests/${attemptId}/results`, { replace: true });
        }, 1800);
      }
    } catch (e) {
      console.error("Violation report error:", e);
    }
  }, [attemptId, autoEnded, navigate]);

  // 3. Timer Countdown Anchored to Server ends_at
  useEffect(() => {
    if (!attemptData?.ends_at) return;
    const endsAtTime = new Date(attemptData.ends_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endsAtTime - now) / 1000));
      setTimeLeftSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        handleFinalSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptData, handleFinalSubmit]);

  // 4. Heartbeat Ping every 15s
  useEffect(() => {
    if (!attemptId || autoEnded) return;
    const hbInterval = setInterval(() => {
      testApi.sendHeartbeat(attemptId).catch(() => {});
    }, 15000);

    return () => clearInterval(hbInterval);
  }, [attemptId, autoEnded]);

  // 5. Webcam & Microphone Stream + Real-Time Noise & Headpose Analysis
  useEffect(() => {
    if (autoEnded) return;

    let mediaStream;
    let audioCtx;
    let analyser;
    let animFrameId;
    let headposeTimerId;

    async function initMediaProctoring() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true,
        });

        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        // A. Web Audio Noise Detection
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;

        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function detectAudioLevel() {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const db = Math.min(100, Math.max(15, Math.round(15 + (rms / 255) * 75)));
          setCurrentDb(db);

          if (db > 40) {
            const nowMs = Date.now();
            if (nowMs - lastNoiseStrikeTime.current > 6000) {
              lastNoiseStrikeTime.current = nowMs;
              reportViolation("noise", { noise_db: db, safe_limit: 30, max_limit: 40 });
            }
          }

          animFrameId = requestAnimationFrame(detectAudioLevel);
        }

        detectAudioLevel();

        // B. Real-Time Video Frame Headpose & Skin-Tone Face Presence Analysis
        const canvas = canvasRef.current;
        canvas.width = 80;
        canvas.height = 60;
        const ctx = canvas.getContext("2d");

        headposeTimerId = setInterval(() => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;

          ctx.drawImage(videoRef.current, 0, 0, 80, 60);
          const frame = ctx.getImageData(0, 0, 80, 60);
          const pixels = frame.data;

          let totalBrightness = 0;
          let skinPixelCount = 0;
          let skinSumX = 0;
          let skinSumY = 0;
          const brightnessValues = [];

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const avg = (r + g + b) / 3;
            totalBrightness += avg;
            brightnessValues.push(avg);

            // Skin tone & facial pixel color space condition
            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            const isSkin =
              r > 50 &&
              g > 30 &&
              b > 20 &&
              r > g &&
              r > b &&
              maxRGB - minRGB > 15;

            if (isSkin) {
              const pixelIdx = i / 4;
              const x = pixelIdx % 80;
              const y = Math.floor(pixelIdx / 80);
              skinSumX += x;
              skinSumY += y;
              skinPixelCount++;
            }
          }

          const avgBrightness = totalBrightness / (80 * 60);

          // Compute standard deviation of brightness to detect uniform blank wall
          const variance =
            brightnessValues.reduce((sq, n) => sq + Math.pow(n - avgBrightness, 2), 0) /
            brightnessValues.length;
          const stdDev = Math.sqrt(variance);

          // 1. Skin-tone Bounding Centroid (X_skin, Y_skin)
          const centerX_skin = skinSumX / skinPixelCount;
          const centerY_skin = skinSumY / skinPixelCount;

          // 2. Facial Features Centroid (Eyes, Eyebrows, Pupils, Nostrils, Mouth)
          let featSumX = 0;
          let featSumY = 0;
          let featCount = 0;

          // Also measure Left vs Right dark feature count
          let leftFeat = 0;
          let rightFeat = 0;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const avg = (r + g + b) / 3;

            const pixelIdx = i / 4;
            const x = pixelIdx % 80;
            const y = Math.floor(pixelIdx / 80);

            // Dark facial features (contrast < 80% of average frame brightness)
            if (avg < avgBrightness * 0.8) {
              // Within face region around skin centroid
              if (Math.abs(x - centerX_skin) <= 22 && Math.abs(y - centerY_skin) <= 22) {
                featSumX += x;
                featSumY += y;
                featCount++;

                if (x < centerX_skin) leftFeat++;
                if (x > centerX_skin) rightFeat++;
              }
            }
          }

          // Centroid of dark facial features
          const centerX_feat = featCount > 10 ? featSumX / featCount : centerX_skin;
          const centerY_feat = featCount > 10 ? featSumY / featCount : centerY_skin;

          // 3. Directional Vector Calculations
          // Horizontal Offset: ΔX = Feature Center X - Skin Center X
          // Vertical Offset: ΔY = Feature Center Y - Skin Center Y
          const deltaX = centerX_feat - centerX_skin;
          const deltaY = centerY_feat - centerY_skin;

          // Asymmetry Ratio
          const minF = Math.min(leftFeat, rightFeat) || 1;
          const maxF = Math.max(leftFeat, rightFeat);
          const featAsymmetry = maxF / minF;

          const nowMs = Date.now();

          // Rule 1: No Face Detected / Blank Wall / Camera Covered
          if (skinPixelCount < 120 || stdDev < 9 || avgBrightness < 12) {
            setHeadposeDirection("Not Visible ❌");
            setHeadposeStatus("missing");
            if (nowMs - lastNoFaceStrikeTime.current > 3500) {
              lastNoFaceStrikeTime.current = nowMs;
              reportViolation("no_face", {
                reason: "No face detected in camera frame",
                skin_pixels: skinPixelCount,
              });
            }
          } else {
            // Rule 2: Directional Gaze & Head Orientation Detection
            let detectedDir = "Centered (OK)";

            // Mirror correction (camera stream is flipped scale-x-[-1])
            if (deltaX > +2.0 || (featAsymmetry > 2.0 && leftFeat > rightFeat)) {
              detectedDir = "Looking Left ⚠️";
            } else if (deltaX < -2.0 || (featAsymmetry > 2.0 && rightFeat > leftFeat)) {
              detectedDir = "Looking Right ⚠️";
            } else if (deltaY < -2.4) {
              detectedDir = "Looking Up ⚠️";
            } else if (deltaY > +2.6) {
              detectedDir = "Looking Down ⚠️";
            } else if (centerX_skin < 24 || centerX_skin > 56 || centerY_skin < 10 || centerY_skin > 46) {
              detectedDir = "Off Center ⚠️";
            }

            setHeadposeDirection(detectedDir);

            if (detectedDir !== "Centered (OK)") {
              setHeadposeStatus("away");
              if (nowMs - lastFaceAwayStrikeTime.current > 3000) {
                lastFaceAwayStrikeTime.current = nowMs;
                reportViolation("face_away", {
                  reason: `Head or gaze turned away: ${detectedDir}`,
                  direction: detectedDir,
                  delta_x: Number(deltaX.toFixed(2)),
                  delta_y: Number(deltaY.toFixed(2)),
                });
              }
            } else {
              setHeadposeStatus("centered");
            }
          }
        }, 300);
      } catch (err) {
        console.warn("Webcam & Mic proctoring stream access warning:", err);
        setCameraActive(false);
      }
    }

    initMediaProctoring();

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (headposeTimerId) clearInterval(headposeTimerId);
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [autoEnded, attemptId, reportViolation]);

  // 6. Browser Lockdown Detectors (Tab-switch, Copy, DevTools)
  useEffect(() => {
    if (autoEnded) return;

    const handleVisibility = () => {
      if (document.hidden) {
        reportViolation("tab_switch", { trigger: "visibility_hidden" });
      }
    };

    const handleBlur = () => {
      reportViolation("tab_switch", { trigger: "window_blur" });
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        reportViolation("tab_switch", { trigger: "fullscreen_exit" });
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      reportViolation("copy_attempt", { selection: window.getSelection()?.toString().length });
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      reportViolation("devtools", { trigger: "context_menu" });
    };

    const handleKeyDown = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        reportViolation("devtools", { trigger: e.key });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attemptId, autoEnded, reportViolation]);

  // Handle Question Navigation
  const goToQuestion = (idx) => {
    setCurrentIndex(idx);
    setVisited((prev) => new Set([...prev, idx]));
  };

  const currentQ = questions[currentIndex] || {};
  const selectedOption = answers[currentIndex];

  const handleSelectOption = (optIdx) => {
    const updated = { ...answers, [currentIndex]: optIdx };
    setAnswers(updated);
    if (attemptId) {
      testApi.autosaveAnswer(attemptId, currentIndex, optIdx).catch(() => {});
    }
  };

  const toggleMarkForReview = () => {
    const next = new Set(markedForReview);
    if (next.has(currentIndex)) {
      next.delete(currentIndex);
    } else {
      next.add(currentIndex);
    }
    setMarkedForReview(next);
  };

  // Timer Calculations for SVG Ring
  const totalSeconds = durationMinutes * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - timeLeftSeconds) / totalSeconds) * 100));
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isFetchingAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!attemptData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-4 shadow-md">
          <p className="text-slate-700 font-semibold">No active test session found.</p>
          <button
            onClick={() => navigate(`/student/tests`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700"
          >
            Back to Tests Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden select-none bg-gradient-to-br from-[#E8F1FF] via-[#EAFBF3] to-[#F1EEFF] p-4 sm:p-6 font-sans">
      {/* Background Ambient Glass Blobs */}
      <div className="absolute top-[-120px] left-[-100px] w-[380px] h-[380px] rounded-full bg-[#93C5FD] blur-[70px] opacity-55 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-80px] w-[320px] h-[320px] rounded-full bg-[#6EE7B7] blur-[70px] opacity-55 pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[260px] h-[260px] rounded-full bg-[#C4B5FD] blur-[70px] opacity-40 pointer-events-none" />

      {/* Main Glass Container */}
      <div className="max-w-7xl mx-auto space-y-4 relative z-10">
        {/* Top Control Bar */}
        <div className="bg-white/45 backdrop-blur-[24px] border border-white/60 rounded-[20px] p-4 shadow-[0_8px_32px_rgba(31,41,55,0.08)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Status Pill */}
            <div className="flex items-center gap-2 bg-white/60 border border-white/70 backdrop-blur-[10px] px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.15)] animate-pulse" />
              <span className="text-xs font-semibold text-emerald-900">Monitoring Active</span>
            </div>

            <div className="hidden sm:block h-5 w-[1px] bg-slate-300" />
            <h1 className="text-base font-bold text-slate-900 font-heading truncate max-w-xs sm:max-w-md">
              {testTitle}
            </h1>
          </div>

          {/* Right Header Controls: Timer Ring + Submit */}
          <div className="flex items-center space-x-4">
            {/* Circular Timer Ring */}
            <div className="flex items-center space-x-2">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" className="fill-none stroke-blue-600/15 stroke-[5]" />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="fill-none stroke-blue-600 stroke-[5] stroke-linecap-round transition-all duration-1000"
                    strokeDasharray="151"
                    strokeDashoffset={151 - (151 * progressPercent) / 100}
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-blue-700 font-mono">
                  {formatTime(timeLeftSeconds)}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleFinalSubmit(false)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Amber Violation Alert Banner */}
        {latestWarning && (
          <div className="bg-amber-500/20 border border-amber-500/40 backdrop-blur-[8px] p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium animate-bounce">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{latestWarning}</span>
          </div>
        )}

        {/* 2-Column Split Exam Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 75% Column: Question Card & Options */}
          <div className="lg:col-span-8 bg-white/45 backdrop-blur-[24px] border border-white/60 rounded-[28px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(31,41,55,0.08)] space-y-6">
            {/* Question Meta Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                Question {currentIndex + 1} of {questions.length} · {currentQ.category || "General"}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                +{currentQ.marks || 1} Mark
              </span>
            </div>

            {/* Question Text Heading */}
            <h2 className="text-xl font-semibold text-slate-900 font-heading leading-snug">
              {currentQ.question_text}
            </h2>

            {/* Answer Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.options?.map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer text-sm font-medium ${
                      isSelected
                        ? "bg-blue-600/14 border-blue-600/40 text-blue-800 font-semibold shadow-sm"
                        : "bg-white/40 border-white/70 text-slate-800 hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span>{opt}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                  </div>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200/50">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleMarkForReview}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    markedForReview.has(currentIndex)
                      ? "bg-amber-500/20 text-amber-900 border-amber-500/40 font-bold"
                      : "bg-white/50 text-slate-700 border-slate-200 hover:bg-white"
                  }`}
                >
                  <Bookmark size={14} />
                  <span>{markedForReview.has(currentIndex) ? "Marked" : "Mark for Review"}</span>
                </button>

                {selectedOption !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...answers };
                      delete updated[currentIndex];
                      setAnswers(updated);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white/50 border border-slate-200 hover:bg-white"
                  >
                    <RotateCcw size={13} />
                    <span>Clear Choice</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => goToQuestion(currentIndex - 1)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white/50 text-slate-700 text-xs font-bold disabled:opacity-40 flex items-center gap-1 hover:bg-white"
                >
                  <ArrowLeft size={14} /> Prev
                </button>
                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => goToQuestion(currentIndex + 1)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1 hover:bg-blue-700 shadow-sm"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right 25% Column: Webcam Feed, Question Palette & Live Noise Meter */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Proctoring Webcam Stream Box */}
            <div className="bg-white/45 backdrop-blur-[24px] border border-white/60 rounded-[24px] p-3 shadow-[0_8px_32px_rgba(31,41,55,0.08)] space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-[4/3] shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-xl scale-x-[-1]"
                />
                
                {/* Live Feed Status Pill */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-medium border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Feed</span>
                </div>

                {/* Headpose Status Overlay */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-mono">
                  <span>Headpose:</span>
                  <span className={`font-bold capitalize ${
                    headposeStatus === "centered"
                      ? "text-emerald-400"
                      : headposeStatus === "away"
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}>
                    {headposeDirection}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Noise Meter Bar */}
            <div className="bg-white/45 backdrop-blur-[24px] border border-white/60 rounded-[20px] p-4 shadow-[0_8px_32px_rgba(31,41,55,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className={`w-4 h-4 ${currentDb > 40 ? "text-red-600 animate-bounce" : currentDb > 30 ? "text-amber-600" : "text-emerald-600"}`} />
                  <span className="text-xs text-slate-700 font-semibold">Microphone Noise</span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                  currentDb <= 30
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : currentDb <= 40
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}>
                  {currentDb} dB {currentDb <= 30 ? "(Safe ≤30)" : currentDb <= 40 ? "(Warning ≤40)" : "(Limit >40)"}
                </span>
              </div>

              <div className="w-full h-2 bg-white/60 border border-white/80 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    currentDb <= 30 ? "bg-emerald-500" : currentDb <= 40 ? "bg-amber-500" : "bg-red-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (currentDb / 70) * 100))}%` }}
                />
              </div>
            </div>

            {/* Question Palette Grid Card */}
            <div className="bg-white/45 backdrop-blur-[24px] border border-white/60 rounded-[28px] p-5 shadow-[0_8px_32px_rgba(31,41,55,0.08)] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                <h3 className="text-sm font-bold text-slate-900 font-heading">Question Palette</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {Object.keys(answers).length} / {questions.length} Answered
                </span>
              </div>

              {/* Numbered Palette Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAns = answers[idx] !== undefined;
                  const isRev = markedForReview.has(idx);
                  const isCurr = currentIndex === idx;

                  let bgClass = "bg-white/60 text-slate-700 border-slate-200/70";
                  if (isAns && isRev) {
                    bgClass = "bg-purple-600 text-white font-bold border-purple-700";
                  } else if (isAns) {
                    bgClass = "bg-emerald-600 text-white font-bold border-emerald-700";
                  } else if (isRev) {
                    bgClass = "bg-amber-500 text-white font-bold border-amber-600";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center ${bgClass} ${
                        isCurr ? "ring-2 ring-blue-600 ring-offset-1 scale-105" : "hover:scale-105"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Palette Color Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-200/50">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-white/80 border border-slate-300 inline-block" />
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                  <span>Review</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-600 inline-block" />
                  <span>Ans & Review</span>
                </div>
              </div>

              {/* Security Audit Badge (Expandable on touch/click) */}
              <div className="pt-2">
                <div 
                  onClick={() => setIsAuditExpanded(!isAuditExpanded)}
                  className="p-3 bg-slate-900/90 text-white rounded-xl text-xs space-y-2 cursor-pointer hover:bg-slate-900 transition-all border border-slate-800 shadow-md select-none"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck size={14} className={strikeCount > 0 ? "text-amber-400" : "text-emerald-400"} />
                      <span>Proctoring Audit</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isAuditExpanded ? "rotate-180" : ""}`} />
                    </div>
                    <span className={`font-bold ${strikeCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {strikeCount} / 5 Strikes
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strikeCount >= 4 ? "bg-red-500" : strikeCount >= 2 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${(strikeCount / 5) * 100}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium">
                    {isAuditExpanded ? "Tap to collapse breakdown" : "Tap / click to expand violation breakdown"}
                  </p>

                  {isAuditExpanded && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>🔀 Tab Switching / Blur</span>
                        <span className="font-bold text-amber-400">{categoryCounts.tab_switch || 0} / 3</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>📋 Copy Text Attempt</span>
                        <span className="font-bold text-amber-400">{categoryCounts.copy_attempt || 0} / 3</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>🛠️ DevTools / Shortcuts</span>
                        <span className="font-bold text-amber-400">{categoryCounts.devtools || 0} / 3</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>🔊 Noise Level Exceeded</span>
                        <span className="font-bold text-amber-400">{categoryCounts.noise || 0} / 3</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>📷 Face Not Visible / Covered</span>
                        <span className="font-bold text-amber-400">{categoryCounts.no_face || 0} / 3</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>👤 Headpose Looking Away</span>
                        <span className="font-bold text-amber-400">{categoryCounts.face_away || 0} / 3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
