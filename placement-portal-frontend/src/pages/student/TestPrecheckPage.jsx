import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { 
  ShieldCheck, 
  Maximize, 
  Camera, 
  Mic, 
  CheckCircle2, 
  XCircle, 
  Play,
  AlertCircle
} from "lucide-react";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import { showError } from "../../utils/swal";

export default function TestPrecheckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [fullscreenOk, setFullscreenOk] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [stream, setStream] = useState(null);
  const [checking, setChecking] = useState(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test-detail", id],
    queryFn: () => testApi.getTestDetails(id).then((res) => res.data),
  });

  const startMutation = useMutation({
    mutationFn: () => testApi.startAttempt(id),
    onSuccess: (res) => {
      navigate(`/student/tests/${id}/attempt`, {
        state: { attemptData: res.data },
        replace: true,
      });
    },
    onError: (err) => {
      showError(
        "Cannot Start Test",
        err.response?.data?.detail || "Could not initialize test session."
      );
    },
  });

  const runSystemChecks = async () => {
    setChecking(true);
    let fsOk = false;
    let camOk = false;
    let audioOk = false;

    // 1. Fullscreen Check
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenOk(true);
      fsOk = true;
    } catch (e) {
      setFullscreenOk(false);
    }

    // 2. Camera & Mic Check
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      setCameraOk(true);
      setMicOk(true);
      camOk = true;
      audioOk = true;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        showError("Permission Blocked", "Camera/Microphone access was blocked. Please allow permissions in browser address bar.");
      } else if (err.name === "NotFoundError") {
        showError("No Camera/Mic", "No camera or microphone hardware found on your device.");
      } else {
        showError("Device Error", err.message || "Failed to access camera and microphone.");
      }
    } finally {
      setChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  const allPassed = fullscreenOk && cameraOk && micOk;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <ShieldCheck size={16} /> Environment Security Precheck
          </div>
          <h1 className="text-xl font-bold font-heading mt-1">{test?.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Duration: {test?.duration_minutes} Minutes · Passing Score: {test?.min_passing_marks} Marks
          </p>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle size={14} /> Mandatory Proctoring System Check
            </p>
            <p>
              This test requires active proctoring. You must allow Fullscreen mode, Camera, and Microphone before beginning.
            </p>
          </div>

          {/* 3 Status Rows */}
          <div className="space-y-3">
            {/* Fullscreen Row */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg text-slate-700 shadow-sm border border-slate-100">
                  <Maximize size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Fullscreen Mode</p>
                  <p className="text-xs text-slate-500">Locks window to prevent distraction</p>
                </div>
              </div>
              {fullscreenOk ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={14} /> Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              )}
            </div>

            {/* Camera Row */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg text-slate-700 shadow-sm border border-slate-100">
                  <Camera size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Webcam Feed</p>
                  <p className="text-xs text-slate-500">Monitors face presence during test</p>
                </div>
              </div>
              {cameraOk ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={14} /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              )}
            </div>

            {/* Microphone Row */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg text-slate-700 shadow-sm border border-slate-100">
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Microphone Input</p>
                  <p className="text-xs text-slate-500">Monitors ambient room noise levels</p>
                </div>
              </div>
              {micOk ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={14} /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Camera Preview Thumbnail */}
          {stream && (
            <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Camera Preview Feed</span>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-24 h-16 object-cover rounded-lg border border-slate-700 bg-black"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!allPassed ? (
              <Button
                variant="primary"
                className="w-full justify-center py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700"
                onClick={runSystemChecks}
                isLoading={checking}
              >
                Run System Checks & Grant Permissions
              </Button>
            ) : (
              <Button
                variant="success"
                className="w-full justify-center py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                onClick={() => startMutation.mutate()}
                isLoading={startMutation.isPending}
              >
                <Play size={16} /> Start Proctored Test Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
