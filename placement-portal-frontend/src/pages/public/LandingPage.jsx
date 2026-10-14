import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Search,
  ExternalLink,
  ChevronDown,
  Code2,
  FileText,
  Calendar,
  Layers,
  Award,
  Zap,
  BarChart3,
  Sliders,
  Play,
  RotateCcw,
  Check,
  Copy,
  Terminal,
  Activity,
  Globe,
  Star,
  GraduationCap,
  Lock,
  ArrowUpRight,
  Menu,
  X,
  Radio,
  Volume2,
  Mic,
  Video,
  VideoOff,
  Send,
  Bell,
  Smartphone,
  Mail,
  MessageSquare,
  Trash2,
  Plus,
  Wand2,
  SlidersHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATION HELPERS (Apple & Linear Caliber Kinetic Typography & Transitions)
   ═══════════════════════════════════════════════════════════════════════════ */

// Kinetic hardware-accelerated word-by-word reveal for headlines (60/120fps GPU)
function AnimatedWords({ text, className = "", delay = 0, isGradient = false }) {
  // If this text contains gradient classes or isGradient flag is true, render directly as a single kinetic phrase
  // to avoid CSS background-clip breakdown on nested child inline-block elements.
  const hasGradient =
    isGradient ||
    className.includes("bg-clip-text") ||
    className.includes("text-transparent");

  if (hasGradient) {
    return (
      <motion.span
        className={`inline-block will-change-transform ${className}`}
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    );
  }

  const words = text.split(" ");
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.025, delayChildren: delay } },
        hidden: {},
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em] will-change-transform"
          variants={{
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            },
            hidden: {
              opacity: 0,
              y: 14,
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Smooth scroll reveal wrapper for blocks & containers
function RevealOnScroll({ children, className = "", delay = 0, y = 28 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for card grids
function StaggerGrid({ children, className = "", staggerDelay = 0.08 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

// Stagger child card with interactive hover lift
function StaggerCard({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      variants={{
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
        hidden: { opacity: 0, y: 24 },
      }}
      whileHover={{
        y: -5,
        boxShadow: "0 20px 30px -10px rgba(37, 99, 235, 0.09)",
        transition: { duration: 0.2, ease: "easeOut" },
      }}
    >
      {children}
    </motion.div>
  );
}

// Smooth Animated Number Counter for Stats & KPIs
function AnimatedCounter({ target, suffix = "", prefix = "" }) {
  const [displayVal, setDisplayVal] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  useEffect(() => {
    if (!isInView) return;
    const str = target.toString();
    const numeric = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = numeric * ease;

      if (str.includes(".")) {
        setDisplayVal(current.toFixed(1));
      } else {
        setDisplayVal(Math.round(current));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {isInView ? displayVal : 0}
      {suffix}
    </span>
  );
}

// Live High-Velocity Marquee Ticker Ribbon (CSS Hardware-Accelerated)
function LiveTickerRibbon({ className = "" }) {
  const items = [
    "🚀 Goldman Sachs: ₹26 LPA (6 Selected)",
    "✨ Microsoft: 12 Cloud Engineers Placed",
    "🏛️ BVM Engineering: 89% Readiness Score",
    "🛡️ 99.4% Anti-Cheating Integrity Verified",
    "💼 TCS Digital: 84 Offers Released",
    "📊 NBA & NAAC 1-Click Placement Audit Ready",
    "⚡ 450+ Campus Drives Automated This Season",
    "🎯 Google: ₹34 LPA SDE Shortlists Active",
    "🎓 120,000+ Students Screened Nationwide",
  ];

  return (
    <div className={`py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden shadow-inner border-y border-blue-900/40 relative select-none ${className}`}>
      <div className="flex items-center gap-10 whitespace-nowrap text-xs font-mono tracking-wider uppercase font-semibold animate-marquee will-change-transform">
        {[...items, ...items].map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-blue-400 font-bold">{item}</span>
            <span className="text-slate-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Live Radar Section Milestone Header
function RadarBadge({ code, text }) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
        </span>
        <span className="text-5xl sm:text-6xl font-black font-mono text-blue-600 tracking-tighter">
          #{code}
        </span>
      </div>
      <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
        {text}
      </div>
    </div>
  );
}

// Audio Waveform Visualizer for AI Studio
function AudioWaveform() {
  return (
    <div className="flex items-center gap-1 h-6">
      {[12, 22, 14, 26, 8, 18, 28, 14, 24, 16, 26, 10, 20, 15].map((h, i) => (
        <motion.div
          key={i}
          animate={{
            height: [h * 0.3, h, h * 0.4],
          }}
          transition={{
            duration: 0.7 + (i % 5) * 0.18,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="w-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-full"
        />
      ))}
    </div>
  );
}

// Proctor HUD Simulation Box with Live Webcam Stream support
function ProctorHUD({ liveWebcam, onToggleWebcam }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    if (liveWebcam && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          // If camera permission blocked or unavailable, gracefully retain HUD
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [liveWebcam]);

  return (
    <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 font-mono text-[11px] space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>AI PROCTOR HUD • 1080P PROCTORING</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleWebcam}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              liveWebcam
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            {liveWebcam ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
            {liveWebcam ? "Disable Cam" : "Enable Live Cam"}
          </button>
          <span className="text-emerald-400 font-bold">ANTI-CHEAT: 99.8%</span>
        </div>
      </div>

      {/* Live Video with Biometric Face Tracking Overlay */}
      {liveWebcam && (
        <div className="relative h-32 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          {/* Facial Landmark Tracking HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-emerald-500/40 m-2 rounded-lg flex items-center justify-center">
            <div className="w-20 h-24 border border-dashed border-emerald-400/80 rounded-full animate-pulse flex items-center justify-center">
              <span className="text-[9px] text-emerald-400 font-mono font-bold bg-black/60 px-1 rounded">
                [ + FACE LOCK ]
              </span>
            </div>
            <span className="absolute top-1.5 left-2 text-[9px] text-emerald-400 font-mono font-bold">
              GAZE: 0° CENTER
            </span>
            <span className="absolute bottom-1.5 right-2 text-[9px] text-emerald-400 font-mono font-bold">
              FPS: 30.2
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-1.5 rounded bg-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400">Eye Gaze:</span>
          <span className="text-emerald-400 font-bold">Screen Locked (0° Dev)</span>
        </div>
        <div className="p-1.5 rounded bg-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400">Facial Mesh:</span>
          <span className="text-emerald-400 font-bold">1 Candidate Verified</span>
        </div>
        <div className="p-1.5 rounded bg-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400">Tab Switch:</span>
          <span className="text-emerald-400 font-bold">0 Violations</span>
        </div>
        <div className="p-1.5 rounded bg-slate-800/80 flex items-center justify-between">
          <span className="text-slate-400">Room Audio:</span>
          <span className="text-emerald-400 font-bold">0dB Clean (No Echo)</span>
        </div>
      </div>
    </div>
  );
}

// Rotating feature badge in hero
function RotatingHeroBadge() {
  const messages = [
    "✨ 450+ Campus Drives Hosted",
    "🛡️ 99.4% Anti-Cheating Integrity",
    "🏛️ Multi-Tenant Institutional Isolation",
    "📊 Instant NBA & NAAC Audit Reports",
    "🚀 Zero Spreadsheet Chaos",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="h-7 overflow-hidden inline-flex items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full shadow-2xs flex items-center gap-1.5"
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAMPUS BENCHMARK & READINESS KNOWLEDGE BASE
   ═══════════════════════════════════════════════════════════════════════════ */
const COLLEGE_DATABASE = {
  "bvmengineering.ac.in": {
    domain: "bvmengineering.ac.in",
    name: "Birla Vishvakarma Mahavidyalaya (BVM)",
    badge: "✓ NAAC A+ • NBA ACCREDITED",
    students: "1,420 Eligible Candidates",
    readiness: 88,
    activeDrives: 26,
    recruiters: 18,
    avgPackage: "₹8.4 LPA",
    highestPackage: "₹18.0 LPA",
    topRoles: [
      { role: "Software Engineer (SDE I)", ctc: "₹18 LPA", diff: "16", intent: "Eligible (88% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "DevOps & Cloud Engineer", ctc: "₹14 LPA", diff: "24", intent: "Eligible (84% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Data Platform Architect", ctc: "₹22 LPA", diff: "18", intent: "Dream Tier", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
    insights: "88% core curriculum alignment with top 18 active tech recruiters.",
  },
  "iitb.ac.in": {
    domain: "iitb.ac.in",
    name: "IIT Bombay",
    badge: "✓ TIER-1 • INSTITUTE OF EMINENCE",
    students: "2,850 Eligible Candidates",
    readiness: 96,
    activeDrives: 64,
    recruiters: 42,
    avgPackage: "₹22.8 LPA",
    highestPackage: "₹54.0 LPA",
    topRoles: [
      { role: "AI Research Scientist", ctc: "₹42 LPA", diff: "8", intent: "Eligible (96% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Quantitative Strategist", ctc: "₹38 LPA", diff: "10", intent: "Eligible (94% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Distributed Systems SDE", ctc: "₹28 LPA", diff: "12", intent: "Dream Tier", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
    insights: "96% competitive coding readiness across global tech product firms.",
  },
  "coep.ac.in": {
    domain: "coep.ac.in",
    name: "COEP Technological University",
    badge: "✓ STATE AUTONOMOUS • NIRF TOP 50",
    students: "1,680 Eligible Candidates",
    readiness: 91,
    activeDrives: 38,
    recruiters: 28,
    avgPackage: "₹11.2 LPA",
    highestPackage: "₹32.0 LPA",
    topRoles: [
      { role: "Systems Engineer (Core)", ctc: "₹16 LPA", diff: "14", intent: "Eligible (91% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Cloud Platform SDE", ctc: "₹14 LPA", diff: "18", intent: "Eligible (89% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Automotive Embedded SDE", ctc: "₹12 LPA", diff: "20", intent: "Direct Gate", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
    insights: "91% core systems & embedded engineering readiness with 28 recruiters.",
  },
  "vjti.ac.in": {
    domain: "vjti.ac.in",
    name: "VJTI Mumbai",
    badge: "✓ MUMBAI UNIVERSITY • CENTURY OLD",
    students: "1,510 Eligible Candidates",
    readiness: 89,
    activeDrives: 32,
    recruiters: 24,
    avgPackage: "₹10.6 LPA",
    highestPackage: "₹28.0 LPA",
    topRoles: [
      { role: "FinTech Analyst (SDE)", ctc: "₹18 LPA", diff: "15", intent: "Eligible (89% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Full Stack Engineer", ctc: "₹12 LPA", diff: "22", intent: "Eligible (86% Match)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Data Science Associate", ctc: "₹15 LPA", diff: "17", intent: "Dream Tier", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
    insights: "89% readiness across Mumbai financial tech & banking campus drives.",
  },
};

function getCollegeProfile(inputDomain) {
  const clean = (inputDomain || "").trim().toLowerCase();
  if (COLLEGE_DATABASE[clean]) return COLLEGE_DATABASE[clean];

  for (const [key, data] of Object.entries(COLLEGE_DATABASE)) {
    if (clean.includes(key.split(".")[0])) return data;
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash << 5) - hash + clean.charCodeAt(i);
  const absHash = Math.abs(hash);

  const prefix = clean.split(".")[0] || "campus";
  const formattedName = prefix.charAt(0).toUpperCase() + prefix.slice(1) + " Engineering Institute";
  const readiness = 82 + (absHash % 12);
  const activeDrives = 20 + (absHash % 24);
  const recruiters = 14 + (absHash % 16);
  const avgPkg = (7.2 + (absHash % 70) / 10).toFixed(1);

  return {
    domain: clean || "campus.edu",
    name: formattedName,
    badge: "✓ VERIFIED ACCREDITED DOMAIN",
    students: `${(1000 + (absHash % 1200)).toLocaleString()} Eligible Candidates`,
    readiness,
    activeDrives,
    recruiters,
    avgPackage: `₹${avgPkg} LPA`,
    highestPackage: `₹${(parseFloat(avgPkg) * 2.2).toFixed(1)} LPA`,
    topRoles: [
      { role: "Software Engineer (SDE I)", ctc: `₹${(parseFloat(avgPkg) * 1.8).toFixed(0)} LPA`, diff: "16", intent: `Eligible (${readiness}% Match)`, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Cloud & DevOps SDE", ctc: `₹${(parseFloat(avgPkg) * 1.4).toFixed(0)} LPA`, diff: "22", intent: `Eligible (${readiness - 4}% Match)`, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
      { role: "Full Stack Engineer", ctc: `₹${avgPkg} LPA`, diff: "14", intent: "Direct Gate", color: "text-blue-600 bg-blue-50 border-blue-200" },
    ],
    insights: `${readiness}% curriculum readiness alignment across ${activeDrives} active campus drives.`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: INTERNBRIDGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user } = useAuth();
  const { scrollYProgress } = useScroll();

  const [activeNav, setActiveNav] = useState("how-it-works");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme State: Defaults to Obsidian Dark for high-contrast rich aesthetics
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("ib_landing_theme");
    return saved !== null ? saved === "dark" : true;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("ib_landing_theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Hero Domain Scanner State
  const [collegeQuery, setCollegeQuery] = useState("bvmengineering.ac.in");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(COLLEGE_DATABASE["bvmengineering.ac.in"]);

  // Active selected node in Hero Network Topology
  const [activeGraphNode, setActiveGraphNode] = useState("campus");

  // Section #63 Scatter Map & Calendar State
  const [selectedScatterFilter, setSelectedScatterFilter] = useState("all");
  const [hoveredCompany, setHoveredCompany] = useState(null);
  const [calendarToast, setCalendarToast] = useState(null);
  const [calendarSlots, setCalendarSlots] = useState([
    { week: 1, company: "Google", role: "SDE I", ctc: "₹34 LPA", tier: "Super Dream" },
    { week: 2, company: "Microsoft", role: "Cloud Dev", ctc: "₹28 LPA", tier: "Super Dream" },
    { week: 4, company: "TCS Digital", role: "Sys Analyst", ctc: "₹9 LPA", tier: "Core" },
  ]);

  const handleAddCompanyToCalendar = (co) => {
    const existing = calendarSlots.find((s) => s.company.toLowerCase() === co.name.toLowerCase());
    if (existing) {
      setCalendarToast(`"${co.name}" is already scheduled in Week ${existing.week}`);
      setTimeout(() => setCalendarToast(null), 3000);
      return;
    }
    const usedWeeks = new Set(calendarSlots.map((s) => s.week));
    let targetWeek = 1;
    while (usedWeeks.has(targetWeek) && targetWeek <= 8) {
      targetWeek++;
    }
    setCalendarSlots((prev) => [
      ...prev,
      { week: targetWeek, company: co.name, role: co.role, ctc: co.ctc, tier: co.tier, isNew: true },
    ].sort((a, b) => a.week - b.week));
    setCalendarToast(`✓ Scheduled ${co.name} (${co.ctc}) into Week ${targetWeek}!`);
    setTimeout(() => setCalendarToast(null), 3200);
  };

  const handleRemoveCalendarSlot = (week) => {
    setCalendarSlots((prev) => prev.filter((s) => s.week !== week));
  };

  // Section #47 AI Interview Studio State
  const [interviewTopic, setInterviewTopic] = useState("dsa");
  const [userAnswer, setUserAnswer] = useState(
    "To optimize Dijkstra's algorithm for dense graphs with over 100,000 vertices, we can utilize a Fibonacci heap or indexed priority queue with adjacency lists, reducing the relaxation complexity to O(V log V + E)."
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgressText, setEvalProgressText] = useState("");
  const [evalResult, setEvalResult] = useState({
    score: 94,
    accuracy: "Optimal (96%)",
    clarity: "STAR Technique Verified",
    proctorStatus: "Verified — 0 Anomalies",
    tip: "Include space complexity bounds when partitioning graph memory.",
  });
  const [showJsonSchema, setShowJsonSchema] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveWebcamActive, setLiveWebcamActive] = useState(false);

  // Toggle voice recognition
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is supported in Chrome, Edge, and modern browsers.");
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Speak question prompt aloud via SpeechSynthesis
  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Section #29 Drive Dispatcher State
  const [selectedRecruiter, setSelectedRecruiter] = useState("Google");
  const [driveStage, setDriveStage] = useState("Open");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [minCgpaCutoff, setMinCgpaCutoff] = useState(7.5);
  const [selectedBranches, setSelectedBranches] = useState(["IT", "CE", "ECE"]);
  const [showDriveFilters, setShowDriveFilters] = useState(false);
  const [broadcastMetrics, setBroadcastMetrics] = useState({ app: 340, email: 340, whatsapp: 338 });

  const eligibleStudentCount = useMemo(() => {
    const branchMultiplier = selectedBranches.length / 5;
    const cgpaMultiplier = Math.max(0.12, (10 - minCgpaCutoff) / 3.2);
    return Math.min(1420, Math.round(1420 * branchMultiplier * cgpaMultiplier));
  }, [minCgpaCutoff, selectedBranches]);

  // Section #09 ROI Calculator State
  const [batchSize, setBatchSize] = useState(650);
  const [drivesCount, setDrivesCount] = useState(40);
  const [hoursPerDrive, setHoursPerDrive] = useState(15);

  // Section #04 Free Tools State
  const [activeTool, setActiveTool] = useState("ats");
  const [resumeText, setResumeText] = useState(
    "Architected high-throughput microservices using FastAPI, Redis caching, and PostgreSQL; reduced API latency by 44% across 120,000 daily active requests."
  );
  const [atsScore, setAtsScore] = useState(92);
  const [cgpaInput, setCgpaInput] = useState(8.8);
  const [branchInput, setBranchInput] = useState("Information Technology");

  // Keywords analysis for ATS Resume Checker
  const powerKeywords = ["FastAPI", "Redis", "PostgreSQL", "Docker", "AWS", "Kubernetes", "CI/CD", "Python", "Microservices", "REST API"];
  const detectedKeywords = useMemo(() => {
    return powerKeywords.filter((kw) => resumeText.toLowerCase().includes(kw.toLowerCase()));
  }, [resumeText]);
  const missingKeywords = useMemo(() => {
    return powerKeywords.filter((kw) => !resumeText.toLowerCase().includes(kw.toLowerCase()));
  }, [resumeText]);

  const handleAddKeyword = (kw) => {
    setResumeText((prev) => `${prev.trim().replace(/\.$/, "")}; integrated ${kw} for production pipelines.`);
    setAtsScore((prev) => Math.min(99, prev + 3));
  };

  const handleAiEnhanceBullet = () => {
    setResumeText("Architected high-throughput microservices using FastAPI, Redis caching, Docker, and PostgreSQL; reduced API p99 latency by 44% across 120,000 daily active requests while maintaining 99.9% uptime.");
    setAtsScore(98);
  };

  // Section #03 Pricing State
  const [isAnnual, setIsAnnual] = useState(true);

  // Section #02 FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Copy code helper
  const [copiedCode, setCopiedCode] = useState(false);

  // If already logged in, redirect to user dashboard
  if (user?.user_type) {
    return <Navigate to={`/${user.user_type}/dashboard`} replace />;
  }

  // Scroll listener for the signature header position rank meter (rAF throttled & zero redundant re-renders)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY;
          const progress = Math.min(Math.max(currentScroll / (totalScroll || 1), 0), 1);

          let newRank = { pos: 87, page: 9 };
          let newNav = "how-it-works";

          if (progress < 0.1) {
            newRank = { pos: 87, page: 9 };
            newNav = "how-it-works";
          } else if (progress < 0.22) {
            newRank = { pos: 78, page: 8 };
            newNav = "how-it-works";
          } else if (progress < 0.36) {
            newRank = { pos: 63, page: 7 };
            newNav = "readiness";
          } else if (progress < 0.5) {
            newRank = { pos: 47, page: 6 };
            newNav = "ai-studio";
          } else if (progress < 0.62) {
            newRank = { pos: 29, page: 5 };
            newNav = "drives";
          } else if (progress < 0.74) {
            newRank = { pos: 16, page: 4 };
            newNav = "analytics";
          } else if (progress < 0.84) {
            newRank = { pos: 9, page: 3 };
            newNav = "tools";
          } else if (progress < 0.94) {
            newRank = { pos: 4, page: 2 };
            newNav = "pricing";
          } else {
            newRank = { pos: 1, page: 1 };
            newNav = "pricing";
          }

          setActiveNav((prev) => (prev !== newNav ? newNav : prev));

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle Domain Scanner & Readiness Analysis
  const handleScanCollege = (targetDomain) => {
    const domain = targetDomain !== undefined ? targetDomain : collegeQuery;
    if (targetDomain !== undefined) {
      setCollegeQuery(targetDomain);
    }
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const profile = getCollegeProfile(domain);
      setScanResult(profile);
    }, 450);
  };

  // Run AI Evaluation simulator with progressive telemetry steps
  const handleRunEvaluation = () => {
    setIsEvaluating(true);
    setEvalProgressText("Vectorizing syntax & algorithmic depth...");
    setTimeout(() => {
      setEvalProgressText("Verifying asymptotic bounds & proctor integrity...");
      setTimeout(() => {
        setEvalProgressText("Grading STAR behavioral delivery & precision...");
        setTimeout(() => {
          setIsEvaluating(false);
          setEvalProgressText("");
          setEvalResult({
            score: Math.floor(Math.random() * 5) + 94,
            accuracy: "Optimal (97.8%)",
            clarity: "STAR Structure Formatted",
            proctorStatus: "Verified — 0 Anomalies Detected",
            tip: "Consider mentioning partition tolerance and network isolation edge cases.",
          });
        }, 350);
      }, 350);
    }, 350);
  };

  const handleLoadProAnswer = () => {
    if (interviewTopic === "dsa") {
      setUserAnswer("For dense graphs with V > 100,000, standard Dijkstra with binary heap yields O(E log V). By switching to Fibonacci Heap or dense adjacency matrix partitioned into cache-friendly chunks, decrease-key amortizes to O(1), bringing total time down to O(V log V + E) with strict O(V + E) memory.");
    } else if (interviewTopic === "sys") {
      setUserAnswer("To guarantee at-least-once delivery for 10k req/s, I would introduce Apache Kafka partitioned by recipient ID hash, a lightweight Redis deduplication cache with a 24h TTL, and an asynchronous worker pool with exponential backoff dead-letter queues (DLQ).");
    } else {
      setUserAnswer("When our sprint fell 4 days behind on OAuth 2.0 integration, I ran a root-cause retrospective, decoupled the legacy user migration from the core auth flow, reallocated two frontend devs to parallel mock contract tests, and delivered on schedule with zero downtime.");
    }
  };

  // Run Dispatch Simulation with real-time multi-channel telemetry
  const handleDispatch = () => {
    setIsDispatching(true);
    setDispatchSuccess(false);
    setBroadcastMetrics({ app: 0, email: 0, whatsapp: 0 });

    setTimeout(() => {
      setBroadcastMetrics((prev) => ({ ...prev, app: eligibleStudentCount }));
    }, 280);

    setTimeout(() => {
      setBroadcastMetrics((prev) => ({ ...prev, email: eligibleStudentCount }));
    }, 560);

    setTimeout(() => {
      setBroadcastMetrics({
        app: eligibleStudentCount,
        email: eligibleStudentCount,
        whatsapp: Math.max(0, eligibleStudentCount - 2),
      });
      setIsDispatching(false);
      setDispatchSuccess(true);
    }, 880);

    setTimeout(() => setDispatchSuccess(false), 5000);
  };

  // Copy Schema
  const handleCopySchema = () => {
    setCopiedCode(true);
    navigator.clipboard?.writeText(JSON.stringify(evalResult, null, 2));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Cost calculations for ROI section
  const legacyAgencyCost = batchSize * 800;
  const legacyTpoOvertime = drivesCount * hoursPerDrive * 500;
  const legacyInterviewers = drivesCount * 6500;
  const totalLegacyCost = legacyAgencyCost + legacyTpoOvertime + legacyInterviewers;
  const internBridgeCost = isAnnual ? 120000 : 144000;
  const annualSavings = Math.max(0, totalLegacyCost - internBridgeCost);
  const hoursSaved = Math.round(drivesCount * hoursPerDrive * 0.75);

  const navLinks = [
    { id: "how-it-works", label: "How it works" },
    { id: "readiness", label: "Readiness" },
    { id: "ai-studio", label: "AI Studio" },
    { id: "drives", label: "Drives" },
    { id: "analytics", label: "Analytics" },
    { id: "tools", label: "Free Tools" },
    { id: "pricing", label: "Pricing" },
  ];

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
      isDark ? "bg-[#090D1A] text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* ───────────────────────────────────────────────────────────────────────
          PREMIUM BACKGROUND ACCENT LIGHTS & SUBTLE BLUEPRINT GRID
         ─────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transform-gpu">
        {/* Subtle grid pattern */}
        <div className={`absolute inset-0 [background-size:24px_24px] ${
          isDark
            ? "bg-[radial-gradient(rgba(59,130,246,0.18)_1px,transparent_1px)] opacity-60"
            : "bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] opacity-40"
        }`} />
        {/* GPU-composited static ambient glow orbs (zero runtime repaints) */}
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full blur-[110px] pointer-events-none transition-all duration-500 ${
          isDark
            ? "bg-gradient-to-b from-blue-600/30 via-indigo-600/20 to-transparent"
            : "bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent"
        }`} />
        <div className={`absolute top-[35%] right-[-10%] w-[550px] h-[550px] rounded-full blur-[120px] pointer-events-none transition-all duration-500 ${
          isDark ? "bg-cyan-500/15" : "bg-blue-100/35"
        }`} />
        <div className={`absolute top-[65%] left-[-10%] w-[550px] h-[550px] rounded-full blur-[120px] pointer-events-none transition-all duration-500 ${
          isDark ? "bg-emerald-500/15" : "bg-emerald-100/35"
        }`} />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          REAL-TIME KINETIC SCROLL PROGRESS BEAM (0% -> 100%)
         ─────────────────────────────────────────────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 z-[100] origin-left pointer-events-none shadow-sm shadow-blue-500/50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* ───────────────────────────────────────────────────────────────────────
          FIXED NAVBAR WITH CLEAN SPACING, SEGMENTED TICK METER & MOBILE DRAWER
         ─────────────────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 w-full ${
        isDark
          ? "bg-[#090D1A]/85 border-slate-800/80 shadow-lg shadow-black/20"
          : "bg-white/95 border-slate-200/80 shadow-2xs"
      }`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/25"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex flex-col">
              <span className={`font-heading font-black text-xl tracking-tight flex items-center gap-1.5 whitespace-nowrap ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                InternBridge{" "}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                  isDark
                    ? "bg-blue-950/80 text-blue-300 border border-blue-800/80"
                    : "bg-blue-50 text-blue-700 border border-blue-200/60"
                }`}>
                  AI
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — All with whitespace-nowrap, never break lines, and fluid animated active pill */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-xs xl:text-sm font-semibold shrink-0">
            {navLinks.map((link) => {
              const isActive = activeNav === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`relative px-2.5 xl:px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors inline-flex items-center justify-center font-medium ${
                    isActive
                      ? isDark
                        ? "text-blue-400 font-bold"
                        : "text-blue-600 font-bold"
                      : isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className={`absolute inset-0 rounded-full border -z-10 shadow-2xs ${
                        isDark
                          ? "bg-blue-950/70 border-blue-800/80"
                          : "bg-blue-50 border-blue-200/80"
                      }`}
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Auth Actions & Mobile Trigger */}
          <div className="flex items-center gap-2 xl:gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Obsidian Dark Mode"}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isDark
                  ? "bg-slate-900/90 border-slate-700/80 text-amber-300 hover:bg-slate-800 shadow-xs"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-xs"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
            </button>

            <Link
              to="/login"
              className={`text-xs xl:text-sm font-bold px-2 sm:px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                isDark ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Log In
            </Link>

            <Link
              to="/signup/email"
              className={`hidden sm:inline-flex items-center gap-1 text-xs xl:text-sm font-semibold px-2.5 xl:px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                isDark
                  ? "text-blue-300 bg-blue-950/60 border-blue-800/70 hover:bg-blue-900/60"
                  : "text-blue-600 hover:text-blue-700 border-blue-200 bg-blue-50/70 hover:bg-blue-100"
              }`}
            >
              Student Register
            </Link>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} className="shrink-0">
              <Link
                to="/register-college"
                className="inline-flex items-center gap-1.5 px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs xl:text-sm font-bold transition-all shadow-md shadow-blue-600/25 whitespace-nowrap"
              >
                Start Free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg transition-colors ${
                isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={`lg:hidden overflow-hidden border-t px-4 py-3 space-y-1 text-xs font-semibold backdrop-blur-xl ${
                isDark
                  ? "border-slate-800 bg-[#090D1A]/95 text-slate-200"
                  : "border-slate-200 bg-white/98 text-slate-700"
              }`}
            >
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    activeNav === link.id
                      ? isDark ? "text-blue-400 bg-blue-950/70 font-bold" : "text-blue-600 bg-blue-50 font-bold"
                      : isDark ? "text-slate-300 hover:bg-slate-800/70" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className={`pt-3 border-t flex flex-col gap-2 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 text-center rounded-xl border font-bold text-xs ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup/email"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 text-center rounded-xl border font-bold text-xs ${
                      isDark
                        ? "border-blue-800 bg-blue-950/80 text-blue-300 hover:bg-blue-900"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    Student Register
                  </Link>
                </div>
                <Link
                  to="/register-college"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  Start Free (College Onboarding) <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───────────────────────────────────────────────────────────────────────
          HERO SECTION WITH KINETIC TYPOGRAPHY & LIVE DATA TOPOLOGY
         ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dynamic Rotating Feature Pill Badge */}
            <div className="flex items-center gap-2">
              <RotatingHeroBadge />
            </div>

            {/* Massive Display Title with Kinetic Animated Words */}
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <AnimatedWords text="The AI Placement platform that" />{" "}
              <AnimatedWords
                text="trains what gets hired,"
                delay={0.2}
                isGradient
                className={
                  isDark
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-extrabold"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 font-extrabold"
                }
              />{" "}
              <AnimatedWords text="then bridges you." delay={0.4} />
            </h1>

            {/* Subtitle with Reveal */}
            <RevealOnScroll delay={0.25}>
              <p className={`text-base sm:text-lg max-w-2xl leading-relaxed font-normal ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}>
                InternBridge unifies college curriculum with real-world industry hiring criteria, proctors cheat-proof campus screening tests, rebuilds student ATS resumes, and delivers pre-screened candidate batches directly to TPO desks.
              </p>
            </RevealOnScroll>

            {/* Interactive Domain / Campus Scanner Bar */}
            <RevealOnScroll delay={0.35}>
              <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xl backdrop-blur-md max-w-xl transition-all ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 shadow-blue-950/20"
                  : "bg-white border-slate-200/90 shadow-slate-200/40"
              }`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleScanCollege();
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={collegeQuery}
                      onChange={(e) => setCollegeQuery(e.target.value)}
                      placeholder="Enter your college domain (e.g. bvmengineering.ac.in)"
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        isDark
                          ? "bg-slate-950/90 border border-slate-800 text-white placeholder-slate-500"
                          : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isScanning}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 shrink-0 cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scanning Campus...
                      </>
                    ) : (
                      <>
                        Analyze Readiness <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Sample college domain chips */}
                <div className={`mt-2.5 pt-2 border-t flex flex-wrap items-center gap-2 text-[11px] ${
                  isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                }`}>
                  <span className="font-medium">Or try:</span>
                  {["bvmengineering.ac.in", "iitb.ac.in", "coep.ac.in", "vjti.ac.in"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleScanCollege(chip)}
                      className={`underline font-mono font-medium cursor-pointer transition-colors ${
                        collegeQuery.toLowerCase() === chip
                          ? isDark ? "text-blue-300 font-bold" : "text-blue-700 font-bold"
                          : isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Analysis Quick Verdict Banner */}
                {scanResult && (
                  <motion.div
                    key={scanResult.domain}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-2.5 p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs ${
                      isDark
                        ? "bg-blue-950/40 border-blue-800/60 text-blue-200"
                        : "bg-blue-50/90 border-blue-200/90 text-blue-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        <strong>{scanResult.name}</strong>: <span className={`font-bold ${isDark ? "text-blue-400" : "text-blue-700"}`}>{scanResult.readiness}% Readiness Index</span> • {scanResult.students}
                      </span>
                    </div>
                    <a
                      href="#readiness"
                      className={`inline-flex items-center gap-1 font-bold hover:underline shrink-0 text-[11px] ${
                        isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                      }`}
                    >
                      View Cutoff Map &darr;
                    </a>
                  </motion.div>
                )}
              </div>
            </RevealOnScroll>

            {/* Simulation callout note */}
            <RevealOnScroll delay={0.4}>
              <p className={`text-xs flex items-center gap-1.5 font-mono ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live multi-tenant simulation. Every college operates on an isolated institutional domain with custom student gating.
              </p>
            </RevealOnScroll>
          </div>

          {/* Hero Right Column: Animated Data Flow Topology HUD */}
          <div className="lg:col-span-5">
            <RevealOnScroll delay={0.2}>
              <div className={`rounded-3xl border shadow-xl p-5 sm:p-6 relative overflow-hidden card-hover transition-all backdrop-blur-md ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 shadow-black/40"
                  : "bg-white border-slate-200/90 shadow-slate-200/40"
              }`}>
                {/* Card top banner */}
                <div className={`flex items-center justify-between pb-4 border-b ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isScanning ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
                    <span className={`font-mono text-xs font-bold truncate max-w-[200px] ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}>
                      campus analysis: <span className={isDark ? "text-blue-400" : "text-blue-600"}>{scanResult.domain || collegeQuery}</span>
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                    isDark
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {scanResult.badge || "✓ VERIFIED ACCREDITED"}
                  </span>
                </div>

                {/* Interactive Node Graph Map Canvas with Animated Data Pulses */}
                <div className={`h-44 sm:h-52 relative my-4 flex items-center justify-center rounded-2xl border p-3 overflow-hidden ${
                  isDark
                    ? "bg-slate-950/80 border-slate-800"
                    : "bg-slate-50/70 border-slate-200/60"
                }`}>
                  {isScanning && (
                    <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-20">
                      <div className="bg-white/95 px-3.5 py-1.5 rounded-full border border-blue-200 shadow-md flex items-center gap-2 font-mono text-xs text-blue-700 font-bold">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        Evaluating {collegeQuery}...
                      </div>
                    </div>
                  )}

                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    {/* Animated Data Packets Flowing Lines */}
                    <g className={isDark ? "opacity-80" : "opacity-60"}>
                      <line x1="200" y1="100" x2="80" y2="50" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                      <line x1="200" y1="100" x2="320" y2="50" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                      <line x1="200" y1="100" x2="100" y2="150" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                      <line x1="200" y1="100" x2="300" y2="150" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                      <line x1="200" y1="100" x2="200" y2="25" stroke="#3B82F6" strokeWidth="1.5" opacity="0.3" />
                    </g>

                    {/* Animated Traveling Data Pulses */}
                    <circle r="3.5" fill="#3B82F6">
                      <animateMotion path="M 200 100 L 80 50" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3.5" fill="#818CF8">
                      <animateMotion path="M 200 100 L 320 50" dur="2.8s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3.5" fill="#34D399">
                      <animateMotion path="M 200 100 L 100 150" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3.5" fill="#FBBF24">
                      <animateMotion path="M 200 100 L 300 150" dur="3s" repeatCount="indefinite" />
                    </circle>

                    {/* Central Node: College Campus with Pulse Ring */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("campus")}>
                      <circle cx="200" cy="100" r="30" fill={isDark ? "#1E3A8A" : "#DBEAFE"} opacity="0.4" className="animate-ping" />
                      <circle cx="200" cy="100" r="26" fill={isDark ? "#172554" : "#EFF6FF"} stroke="#3B82F6" strokeWidth="2.5" />
                      <text x="200" y="98" textAnchor="middle" fill={isDark ? "#93C5FD" : "#1E3A8A"} fontSize="9" fontWeight="bold">Campus</text>
                      <text x="200" y="108" textAnchor="middle" fill={isDark ? "#60A5FA" : "#2563EB"} fontSize="7" fontFamily="monospace">Tenant</text>
                    </g>

                    {/* Satellite Node 1: TPO Command Deck */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("tpo")}>
                      <circle cx="80" cy="50" r="18" fill={isDark ? "#0F172A" : "#FFFFFF"} stroke="#3B82F6" strokeWidth="1.5" />
                      <text x="80" y="53" textAnchor="middle" fill={isDark ? "#93C5FD" : "#1E40AF"} fontSize="8" fontWeight="bold">TPO</text>
                    </g>

                    {/* Satellite Node 2: Verified Students */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("students")}>
                      <circle cx="320" cy="50" r="18" fill={isDark ? "#0F172A" : "#FFFFFF"} stroke="#6366F1" strokeWidth="1.5" />
                      <text x="320" y="53" textAnchor="middle" fill={isDark ? "#A5B4FC" : "#4338CA"} fontSize="8" fontWeight="bold">Students</text>
                    </g>

                    {/* Satellite Node 3: AI Proctoring */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("proctor")}>
                      <circle cx="100" cy="150" r="18" fill={isDark ? "#0F172A" : "#FFFFFF"} stroke="#10B981" strokeWidth="1.5" />
                      <text x="100" y="153" textAnchor="middle" fill={isDark ? "#6EE7B7" : "#065F46"} fontSize="8" fontWeight="bold">Proctor</text>
                    </g>

                    {/* Satellite Node 4: Active Recruiters */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("drives")}>
                      <circle cx="300" cy="150" r="18" fill={isDark ? "#0F172A" : "#FFFFFF"} stroke="#F59E0B" strokeWidth="1.5" />
                      <text x="300" y="153" textAnchor="middle" fill={isDark ? "#FCD34D" : "#92400E"} fontSize="8" fontWeight="bold">Drives</text>
                    </g>

                    {/* Top Node: Curriculum */}
                    <g className="cursor-pointer" onClick={() => setActiveGraphNode("curriculum")}>
                      <circle cx="200" cy="25" r="14" fill={isDark ? "#0F172A" : "#FFFFFF"} stroke="#0284C7" strokeWidth="1.5" />
                      <text x="200" y="28" textAnchor="middle" fill={isDark ? "#7DD3FC" : "#0369A1"} fontSize="7" fontWeight="bold">Syllabus</text>
                    </g>
                  </svg>

                  <div className={`absolute bottom-2 left-3 font-mono text-[10px] ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Active node focus: <span className="text-blue-500 font-bold uppercase">{activeGraphNode}</span>
                  </div>
                </div>

                {/* 4 Metrics Strip */}
                <div className={`grid grid-cols-4 gap-2 text-center py-3 border-y font-mono ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}>
                  <div>
                    <p className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{scanResult.activeDrives}</p>
                    <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Drives Live</p>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-blue-500">{scanResult.readiness}%</p>
                    <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Readiness</p>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-emerald-500">{scanResult.recruiters}</p>
                    <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Recruiters</p>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-indigo-400">{scanResult.avgPackage}</p>
                    <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Avg CTC</p>
                  </div>
                </div>

                {/* Mini Table of Target Opportunities */}
                <div className="mt-3 space-y-1.5 font-mono text-[11px]">
                  <div className={`flex justify-between items-center text-[10px] pb-1 border-b ${
                    isDark ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"
                  }`}>
                    <span>TARGET ROLE</span>
                    <span>CTC</span>
                    <span>DIFFICULTY</span>
                    <span>STATUS</span>
                  </div>
                  {(scanResult.topRoles || []).map((row, i) => (
                    <motion.div
                      key={`${scanResult.domain}-${i}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ x: 3 }}
                      className={`flex justify-between items-center py-1 border-b transition-transform ${
                        isDark ? "border-slate-800/60 text-slate-300" : "border-slate-50 text-slate-700"
                      }`}
                    >
                      <span className={`truncate max-w-[140px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{row.role}</span>
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>{row.ctc}</span>
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>{row.diff}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                        isDark
                          ? "bg-slate-800/80 border-slate-700 text-emerald-300"
                          : row.color
                      }`}>
                        {row.intent}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Insights Summary Banner */}
                <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono ${
                  isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                }`}>
                  <span className="truncate max-w-[280px]">{scanResult.insights}</span>
                  <a href="#readiness" className={`font-bold shrink-0 ml-2 hover:underline ${
                    isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                  }`}>
                    Details &rarr;
                  </a>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* 4 Major Institutional KPIs Strip with Kinetic Animated Count Ups */}
        <StaggerGrid className={`mt-14 pt-8 border-t grid grid-cols-2 md:grid-cols-4 gap-6 font-mono ${
          isDark ? "border-slate-800" : "border-slate-200/80"
        }`}>
          <StaggerCard className={`space-y-1 p-4 rounded-2xl border shadow-2xs ${
            isDark
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white border-slate-200/70"
          }`}>
            <p className={`text-3xl sm:text-4xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
              <AnimatedCounter target={450} suffix="+" />
            </p>
            <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Campus Drives Hosted</p>
          </StaggerCard>
          <StaggerCard className={`space-y-1 p-4 rounded-2xl border shadow-2xs ${
            isDark
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white border-slate-200/70"
          }`}>
            <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">
              <AnimatedCounter target={500} suffix="+" />
            </p>
            <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Partner Recruiters</p>
          </StaggerCard>
          <StaggerCard className={`space-y-1 p-4 rounded-2xl border shadow-2xs ${
            isDark
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white border-slate-200/70"
          }`}>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
              <AnimatedCounter target={99.4} suffix="%" />
            </p>
            <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Proctoring Integrity</p>
          </StaggerCard>
          <StaggerCard className={`space-y-1 p-4 rounded-2xl border shadow-2xs ${
            isDark
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white border-slate-200/70"
          }`}>
            <p className="text-3xl sm:text-4xl font-extrabold text-indigo-400">
              <AnimatedCounter target={18.4} prefix="₹" suffix=" LPA" />
            </p>
            <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Top Dream Package</p>
          </StaggerCard>
        </StaggerGrid>

        {/* Live Velocity Infinite Marquee Ticker */}
        <div className="mt-10 rounded-2xl overflow-hidden shadow-sm">
          <LiveTickerRibbon />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #78: "From Student Intake to Offer Letter. Four Steps."
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t relative transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Watermark Header with kinetic word reveal */}
          <div className="lg:col-span-5 space-y-4">
            <RevealOnScroll>
              <RadarBadge code="78" text="01 HOW IT WORKS • STILL ON PAGE 8" />
            </RevealOnScroll>

            <h2 className={`text-3xl sm:text-4xl font-bold font-heading leading-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <AnimatedWords text="From student intake to offer letter. Four steps." />{" "}
              <AnimatedWords
                text="Zero manual chaos."
                delay={0.2}
                isGradient
                className={
                  isDark
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
                }
              />
            </h2>

            <RevealOnScroll delay={0.15}>
              <p className={`text-sm leading-relaxed pt-2 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}>
                Good campus placement needs <strong>a trainer</strong>, <strong>a proctor</strong>, <strong>a coordinator</strong>, and <strong>an institutional tracker</strong>.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.25}>
              <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 text-slate-300 shadow-sm"
                  : "bg-white border-slate-200/90 text-slate-600 shadow-sm"
              }`}>
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  Legacy agencies charge ₹3,00,000+ per drive and burden TPOs with 60+ spreadsheet columns.
                </p>
                <p className={`flex items-start gap-2 font-medium ${
                  isDark ? "text-slate-200" : "text-slate-800"
                }`}>
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  InternBridge automates syllabus curation, AI proctoring, resume scoring, and drive dispatches in one unified tenant.
                </p>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right 4 Interactive Cards Grid */}
          <StaggerGrid className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                num: "01",
                title: "Connect Your Campus",
                desc: "Auto-gate students via @college.ac.in domains. Extract roll numbers, branches, and fee receipt verifications automatically.",
                linkText: "Try domain gate →",
                href: "/register-college",
              },
              {
                num: "02",
                title: "AI Proctored Assessments",
                desc: "Run fair screening tests with browser full-screen lock, multi-face webcam verification, and instant auto-grading.",
                linkText: "Explore instant tests →",
                href: "/student/tests",
              },
              {
                num: "03",
                title: "Mock Interview & Resume Studio",
                desc: "Practice company-specific technical and HR rounds. Receive ATS section rebuilds and real-time STAR method feedback.",
                linkText: "Open interview studio →",
                href: "/student/mock-interview",
              },
              {
                num: "04",
                title: "Drives & Verified Offers",
                desc: "1-click eligibility filtering. Dispatch shortlists to recruiters, log multiple interview rounds, and confirm digital offer letters.",
                linkText: "Manage drives →",
                href: "/tpo/drives",
              },
            ].map((step) => (
              <StaggerCard
                key={step.num}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                  isDark
                    ? "bg-slate-900/80 border-slate-800 hover:border-blue-500/50"
                    : "bg-white border-slate-200/90 hover:border-blue-500/50"
                }`}
              >
                <div>
                  <span className="text-2xl font-black font-mono text-blue-500">{step.num}</span>
                  <h3 className={`text-base font-bold font-heading mt-1 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>{step.title}</h3>
                  <p className={`text-xs leading-relaxed mt-2 ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}>{step.desc}</p>
                </div>
                <Link
                  to={step.href}
                  className={`text-xs font-bold inline-flex items-center gap-1 group ${
                    isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                  }`}
                >
                  {step.linkText}
                </Link>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #63: "Find the Opportunities You Can Actually Win"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="readiness" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="63" text="02 RESEARCH • PAGE 7" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Find the opportunities you can" />{" "}
            <AnimatedWords
              text="actually win."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Every visiting recruiter plotted by eligibility difficulty vs Offered Annual CTC. Hover on any node to view cutoff marks, required tech stack, and schedule interview rounds.
            </p>
          </RevealOnScroll>
        </div>

        {/* Opportunity Map & 60-Day Placement Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Scatter Plot */}
          <RevealOnScroll delay={0.15} className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 card-hover shadow-sm transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Opportunity Map:</span>
                <span className="text-xs text-blue-500 font-mono font-semibold">bvm-campus.network</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {["all", "Dream", "Super Dream", "Core"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedScatterFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      selectedScatterFilter === filter
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                        : isDark
                        ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {filter === "all" ? "All Tiers" : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Scatter Coordinate Plane */}
            <div className={`relative h-72 sm:h-80 my-4 rounded-2xl border p-4 flex flex-col justify-between overflow-hidden ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200/60"
            }`}>
              {/* Sweet spot box highlight */}
              <div className={`absolute top-4 left-4 w-44 h-36 rounded-xl p-2.5 pointer-events-none ${
                isDark ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-emerald-500/10 border border-emerald-500/30"
              }`}>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                  ★ SWEET SPOT: HIGH CTC / REASONABLE CUTOFF
                </span>
              </div>

              {/* Scatter nodes with hover bounce & click-to-schedule */}
              <svg className="w-full h-full select-none" viewBox="0 0 500 280">
                <line x1="40" y1="240" x2="480" y2="240" stroke={isDark ? "#334155" : "#CBD5E1"} strokeWidth="1" />
                <line x1="40" y1="20" x2="40" y2="240" stroke={isDark ? "#334155" : "#CBD5E1"} strokeWidth="1" />
                
                <text x="260" y="268" textAnchor="middle" fill={isDark ? "#94A3B8" : "#64748B"} fontSize="9" fontFamily="monospace">
                  DIFFICULTY / MIN CGPA &rarr;
                </text>
                <text x="20" y="130" textAnchor="middle" fill={isDark ? "#94A3B8" : "#64748B"} fontSize="9" fontFamily="monospace" transform="rotate(-90 20 130)">
                  OFFERED CTC (₹ LPA) &rarr;
                </text>

                {[
                  { name: "Google", role: "SDE I", cx: 100, cy: 50, ctc: "₹34 LPA", cgpa: "8.5", tier: "Super Dream", color: "#3B82F6" },
                  { name: "Microsoft", role: "Cloud Dev", cx: 130, cy: 70, ctc: "₹28 LPA", cgpa: "8.0", tier: "Super Dream", color: "#3B82F6" },
                  { name: "Amazon", role: "Backend Eng", cx: 110, cy: 95, ctc: "₹24 LPA", cgpa: "7.8", tier: "Dream", color: "#10B981" },
                  { name: "Oracle", role: "Database Dev", cx: 180, cy: 110, ctc: "₹18 LPA", cgpa: "7.5", tier: "Dream", color: "#10B981" },
                  { name: "L&T Tech", role: "Embedded Eng", cx: 240, cy: 170, ctc: "₹9 LPA", cgpa: "6.8", tier: "Core", color: "#F59E0B" },
                  { name: "TCS Digital", role: "Sys Analyst", cx: 210, cy: 160, ctc: "₹9 LPA", cgpa: "7.0", tier: "Core", color: "#F59E0B" },
                  { name: "Infosys DSE", role: "Specialist", cx: 320, cy: 180, ctc: "₹6.5 LPA", cgpa: "6.5", tier: "Core", color: "#EF4444" },
                  { name: "Wipro Turbo", role: "Developer", cx: 380, cy: 200, ctc: "₹5.5 LPA", cgpa: "6.0", tier: "Core", color: "#EF4444" },
                ].map((co, idx) => {
                  if (selectedScatterFilter !== "all" && co.tier !== selectedScatterFilter) return null;
                  const isScheduled = calendarSlots.some((s) => s.company.toLowerCase() === co.name.toLowerCase());
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                      onClick={() => handleAddCompanyToCalendar(co)}
                      onMouseEnter={() => setHoveredCompany(co)}
                      onMouseLeave={() => setHoveredCompany(null)}
                    >
                      {/* Pulse halo if scheduled */}
                      {isScheduled && (
                        <circle cx={co.cx} cy={co.cy} r="12" fill={co.color} opacity="0.25" className="animate-ping" />
                      )}
                      <circle cx={co.cx} cy={co.cy} r="7" fill={co.color} stroke={isDark ? "#0F172A" : "#FFFFFF"} strokeWidth="2" />
                      <text x={co.cx + 10} y={co.cy + 3} fill={isDark ? "#E2E8F0" : "#1E293B"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                        {co.name} {isScheduled ? "✓" : ""}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover preview tool card */}
              {hoveredCompany && (
                <div className={`absolute bottom-3 right-3 p-3 rounded-xl shadow-xl text-xs font-mono animate-scale-in z-10 pointer-events-none ${
                  isDark ? "bg-slate-900 border border-blue-500/50 text-slate-200" : "bg-white border border-blue-300 text-slate-900"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>{hoveredCompany.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                      Click to Schedule
                    </span>
                  </div>
                  <p className={isDark ? "text-slate-400" : "text-slate-600"}>{hoveredCompany.role}</p>
                  <p className="text-emerald-400 font-bold mt-1">CTC: {hoveredCompany.ctc}</p>
                  <p className={isDark ? "text-slate-500" : "text-slate-500"}>Min CGPA: {hoveredCompany.cgpa}</p>
                </div>
              )}
            </div>

            <div className={`flex items-center justify-between text-[11px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <span>💡 Click any company bubble to schedule directly into the 60-day calendar.</span>
              <span className="text-blue-500 font-semibold">{calendarSlots.length} in schedule</span>
            </div>
          </RevealOnScroll>

          {/* Right Column: 60-Day Placement Calendar */}
          <RevealOnScroll delay={0.25} className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 card-hover shadow-sm space-y-4 transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
              <div>
                <h3 className={`font-bold font-heading text-base ${isDark ? "text-white" : "text-slate-900"}`}>Content calendar : next 60 days</h3>
                <p className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>Campus Recruitment Cycle</p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {calendarSlots.length} Scheduled
              </span>
            </div>

            {/* Interactive Feedback Toast */}
            <AnimatePresence>
              {calendarToast && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  className={`p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between shadow-xs font-semibold ${
                    isDark ? "bg-blue-950/60 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <span>{calendarToast}</span>
                  <button onClick={() => setCalendarToast(null)} className="text-blue-400 hover:text-blue-300 p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`p-3 rounded-xl text-xs ${
              isDark ? "bg-slate-950/80 border border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-200/70 text-slate-600"
            }`}>
              Your top target opportunities are scheduled across Weeks 1-8 to maximize dream offer conversions.
            </div>

            {/* Weeks 1 to 4 Schedule Cards */}
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((wk) => {
                const match = calendarSlots.find((s) => s.week === wk);
                return (
                  <motion.div
                    key={wk}
                    whileHover={{ x: 3 }}
                    className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs transition-all ${
                      match
                        ? isDark
                          ? "bg-slate-800/90 border-blue-500/40 text-white"
                          : "bg-white border-blue-200 shadow-2xs"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800/80 text-slate-400"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <span className={isDark ? "text-slate-400 font-bold" : "text-slate-500 font-bold"}>WEEK {wk}</span>
                    {match ? (
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{match.company}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          {match.ctc}
                        </span>
                        <button
                          onClick={() => handleRemoveCalendarSlot(wk)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Remove from schedule"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Open recruitment slot</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Calendar actions */}
            <div className="flex items-center gap-2 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  setCalendarSlots([
                    { week: 1, company: "Google", role: "SDE I", ctc: "₹34 LPA", tier: "Super Dream" },
                    { week: 2, company: "Microsoft", role: "Cloud Dev", ctc: "₹28 LPA", tier: "Super Dream" },
                    { week: 3, company: "Amazon", role: "Backend Eng", ctc: "₹24 LPA", tier: "Dream" },
                    { week: 4, company: "Oracle", role: "DB Eng", ctc: "₹18 LPA", tier: "Dream" },
                  ])
                }
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                Auto-fill 4 Best Opportunities
              </motion.button>
              <button
                onClick={() => setCalendarSlots([])}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors ${
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Clear
              </button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #47: "Real-Time AI Mock Interview & Proctoring Studio"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="ai-studio" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="47" text="03 WRITE & INTERVIEW • PAGE 6" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Real-time AI Mock Interview &" />{" "}
            <AnimatedWords
              text="Proctoring Studio."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              InternBridge fetches live recruiter question banks, inspects candidate webcam feeds for malpractice, and delivers instant section-by-section evaluation with STAR feedback.
            </p>
          </RevealOnScroll>
        </div>

        {/* Live Simulator Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Outline & Checklist */}
          <RevealOnScroll delay={0.15} className={`lg:col-span-4 rounded-3xl p-5 card-hover shadow-sm space-y-4 transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <h4 className={`text-xs font-mono font-bold uppercase tracking-wider pb-2 border-b ${
              isDark ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
            }`}>
              INTERVIEW OUTLINE (4 SECTIONS)
            </h4>

            <div className="space-y-2 font-mono text-xs">
              {[
                { id: "dsa", label: "01 Algorithms & Data Structures", active: interviewTopic === "dsa" },
                { id: "sys", label: "02 System Architecture & Scaling", active: interviewTopic === "sys" },
                { id: "hr", label: "03 STAR Behavioral & Leadership", active: interviewTopic === "hr" },
                { id: "db", label: "04 DB Indexing & Concurrency", active: interviewTopic === "db" },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setInterviewTopic(sec.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    sec.active
                      ? isDark
                        ? "bg-blue-950/60 text-blue-300 border-blue-700 font-bold shadow-xs"
                        : "bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs"
                      : isDark
                      ? "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Checklist */}
            <div className={`pt-4 border-t space-y-2 font-mono text-xs ${
              isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600"
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Every interview includes:
              </span>
              <p className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Live browser & webcam proctoring
              </p>
              <p className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> 30+ Company past interview papers
              </p>
              <p className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Technical depth scoring (0-100)
              </p>
              <p className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Resume-matched question prompts
              </p>
            </div>
          </RevealOnScroll>

          {/* Right Column: Live Candidate Sandbox & Evaluation Panel */}
          <RevealOnScroll delay={0.25} className={`lg:col-span-8 rounded-3xl p-5 sm:p-6 card-hover shadow-sm space-y-4 transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>LIVE PROCTORED AUDIO</span>
                </div>
                <AudioWaveform />
              </div>
              <button
                onClick={() => setShowJsonSchema(!showJsonSchema)}
                className="text-xs font-mono text-blue-500 hover:text-blue-400 underline font-semibold cursor-pointer"
              >
                {showJsonSchema ? "Hide JSON Schema" : "Inspect Schema Markup"}
              </button>
            </div>

            {/* Simulated Live Proctor HUD with real camera option */}
            <ProctorHUD
              liveWebcam={liveWebcamActive}
              onToggleWebcam={() => setLiveWebcamActive(!liveWebcamActive)}
            />

            {/* Question Prompt with Audio Synthesis */}
            <div className={`p-3.5 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              isDark ? "bg-slate-950/80 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div>
                <span className="text-blue-500 font-bold">Prompt: </span>
                <span>
                  {interviewTopic === "dsa"
                    ? "How would you optimize Dijkstra's shortest-path algorithm when graph vertices exceed 100,000?"
                    : interviewTopic === "sys"
                    ? "Design a real-time notification service that handles 10,000 dispatches per second with at-least-once delivery."
                    : "Describe a situation where a core team project fell behind schedule. How did you realign delivery?"}
                </span>
              </div>
              <button
                onClick={() =>
                  speakQuestion(
                    interviewTopic === "dsa"
                      ? "How would you optimize Dijkstra's shortest-path algorithm when graph vertices exceed 100,000?"
                      : interviewTopic === "sys"
                      ? "Design a real-time notification service that handles 10,000 dispatches per second with at-least-once delivery."
                      : "Describe a situation where a core team project fell behind schedule. How did you realign delivery?"
                  )
                }
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  isSpeaking
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                    : isDark
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                }`}
                title="Voice Question Aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isSpeaking ? "Speaking..." : "Listen Prompt"}
              </button>
            </div>

            {/* Response Input Box with Speech-to-Text Microphone Dictation & Pro Answer loader */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <label className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Candidate Verbal / Code Response:
                  </label>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400 font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      REC AUDIO STREAMING
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLoadProAnswer}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all inline-flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    }`}
                    title="Load Pre-crafted Benchmark Answer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Load Pro Answer
                  </button>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                      isListening
                        ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/25"
                        : isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    {isListening ? "Listening... (Speak Now)" : "Dictate with Mic"}
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type or dictate your technical response..."
                className={`w-full p-3 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-colors ${
                  isDark
                    ? "bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600"
                    : "bg-slate-50 border border-slate-200 text-slate-900"
                }`}
              />
            </div>

            {/* Live Evaluation Trigger & Feedback Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {evalProgressText || "Analyzing AI Depth..."}
                  </>
                ) : (
                  "Run AI Assessment →"
                )}
              </motion.button>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Score:</span>
                <span className="text-lg font-black text-emerald-400">{evalResult.score}/100</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {evalResult.accuracy}
                </span>
              </div>
            </div>

            {/* Structured Schema Output */}
            {showJsonSchema && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 relative font-mono text-[11px] text-emerald-400 overflow-hidden"
              >
                <button
                  onClick={handleCopySchema}
                  className="absolute top-3 right-3 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      "@context": "https://schema.internbridge.ai",
                      "@type": "AssessmentEvaluation",
                      candidateScore: evalResult.score,
                      accuracyRating: evalResult.accuracy,
                      proctorStatus: evalResult.proctorStatus,
                      aiFeedbackTip: evalResult.tip,
                      evaluatedAt: new Date().toISOString(),
                    },
                    null,
                    2
                  )}
                </pre>
              </motion.div>
            )}
          </RevealOnScroll>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #29: "Automate Drives. Zero Spreadsheet Clutter."
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="drives" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="29" text="04 PUBLISH & DISPATCH • PAGE 5" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Publishes to students." />{" "}
            <AnimatedWords
              text="No copy-pasting."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Native integrations with college student domains, automatic eligibility gating, and zero conflicting spreadsheets. Dispatch job notices to 500+ candidates in under 30 seconds.
            </p>
          </RevealOnScroll>
        </div>

        {/* Dispatcher Sandbox Card */}
        <RevealOnScroll delay={0.2} className={`rounded-3xl p-6 card-hover shadow-sm space-y-6 transition-colors ${
          isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recruiter selector */}
            <div className="space-y-2">
              <label className={`block text-xs font-mono uppercase tracking-wider font-semibold ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Select visiting recruiter:
              </label>
              <div className="flex flex-wrap gap-2">
                {["Google", "Microsoft", "Amazon", "Tata Consultancy", "Deloitte", "L&T"].map((rec) => (
                  <button
                    key={rec}
                    onClick={() => setSelectedRecruiter(rec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      selectedRecruiter === rec
                        ? "bg-blue-600 text-white font-bold shadow-sm"
                        : isDark
                        ? "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                        : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Stage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-mono uppercase tracking-wider font-semibold ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}>
                  Recruitment Stage:
                </label>
                <button
                  onClick={() => setShowDriveFilters(!showDriveFilters)}
                  className={`text-xs font-mono font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {showDriveFilters ? "Close Filters" : "Eligibility Gates"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Draft", "Open", "Assessment", "Interviews", "Selected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDriveStage(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      driveStage === st
                        ? "bg-emerald-600 text-white font-bold shadow-sm"
                        : isDark
                        ? "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                        : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Eligibility Rules Configuration */}
          <AnimatePresence>
            {showDriveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-2xl space-y-4 font-mono text-xs overflow-hidden ${
                  isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Minimum Cutoff CGPA:</span>
                      <span className="font-bold text-blue-500">{minCgpaCutoff.toFixed(1)} / 10.0</span>
                    </div>
                    <input
                      type="range"
                      min="6.0"
                      max="9.0"
                      step="0.1"
                      value={minCgpaCutoff}
                      onChange={(e) => setMinCgpaCutoff(parseFloat(e.target.value))}
                      className={`w-full accent-blue-600 h-2 rounded-lg cursor-pointer ${
                        isDark ? "bg-slate-800" : "bg-slate-200"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className={`font-semibold block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Allowed Eligible Branches:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["IT", "CE", "ECE", "EE", "MECH"].map((br) => {
                        const active = selectedBranches.includes(br);
                        return (
                          <button
                            key={br}
                            onClick={() => {
                              setSelectedBranches((prev) =>
                                active ? prev.filter((b) => b !== br) : [...prev, br]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : isDark
                                ? "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                : "bg-white text-slate-500 border-slate-200 hover:text-slate-800"
                            }`}
                          >
                            {br} {active ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3 Real-Time Broadcast Conduits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-2xl font-mono text-xs space-y-2 ${
              isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"
            }`}>
              <div className="flex items-center justify-between text-slate-500">
                <span className={`flex items-center gap-1.5 font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Student Mobile App
                </span>
                <span className="text-[10px] text-blue-500 font-bold bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                  PNS ACTIVE
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{broadcastMetrics.app}</span>
                <span className="text-[10px] text-slate-500">/ {eligibleStudentCount} sent</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${eligibleStudentCount ? (broadcastMetrics.app / eligibleStudentCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl font-mono text-xs space-y-2 ${
              isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"
            }`}>
              <div className="flex items-center justify-between text-slate-500">
                <span className={`flex items-center gap-1.5 font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> SES Email Gateway
                </span>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  SMTP 250 OK
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{broadcastMetrics.email}</span>
                <span className="text-[10px] text-slate-500">/ {eligibleStudentCount} sent</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${eligibleStudentCount ? (broadcastMetrics.email / eligibleStudentCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl font-mono text-xs space-y-2 ${
              isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"
            }`}>
              <div className="flex items-center justify-between text-slate-500">
                <span className={`flex items-center gap-1.5 font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp API
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  DELIVERED
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>{broadcastMetrics.whatsapp}</span>
                <span className="text-[10px] text-slate-500">/ {eligibleStudentCount} delivered</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${eligibleStudentCount ? (broadcastMetrics.whatsapp / eligibleStudentCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action & Feedback status */}
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDark ? "bg-slate-950/80 border border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}>
            <div className="text-xs font-mono">
              <p>
                Targeting: <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedRecruiter} Placement Drive</span>
              </p>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} mt-0.5`}>
                Qualified candidate pool:{" "}
                <span className="font-bold text-blue-500">{eligibleStudentCount} Candidates</span> (CGPA &ge; {minCgpaCutoff.toFixed(1)}, {selectedBranches.length} Branches)
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDispatch}
              disabled={isDispatching}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Broadcasting to {eligibleStudentCount} Candidates...
                </>
              ) : dispatchSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  All {eligibleStudentCount} Notices Dispatched!
                </>
              ) : (
                <>Publish Drive Notification &rarr;</>
              )}
            </motion.button>
          </div>
        </RevealOnScroll>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #16: "Track Institutional Placement Intelligence"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="analytics" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="16" text="05 TRACK • PAGE 4" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Tracks placement intelligence" />{" "}
            <AnimatedWords
              text="automatically."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Real-time tracking of student applications, test completions, interview shortlists, and compensation packages across an academic year.
            </p>
          </RevealOnScroll>
        </div>

        {/* 4 Metric Cards + Line Chart */}
        <RevealOnScroll delay={0.2} className={`rounded-3xl p-6 card-hover shadow-sm space-y-6 transition-colors ${
          isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
        }`}>
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <StaggerCard className={`p-4 rounded-2xl ${isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"}`}>
              <p className={`text-2xl sm:text-3xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                <AnimatedCounter target={17} suffix="K" />
              </p>
              <p className={`text-xs mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Test Attempts</p>
            </StaggerCard>
            <StaggerCard className={`p-4 rounded-2xl ${isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"}`}>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-500">
                <AnimatedCounter target={105} suffix="K" />
              </p>
              <p className={`text-xs mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Drive Views</p>
            </StaggerCard>
            <StaggerCard className={`p-4 rounded-2xl ${isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"}`}>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                <AnimatedCounter target={15.9} suffix="%" />
              </p>
              <p className={`text-xs mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Offer Conversion Rate</p>
            </StaggerCard>
            <StaggerCard className={`p-4 rounded-2xl ${isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-50 border border-slate-200"}`}>
              <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">
                <AnimatedCounter target={8.4} prefix="₹" suffix=" LPA" />
              </p>
              <p className={`text-xs mt-1 font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Avg Starting Package</p>
            </StaggerCard>
          </StaggerGrid>

          {/* Interactive SVG Chart Curve (90 Days Growth) */}
          <div className={`h-48 sm:h-56 rounded-2xl border p-4 relative overflow-hidden flex flex-col justify-between ${
            isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/80 border-slate-200/60"
          }`}>
            <div className={`flex justify-between items-center text-[11px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <span>Day 0 (Orientation)</span>
              <span>Day 30 (Assessments)</span>
              <span>Day 60 (Drives Peak)</span>
              <span>Day 90 (Offers Dispatched)</span>
            </div>

            <svg className="w-full h-32" viewBox="0 0 600 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 100 Q 150 85, 300 50 T 600 15 L 600 120 L 0 120 Z"
                fill="url(#chartGradLight)"
              />
              <path
                d="M 0 100 Q 150 85, 300 50 T 600 15"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
              />
            </svg>

            <div className={`flex justify-between items-center text-[10px] font-mono pt-1 border-t ${
              isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
            }`}>
              <span>Verified data: 90 days of continuous campus drive execution.</span>
              <span className="text-emerald-400 font-bold">+84% Offer Velocity</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #09: "Cost & Time Savings ROI Flywheel"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="roi" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="09" text="06 IMPROVE • PAGE 3" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="The ROI flywheel that saves" />{" "}
            <AnimatedWords
              text="240+ TPO hours per cycle."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-teal-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Drag the sliders below to calculate how much your institution currently spends on external assessment agencies versus the turnkey InternBridge Campus License.
            </p>
          </RevealOnScroll>
        </div>

        {/* Interactive Sliders & Live Comparison Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders Left */}
          <RevealOnScroll delay={0.15} className={`lg:col-span-6 rounded-3xl p-6 card-hover shadow-sm space-y-6 font-mono transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            {/* Slider 1: Batch Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-600 font-medium"}>Batch Size (Students):</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{batchSize} students</span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className={`w-full accent-blue-600 h-2 rounded-lg cursor-pointer ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              />
            </div>

            {/* Slider 2: Annual Drives */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-600 font-medium"}>Visiting Recruiters / Drives:</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{drivesCount} companies</span>
              </div>
              <input
                type="range"
                min="100"
                max="100"
                step="5"
                value={drivesCount}
                onChange={(e) => setDrivesCount(Number(e.target.value))}
                className={`w-full accent-blue-600 h-2 rounded-lg cursor-pointer ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              />
            </div>

            {/* Slider 3: Hours per Drive */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-600 font-medium"}>Manual Hours per Drive:</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{hoursPerDrive} hrs / drive</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={hoursPerDrive}
                onChange={(e) => setHoursPerDrive(Number(e.target.value))}
                className={`w-full accent-blue-600 h-2 rounded-lg cursor-pointer ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
              />
            </div>
          </RevealOnScroll>

          {/* Calculator Output Right */}
          <RevealOnScroll delay={0.25} className={`lg:col-span-6 rounded-3xl p-6 card-hover shadow-sm space-y-4 font-mono transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <h3 className={`text-xs uppercase tracking-wider pb-2 border-b font-bold ${
              isDark ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
            }`}>
              ANNUAL INSTITUTIONAL COMPARISON
            </h3>

            <div className="space-y-3 text-xs">
              <div className={`flex justify-between items-center py-1 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>Legacy External Assessment Vendor</span>
                <span className="text-red-500 font-bold">₹{legacyAgencyCost.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center py-1 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>Manual TPO Staff Coordinator Overtime</span>
                <span className="text-red-500 font-bold">₹{legacyTpoOvertime.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center py-1 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>External Freelance Mock Interviewers</span>
                <span className="text-red-500 font-bold">₹{legacyInterviewers.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b text-sm ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Total Legacy Operating Expense</span>
                <span className="text-red-500 font-extrabold">₹{totalLegacyCost.toLocaleString()}</span>
              </div>

              {/* InternBridge Package */}
              <div className={`p-4 rounded-2xl flex items-center justify-between ${
                isDark ? "bg-blue-950/60 border border-blue-800/80 text-blue-200" : "bg-blue-50 border border-blue-200 text-slate-900"
              }`}>
                <div>
                  <p className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>InternBridge Campus License</p>
                  <p className={`text-[11px] ${isDark ? "text-blue-300" : "text-blue-700"}`}>₹10,000/mo flat (Unlimited usage)</p>
                </div>
                <span className={`text-lg font-black ${isDark ? "text-blue-400" : "text-blue-700"}`}>₹{internBridgeCost.toLocaleString()}</span>
              </div>

              {/* Total Savings Highlight */}
              <div className={`p-4 rounded-2xl flex items-center justify-between ${
                isDark ? "bg-emerald-950/60 border border-emerald-800/80 text-emerald-200" : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              }`}>
                <div>
                  <p className="font-bold text-sm">Annual Net Institutional Savings</p>
                  <p className={`text-[11px] font-sans ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                    + {hoursSaved} TPO coordinator hours reclaimed
                  </p>
                </div>
                <span className={`text-2xl font-black ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>₹{annualSavings.toLocaleString()}</span>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #04: "Free Student Placement Tools"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="tools" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="04" text="FREE TOOLS • WORKS RIGHT HERE • PAGE 2" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Free tools. This one works" />{" "}
            <AnimatedWords
              text="right here."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-teal-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Try our interactive student utilities directly in your browser. Test your resume ATS score, predict your CTC bracket from CGPA, or check open branch eligibility.
            </p>
          </RevealOnScroll>
        </div>

        {/* Tabbed Interactive Tool Switcher */}
        <RevealOnScroll delay={0.2} className={`rounded-3xl p-6 card-hover shadow-sm space-y-6 transition-colors ${
          isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
        }`}>
          <div className={`flex flex-wrap gap-2 pb-4 border-b font-mono text-xs ${isDark ? "border-slate-800" : "border-slate-100"}`}>
            {[
              { id: "ats", label: "ATS Resume Checker" },
              { id: "ctc", label: "CGPA to CTC Predictor" },
              { id: "matrix", label: "Branch Eligibility Matrix" },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === tool.id
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : isDark
                    ? "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Tool 1: ATS Resume Checker */}
          {activeTool === "ats" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-mono text-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`block uppercase tracking-wider font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Paste resume accomplishment bullet:
                  </label>
                  <button
                    onClick={handleAiEnhanceBullet}
                    className={`text-[11px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-lg border transition-all ${
                      isDark
                        ? "bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border-blue-800"
                        : "bg-blue-50 text-blue-600 hover:text-blue-800 border-blue-200"
                    }`}
                  >
                    <Wand2 className="w-3 h-3 text-blue-500" />
                    Auto-Enhance with AI
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    setAtsScore(Math.min(97, Math.max(68, Math.round(e.target.value.length / 3) % 25 + 74)));
                  }}
                  className={`w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono resize-none text-xs transition-colors ${
                    isDark
                      ? "bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600"
                      : "bg-slate-50 border border-slate-200 text-slate-900"
                  }`}
                />

                {/* Interactive Missing Keyword Pills */}
                <div className="space-y-1.5">
                  <span className={`text-[10px] uppercase tracking-wider font-bold block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    Click keyword to insert into bullet:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingKeywords.slice(0, 5).map((kw) => (
                      <button
                        key={kw}
                        onClick={() => handleAddKeyword(kw)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                          isDark
                            ? "bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border-blue-800/80"
                            : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border space-y-4 ${
                isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Calculated ATS Score:</span>
                    <p className={`text-[11px] font-sans ${isDark ? "text-slate-500" : "text-slate-400"}`}>Tested against Fortune 500 parse rubrics</p>
                  </div>
                  <span className="text-3xl font-black text-emerald-400">{atsScore}/100</span>
                </div>

                {/* Detected Keywords Chips */}
                <div className={`space-y-1.5 pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <span className={`text-[10px] uppercase tracking-wider font-bold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Detected High-Impact Keywords ({detectedKeywords.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 inline-flex items-center gap-1"
                      >
                        <Check className="w-2.5 h-2.5" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`space-y-1.5 pt-2 border-t text-[11px] ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <p className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5" /> Quantified metric present (44% response time)
                  </p>
                  <p className="text-blue-400 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5" /> Recruiter Verdict: Strong candidate action verbs with measurable latency improvements.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tool 2: CGPA to CTC Predictor */}
          {activeTool === "ctc" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-mono text-xs"
            >
              <div className="space-y-4">
                <div>
                  <label className={`block uppercase tracking-wider mb-1 font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Your Current CGPA:
                  </label>
                  <input
                    type="number"
                    min="5.0"
                    max="10.0"
                    step="0.1"
                    value={cgpaInput}
                    onChange={(e) => setCgpaInput(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl focus:outline-none focus:border-blue-500 transition-colors ${
                      isDark ? "bg-slate-950 border border-slate-800 text-white" : "bg-slate-50 border border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block uppercase tracking-wider mb-1 font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Engineering Branch:
                  </label>
                  <select
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    className={`w-full p-2.5 rounded-xl focus:outline-none focus:border-blue-500 font-mono transition-colors ${
                      isDark ? "bg-slate-950 border border-slate-800 text-white" : "bg-slate-50 border border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${
                isDark ? "bg-slate-950/80 border-slate-800 text-slate-300" : "bg-slate-50 border border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-300" : "text-slate-600"}>Predicted CTC Bracket:</span>
                  <span className="text-2xl font-black text-blue-500">
                    {cgpaInput >= 8.5 ? "₹14 - 34 LPA" : cgpaInput >= 7.5 ? "₹8 - 18 LPA" : "₹5 - 9 LPA"}
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Target Tier:{" "}
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {cgpaInput >= 8.5 ? "Super Dream Tier" : cgpaInput >= 7.5 ? "Dream Tier" : "Core Technical"}
                  </span>
                </p>
                <div className={`pt-2 border-t text-[11px] ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"}`}>
                  <span>Top matched companies: </span>
                  <span className="text-emerald-400 font-bold">
                    {cgpaInput >= 8.5 ? "Google, Microsoft, Amazon, Oracle" : "TCS Digital, L&T, Deloitte, Cognizant"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tool 3: Branch Eligibility Matrix */}
          {activeTool === "matrix" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 font-mono text-xs"
            >
              <p className={isDark ? "text-slate-400" : "text-slate-600"}>Live Campus Drive Eligibility Cross-Reference:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`border-b text-[10px] ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-400"}`}>
                      <th className="py-2">COMPANY</th>
                      <th className="py-2">MIN CGPA</th>
                      <th className="py-2">ALLOWED BRANCHES</th>
                      <th className="py-2">BACKLOG LIMIT</th>
                      <th className="py-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-800/80 text-slate-300" : "divide-slate-100 text-slate-700"}`}>
                    {[
                      { co: "Google", cgpa: "8.0", br: "IT, CE, ECE", bl: "0 Active", st: "Open" },
                      { co: "Microsoft", cgpa: "7.8", br: "All Circuit Branches", bl: "0 Active", st: "Open" },
                      { co: "Tata Consultancy", cgpa: "6.5", br: "All Branches", bl: "Max 1", st: "Open" },
                      { co: "Larsen & Toubro", cgpa: "6.8", br: "Mech, Civil, Electrical", bl: "0 Active", st: "Upcoming" },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className={`py-2.5 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{row.co}</td>
                        <td className="py-2.5">{row.cgpa}</td>
                        <td className="py-2.5">{row.br}</td>
                        <td className="py-2.5">{row.bl}</td>
                        <td className="py-2.5 text-emerald-400 font-bold">{row.st}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </RevealOnScroll>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #03: "Transparent Institutional & Student Pricing"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-4 mb-8">
          <RevealOnScroll>
            <RadarBadge code="03" text="PRICING • PAY FOR RESULTS • PAGE 2" />
          </RevealOnScroll>

          <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Start free. Upgrade when your" />{" "}
            <AnimatedWords
              text="campus scales."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-bold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-sm max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Individual students practice completely free forever. Institutions activate standard campus licenses with unlimited student onboardings and isolated tenant data.
            </p>
          </RevealOnScroll>

          {/* Billing Interval Toggle */}
          <div className="flex items-center gap-3 pt-4">
            <div className={`flex p-1 rounded-xl font-mono text-xs shadow-2xs ${
              isDark ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
            }`}>
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !isAnnual
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isAnnual
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Annual (Save 20%)
              </button>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">✓ 2 months free on annual billing</span>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Student Free */}
          <StaggerCard className={`p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6 transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <div className="space-y-4 font-mono">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>STUDENT TIER</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>₹0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>
              <p className={`text-xs font-sans ${isDark ? "text-slate-400" : "text-slate-600"}`}>Everything needed for personal placement prep.</p>

              <div className={`space-y-2 pt-4 border-t text-xs ${
                isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-700"
              }`}>
                <p className="flex items-center gap-2">✓ Unlimited AI mock interview drills</p>
                <p className="flex items-center gap-2">✓ ATS Resume scoring & enhancements</p>
                <p className="flex items-center gap-2">✓ Browse all active campus placement drives</p>
                <p className="flex items-center gap-2">✓ Access curated syllabus study materials</p>
              </div>
            </div>

            <Link
              to="/signup/email"
              className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono text-center block transition-colors ${
                isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900"
              }`}
            >
              Start Free as Student &rarr;
            </Link>
          </StaggerCard>

          {/* Plan 2: Campus Standard License */}
          <StaggerCard className={`p-6 rounded-3xl border-2 border-blue-500 shadow-xl shadow-blue-500/10 flex flex-col justify-between space-y-6 relative overflow-hidden transition-colors ${
            isDark ? "bg-gradient-to-b from-blue-950/60 to-slate-900/90" : "bg-gradient-to-b from-blue-50/70 to-white"
          }`}>
            <div className="absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
              MOST POPULAR
            </div>

            <div className="space-y-4 font-mono">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">CAMPUS STANDARD</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {isAnnual ? "₹10,000" : "₹12,000"}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className={`text-xs font-sans ${isDark ? "text-slate-400" : "text-slate-600"}`}>Turnkey institutional infrastructure for your college.</p>

              <div className={`space-y-2 pt-4 border-t text-xs ${
                isDark ? "border-blue-900/50 text-slate-200" : "border-blue-100 text-slate-800"
              }`}>
                <p className={`flex items-center gap-2 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>✓ Multi-tenant isolated workspace</p>
                <p className="flex items-center gap-2">✓ Custom domain gating (@college.ac.in)</p>
                <p className="flex items-center gap-2">✓ Unlimited student & recruiter accounts</p>
                <p className="flex items-center gap-2">✓ AI-Proctored online screening tests</p>
                <p className="flex items-center gap-2">✓ Syllabus-linked AI resource curation</p>
                <p className="flex items-center gap-2">✓ One-click NAAC/NBA placement audit exports</p>
              </div>
            </div>

            <Link
              to="/register-college"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono text-center block transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              Register College License &rarr;
            </Link>
          </StaggerCard>

          {/* Plan 3: University Enterprise */}
          <StaggerCard className={`p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6 transition-colors ${
            isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
          }`}>
            <div className="space-y-4 font-mono">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>UNIVERSITY NETWORK</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Custom</span>
              </div>
              <p className={`text-xs font-sans ${isDark ? "text-slate-400" : "text-slate-600"}`}>For multi-campus universities & state boards.</p>

              <div className={`space-y-2 pt-4 border-t text-xs ${
                isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-700"
              }`}>
                <p className="flex items-center gap-2">✓ Federated multi-college administration</p>
                <p className="flex items-center gap-2">✓ Custom ERP / Student Information System APIs</p>
                <p className="flex items-center gap-2">✓ Dedicated onboarding & recruiter success lead</p>
                <p className="flex items-center gap-2">✓ 99.9% Uptime SLA & compliance certification</p>
              </div>
            </div>

            <Link
              to="/contact"
              className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono text-center block transition-colors ${
                isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900"
              }`}
            >
              Contact Enterprise Sales &rarr;
            </Link>
          </StaggerCard>
        </StaggerGrid>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #02: "Frequently Asked Questions"
         ─────────────────────────────────────────────────────────────────────── */}
      <section id="faq" className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <RevealOnScroll>
              <RadarBadge code="02" text="FAQS • PAGE 1" />
            </RevealOnScroll>

            <h2 className={`text-3xl sm:text-4xl font-bold font-heading ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <AnimatedWords text="Common questions answered." />
            </h2>
            <RevealOnScroll delay={0.2}>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Everything you need to know about AI proctoring, multi-tenant isolation, and institutional placement workflows.
              </p>
              <p className={`text-xs font-mono mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Have a custom requirement? Email us at{" "}
                <Link to="/contact" className="text-blue-500 hover:text-blue-400 underline font-semibold">
                  support@internbridge.ai
                </Link>
              </p>
            </RevealOnScroll>
          </div>

          <div className="lg:col-span-7 space-y-3 font-mono text-xs">
            {[
              {
                q: "How does AI proctoring prevent cheating during campus tests?",
                a: "InternBridge combines strict full-screen browser lockdowns, multi-face webcam detection, tab-switch interception, and randomized question rendering to ensure 99.4% anti-cheating compliance.",
              },
              {
                q: "Can TPOs restrict drive applications by branch and backlogs?",
                a: "Yes. Every placement drive has fine-grained rule gates. Students who do not meet the minimum CGPA, active backlog threshold, or allowed branches are prevented from applying automatically.",
              },
              {
                q: "How does the curriculum sync curate study resources?",
                a: "College admins upload their official branch syllabus. InternBridge parses subject topics, matches them with industry recruitment trends, and recommends approved textbooks, articles, and video lectures.",
              },
              {
                q: "Is student data isolated from other colleges?",
                a: "Completely. Every college operates as an isolated institutional tenant. College admins only oversee their authenticated student domain, and data is never cross-shared.",
              },
              {
                q: "What payment methods are supported for institutional licenses?",
                a: "We support turnkey Razorpay checkout with UPI, Net Banking, corporate credit cards, and NEFT/RTGS invoicing with GST invoices provided upon payment.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`p-4 rounded-2xl transition-all card-hover shadow-2xs ${
                  isDark ? "bg-slate-900/80 border border-slate-800" : "bg-white border border-slate-200/90"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full flex items-center justify-between text-left font-bold gap-3 cursor-pointer ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  <span>{faq.q}</span>
                  <span className="text-blue-500 font-mono text-base">{openFaq === i ? "−" : "+"}</span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`mt-3 pt-3 border-t leading-relaxed font-sans overflow-hidden ${
                        isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600"
                      }`}
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bookend Live Ticker Ribbon */}
      <LiveTickerRibbon className="mt-12" />

      {/* ───────────────────────────────────────────────────────────────────────
          SECTION #01: "Position #1: Final High-Impact CTA"
         ─────────────────────────────────────────────────────────────────────── */}
      <section className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t text-center relative transition-colors ${
        isDark ? "border-slate-800" : "border-slate-200/80"
      }`}>
        <div className="space-y-6 max-w-3xl mx-auto">
          <RevealOnScroll className="flex justify-center">
            <RadarBadge code="01" text="DAY 90 • EXECUTION • POSITION #1" />
          </RevealOnScroll>

          <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <AnimatedWords text="Start building your placement records in" />{" "}
            <AnimatedWords
              text="under 8 minutes."
              delay={0.2}
              isGradient
              className={
                isDark
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-extrabold"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 font-extrabold"
              }
            />
          </h2>

          <RevealOnScroll delay={0.2}>
            <p className={`text-base max-w-xl mx-auto pt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Your peers and competing colleges are onboarding recruiters every week. Transform your placement cell into an autonomous hiring powerhouse.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.3} className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/register-college"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 block text-center"
              >
                Start Free for Colleges &rarr;
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/signup/email"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl border font-bold text-sm transition-all shadow-2xs block text-center ${
                  isDark
                    ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
                    : "bg-white hover:bg-slate-50 text-slate-900 border-slate-300"
                }`}
              >
                Student Register Free
              </Link>
            </motion.div>
          </RevealOnScroll>

          <p className={`text-xs font-mono pt-3 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
            NO CREDIT CARD REQUIRED FOR STUDENTS • INSTANT INSTITUTIONAL SETUP
          </p>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          RICH TECHNICAL FOOTER
         ─────────────────────────────────────────────────────────────────────── */}
      <footer className={`border-t py-14 px-4 sm:px-6 lg:px-8 font-mono text-xs transition-colors ${
        isDark ? "bg-[#090D1A] border-slate-800 text-slate-400" : "bg-white border-slate-200/90 text-slate-600"
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                IB
              </div>
              <span className={`font-heading font-black text-base ${isDark ? "text-white" : "text-slate-900"}`}>InternBridge AI</span>
            </div>
            <p className={`leading-relaxed font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              The unified campus recruitment, AI proctoring, and syllabus curation ecosystem for modern universities.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational (99.98% uptime)</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? "text-slate-200" : "text-slate-900"}`}>ON THIS PAGE</h4>
            <div className={`space-y-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <p><a href="#how-it-works" className="hover:text-blue-500 transition-colors">How it works</a></p>
              <p><a href="#readiness" className="hover:text-blue-500 transition-colors">Opportunity Map</a></p>
              <p><a href="#ai-studio" className="hover:text-blue-500 transition-colors">AI Interview Studio</a></p>
              <p><a href="#drives" className="hover:text-blue-500 transition-colors">Drive Dispatcher</a></p>
              <p><a href="#analytics" className="hover:text-blue-500 transition-colors">Performance Tracking</a></p>
              <p><a href="#tools" className="hover:text-blue-500 transition-colors">Free Student Tools</a></p>
              <p><a href="#pricing" className="hover:text-blue-500 transition-colors">Institutional Pricing</a></p>
              <p><a href="#faq" className="hover:text-blue-500 transition-colors">FAQ</a></p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? "text-slate-200" : "text-slate-900"}`}>PORTAL ROLES</h4>
            <div className={`space-y-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <p><Link to="/login" className="hover:text-blue-500 transition-colors">Student Login</Link></p>
              <p><Link to="/login" className="hover:text-blue-500 transition-colors">TPO Coordinator Portal</Link></p>
              <p><Link to="/login" className="hover:text-blue-500 transition-colors">College Administrator</Link></p>
              <p><Link to="/login" className="hover:text-blue-500 transition-colors">SuperAdmin Command Center</Link></p>
              <p><Link to="/register-college" className="hover:text-blue-500 transition-colors">Register New Institution</Link></p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? "text-slate-200" : "text-slate-900"}`}>GET STARTED</h4>
            <div className={`space-y-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <p><Link to="/register-college" className="hover:text-blue-500 transition-colors">Start Free (College Onboarding)</Link></p>
              <p><Link to="/signup/email" className="hover:text-blue-500 transition-colors">Student Register</Link></p>
              <p><Link to="/login" className="hover:text-blue-500 transition-colors">Log in</Link></p>
              <p><Link to="/contact" className="hover:text-blue-500 transition-colors">Contact & Support</Link></p>
            </div>
          </div>
        </div>

        <div className={`max-w-7xl mx-auto pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] ${
          isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-500"
        }`}>
          <p>&copy; {new Date().getFullYear()} InternBridge Placement Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/contact" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Privacy Policy</Link>
            <span>•</span>
            <Link to="/contact" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Terms of Service</Link>
            <span>•</span>
            <Link to="/contact" className={isDark ? "hover:text-white" : "hover:text-slate-900"}>Security & Isolation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
