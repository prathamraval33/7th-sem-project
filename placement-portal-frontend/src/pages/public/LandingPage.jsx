import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, CheckCircle2, Sparkles, Building2, UserPlus, Shield } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

/* ═══════════════════════════════════════════════════════
   Design tokens (Light Theme — Crisp, Modern & Elegant)
   ═══════════════════════════════════════════════════════ */
const C = {
  canvas:        "#F8FAFC",                  // Soft porcelain / slate-50 background
  card:          "#FFFFFF",                  // Pure white card surfaces
  cardHover:     "#FFFFFF",                  // White with elevated shadow on hover
  surfaceSubtle: "#F1F5F9",                  // Slate-100 for pills & subtle states
  obsidian:      "#E2E8F0",                  // Slate-200 for progress track & borders
  border:        "#E2E8F0",                  // Crisp hairline borders
  borderLight:   "#F1F5F9",                  // Soft inner dividers
  borderHover:   "#CBD5E1",                  // Slate-300 on card hover
  ash:           "#64748B",                  // Slate-500/600 for body copy & subtext
  ivory:         "#0F172A",                  // Slate-900 obsidian for headings & titles
  cobalt:        "#2563EB",                  // Brand royal cobalt blue
  cobaltHover:   "#1D4ED8",                  // Darker cobalt hover
  cobaltLight:   "#EFF6FF",                  // Soft blue tint for chips & badges
  cobaltBorder:  "rgba(37, 99, 235, 0.22)",  // Delicate blue border
  white:         "#FFFFFF",
  shadowSm:      "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)",
  shadowCard:    "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.02)",
  shadowHover:   "0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 6px 12px -4px rgba(0, 0, 0, 0.03)",
};

/* ═══════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════ */

// Count-up animation — triggers when element scrolls into view
function useCountUp(end, duration = 1800, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

  return [count, ref];
}

// Scroll-spy — returns the id of the section currently in view
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

// Stagger-reveal wrapper for scroll-in animations
function RevealSection({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered card wrapper
function StaggerCard({ children, index = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stat counter item
function StatItem({ value, suffix = "", label }) {
  const isNumeric = typeof value === "number";
  const [count, ref] = useCountUp(isNumeric ? value : 0, 1800);

  return (
    <div ref={ref} className="text-center">
      <div
        className="text-4xl sm:text-5xl tracking-tight mb-2"
        style={{ color: C.ivory, fontWeight: 600 }}
      >
        {isNumeric ? count.toLocaleString() : value}
        {suffix && <span style={{ color: C.cobalt }}>{suffix}</span>}
      </div>
      <div className="text-xs sm:text-sm font-medium" style={{ color: C.ash }}>
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [openFaq, setOpenFaq] = useState(null);
  const heroRef = useRef(null);

  // Readiness bar count-up on load
  const [readinessCount, setReadinessCount] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / 1400, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setReadinessCount(Math.round(eased * 82));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  // Scroll detection for nav frosted glass
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cursor-reactive hero glow
  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0.08, Math.min(0.82, (e.clientY - rect.top) / rect.height)),
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0.5, y: 0.45 });
  }, []);

  // Scroll-spy for nav highlighting
  const sectionIds = ["hero", "features", "how-it-works", "stories", "faq"];
  const activeSection = useScrollSpy(sectionIds);

  if (user?.user_type) {
    return <Navigate to={`/${user.user_type}/dashboard`} replace />;
  }

  const navLinks = [
    { label: "Features", id: "features" },
    { label: "How it works", id: "how-it-works" },
    { label: "Stories", id: "stories" },
    { label: "FAQ", id: "faq" },
  ];

  const departments = [
    "Computer Engineering",
    "Information Technology",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Civil Engineering",
    "Electronics & Communication",
    "Chemical Engineering",
    "Computer Engineering",
    "Information Technology",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Civil Engineering",
  ];

  const features = [
    { title: "AI mock interviews", desc: "Aptitude, technical, coding, and HR — one question at a time, with real actionable feedback." },
    { title: "Resume analyzer", desc: "ATS-style scoring and a step-by-step enhancer that rebuilds weak sections." },
    { title: "Eligibility, live", desc: "Every drive shows your real eligibility the moment it's posted." },
    { title: "Proctored instant tests", desc: "TPO-generated screening tests with fair, automated browser proctoring." },
    { title: "Career insights", desc: "Live market trends and placement analytics matched against your student profile." },
    { title: "Verified from day one", desc: "OTP-gated signup and AI-assisted fee receipt verification." },
  ];

  const whySwitch = [
    { title: "Your own instance", desc: "Your admin, TPOs, and email domain — never shared across colleges." },
    { title: "Add only what you need", desc: "Optional modules switch on when your institution is ready." },
    { title: "One view for TPOs", desc: "Applicants, rounds, attendance, and analytics managed in one central dashboard." },
    { title: "Secure by default", desc: "Token auth and role-based access control throughout every workflow." },
  ];

  const steps = [
    { num: "01", title: "Register & verify", desc: "OTP-confirmed institutional email." },
    { num: "02", title: "Complete profile", desc: "Academics, resume, and fee check." },
    { num: "03", title: "Browse drives", desc: "Instant real-time eligibility matching." },
    { num: "04", title: "Prepare with AI", desc: "Mock interviews, resume ATS, and tests." },
    { num: "05", title: "Track to offer", desc: "Every selection round in one place." },
  ];

  const testimonials = [
    { quote: "I walked into my first campus interview having already answered harder questions than the real thing.", name: "Riya Sharma", role: "Final-year, Computer Engineering", initials: "RS" },
    { quote: "Eligibility checks used to take our office a full day per drive. It's instant now.", name: "Prof. Anil Kumar", role: "Training & Placement Officer", initials: "AK" },
    { quote: "The resume enhancer caught critical keyword gaps three rounds of manual review hadn't.", name: "Meera Patel", role: "Final-year, Information Technology", initials: "MP" },
  ];

  const faqs = [
    { q: "Is this only for one college?", a: "No — the platform supports any number of colleges, each fully separate and isolated with independent admin controls and branding." },
    { q: "How does eligibility checking work?", a: "Each drive's criteria (CGPA, backlogs, branch, 10th/12th percentages) are automatically matched against each student's academic profile in real-time." },
    { q: "What does the mock interview cover?", a: "Comprehensive practice covering aptitude rounds, core technical questions, real-time code evaluation, and HR behavioral preparation with AI scoring." },
    { q: "Can our college add features later?", a: "Yes, our modular architecture lets colleges enable extra capabilities (like mock interviews or proctored tests) whenever required." },
    { q: "Is student data secure?", a: "Yes. All data is partitioned per institution and secured with role-based access control and token authentication." },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── Inline style helpers ── */
  const pill = (active) => ({
    padding: "6px 16px",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: active ? 500 : 450,
    letterSpacing: "0.005em",
    cursor: "pointer",
    transition: "all 0.25s ease",
    color: active ? C.ivory : C.ash,
    backgroundColor: active ? C.surfaceSubtle : "transparent",
    border: active ? `1px solid ${C.border}` : "1px solid transparent",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.canvas,
        color: C.ivory,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontWeight: 400,
        fontSize: "16px",
        lineHeight: 1.5,
        overflowX: "hidden",
      }}
    >
      {/* ─── Marquee ticker keyframes ─── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .landing-marquee {
          animation: marquee 30s linear infinite;
        }
        .landing-marquee:hover {
          animation-play-state: paused;
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ════════════════════════════════════════════
          NAVIGATION — frosted glass on scroll (Light theme)
          ════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "0 24px",
          transition: "all 0.35s ease",
          backgroundColor: scrolled
            ? "rgba(255, 255, 255, 0.88)"
            : "rgba(248, 250, 252, 0.75)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: scrolled
            ? `1px solid ${C.border}`
            : "1px solid transparent",
          boxShadow: scrolled ? "0 4px 20px -2px rgba(0, 0, 0, 0.05)" : "none",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "68px",
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: C.cobalt,
                boxShadow: `0 0 12px ${C.cobalt}60`,
              }}
            />
            <span
              style={{
                fontSize: "17px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: C.ivory,
              }}
            >
              Placement Portal
            </span>
          </Link>

          {/* Center nav pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 6px",
              borderRadius: "40px",
              backgroundColor: scrolled ? "rgba(241, 245, 249, 0.85)" : "rgba(241, 245, 249, 0.6)",
              border: `1px solid ${C.border}`,
              transition: "all 0.3s ease",
            }}
            className="hidden md:flex"
          >
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                style={pill(activeSection === link.id)}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Nav Right Actions: Sign in, Sign up (student), Get started (college) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Sign in */}
            <Link
              to="/login"
              style={{
                padding: "8px 18px",
                borderRadius: "32px",
                fontSize: "14px",
                fontWeight: 500,
                color: C.ash,
                backgroundColor: "transparent",
                border: `1px solid ${C.border}`,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.borderHover;
                e.currentTarget.style.color = C.ivory;
                e.currentTarget.style.backgroundColor = C.surfaceSubtle;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.ash;
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Sign in
            </Link>

            {/* Sign up button for students */}
            <Link
              to="/signup/email"
              style={{
                padding: "8px 18px",
                borderRadius: "32px",
                fontSize: "14px",
                fontWeight: 500,
                color: C.cobalt,
                backgroundColor: C.cobaltLight,
                border: `1px solid ${C.cobaltBorder}`,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.12)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.cobaltLight;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Sign up
            </Link>

            {/* Get started button for colleges -> redirects to /register-college */}
            <Link
              to="/register-college"
              style={{
                padding: "8px 20px",
                borderRadius: "32px",
                fontSize: "14px",
                fontWeight: 500,
                color: C.white,
                backgroundColor: C.cobalt,
                border: "none",
                textDecoration: "none",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              }}
              className="hidden sm:inline-flex items-center gap-1.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = C.cobaltHover;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.cobalt;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.25)";
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ════════════════════════════════════════════
          HERO SECTION — light ambient aura & sleek typography
          ════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          paddingTop: "148px",
          paddingBottom: "80px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Interactive cursor-following spotlight circle (Refined Light Theme) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 68%, rgba(0,0,0,0) 97%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 68%, rgba(0,0,0,0) 97%)",
            background: `
              radial-gradient(
                540px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                rgba(37, 99, 235, 0.20) 0%,
                rgba(59, 130, 246, 0.14) 34%,
                rgba(99, 102, 241, 0.08) 60%,
                rgba(191, 219, 254, 0.04) 80%,
                transparent 100%
              ),
              radial-gradient(
                850px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                rgba(37, 99, 235, 0.08) 0%,
                rgba(147, 197, 253, 0.05) 45%,
                transparent 75%
              )
            `,
            transition: "background 0.2s ease-out",
          }}
        />

        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px", position: "relative" }}>
          {/* Announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 18px",
                borderRadius: "40px",
                fontSize: "13px",
                fontWeight: 500,
                color: C.cobalt,
                backgroundColor: C.cobaltLight,
                border: `1px solid ${C.cobaltBorder}`,
                marginBottom: "32px",
                boxShadow: "0 1px 3px rgba(37, 99, 235, 0.08)",
              }}
            >
              <Sparkles size={14} />
              New: AI mock interviews across 4 rounds
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "clamp(38px, 6vw, 62px)",
              fontWeight: 600,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: C.ivory,
              marginBottom: "24px",
            }}
          >
            Placements worth the
            <br />
            <span style={{ color: C.cobalt }}>preparation.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              fontSize: "18px",
              fontWeight: 400,
              lineHeight: 1.6,
              color: C.ash,
              maxWidth: "580px",
              margin: "0 auto 40px",
            }}
          >
            Eligibility-matched drives, AI-scored resumes, proctored tests, and interview practice — one unified platform for your entire campus placement season.
          </motion.p>

          {/* CTA Buttons: Get started (Colleges) & Sign up (Students) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "14px",
              marginBottom: "56px",
            }}
          >
            {/* Primary Cobalt Pill: Get Started -> redirects to /register-college */}
            <Link
              to="/register-college"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 30px",
                borderRadius: "32px",
                fontSize: "15px",
                fontWeight: 500,
                color: C.white,
                backgroundColor: C.cobalt,
                textDecoration: "none",
                border: "none",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = C.cobaltHover;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.cobalt;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.3)";
              }}
            >
              <Building2 size={16} />
              Get started (College)
            </Link>

            {/* Secondary Sign Up Pill: Sign up as Student -> /signup/email */}
            <Link
              to="/signup/email"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 26px",
                borderRadius: "32px",
                fontSize: "15px",
                fontWeight: 500,
                color: C.cobalt,
                backgroundColor: C.cobaltLight,
                border: `1px solid ${C.cobaltBorder}`,
                textDecoration: "none",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.14)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.cobaltLight;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <UserPlus size={16} />
              Sign up as student
            </Link>

            {/* Ghost outline pill to scroll down */}
            <button
              onClick={() => scrollTo("features")}
              style={{
                padding: "13px 24px",
                borderRadius: "32px",
                fontSize: "15px",
                fontWeight: 500,
                color: C.ash,
                backgroundColor: C.card,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.borderHover;
                e.currentTarget.style.color = C.ivory;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.ash;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              See what's inside
            </button>
          </motion.div>

          {/* Readiness card — light elevated card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth: "440px",
              margin: "0 auto",
              padding: "28px",
              borderRadius: "16px",
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              boxShadow: C.shadowHover,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: C.ash }}>
                Placement readiness score
              </span>
              <motion.span
                style={{ fontSize: "28px", fontWeight: 600, color: C.cobalt }}
              >
                {readinessCount}%
              </motion.span>
            </div>
            {/* Progress bar */}
            <div style={{ width: "100%", height: "6px", borderRadius: "40px", backgroundColor: C.obsidian, overflow: "hidden", marginBottom: "20px" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${readinessCount}%` }}
                transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", borderRadius: "40px", backgroundColor: C.cobalt }}
              />
            </div>
            {/* Checklist */}
            <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: "14px" }}>
              {[
                "Resume scored — 8.4/10 ATS match",
                "AI technical mock interview completed",
                "3 eligible on-campus drives this week",
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    fontWeight: 450,
                    color: C.ivory,
                    padding: "8px 0",
                    borderBottom: i < 2 ? `1px solid ${C.borderLight}` : "none",
                  }}
                >
                  <CheckCircle2 size={16} color={C.cobalt} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          MARQUEE TICKER (Light Theme)
          ════════════════════════════════════════════ */}
      <section
        style={{
          padding: "32px 0",
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          overflow: "hidden",
          backgroundColor: C.card,
        }}
      >
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.ash,
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Built for placement cells across all engineering branches & departments
        </p>
        <div style={{ overflow: "hidden", width: "100%" }}>
          <div className="landing-marquee" style={{ display: "flex", gap: "48px", width: "max-content" }}>
            {departments.map((dept, i) => (
              <span
                key={i}
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: C.ash,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.005em",
                }}
              >
                {dept}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          STATS — count up on scroll into view
          ════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <RevealSection>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "32px",
              padding: "40px 24px",
              borderRadius: "16px",
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              boxShadow: C.shadowSm,
            }}
          >
            <StatItem value={50} suffix="+" label="Colleges onboarded" />
            <StatItem value={12000} suffix="+" label="Students placed" />
            <StatItem value={400} suffix="+" label="Recruiting companies" />
            <StatItem value="24/7" label="AI preparation availability" />
          </div>
        </RevealSection>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES
          ════════════════════════════════════════════ */}
      <section id="features" style={{ padding: "72px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <RevealSection>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: C.ivory, marginBottom: "16px" }}>
              Everything your placement season actually needs.
            </h2>
            <p style={{ fontSize: "17px", color: C.ash, maxWidth: "560px", margin: "0 auto" }}>
              From student onboarding to offer letter release, built around how high-performing placement cells operate.
            </p>
          </div>
        </RevealSection>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
          {features.map((feat, i) => (
            <StaggerCard key={i} index={i}>
              <div
                style={{
                  padding: "32px",
                  borderRadius: "14px",
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowSm,
                  height: "100%",
                  transition: "all 0.25s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.borderHover;
                  e.currentTarget.style.boxShadow = C.shadowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = C.shadowSm;
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: C.cobaltLight,
                    border: `1px solid ${C.cobaltBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "18px",
                  }}
                >
                  <Sparkles size={18} color={C.cobalt} />
                </div>
                <h3 style={{ fontSize: "19px", fontWeight: 600, color: C.ivory, marginBottom: "8px", letterSpacing: "-0.01em" }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: "15px", fontWeight: 400, color: C.ash, lineHeight: 1.6 }}>
                  {feat.desc}
                </p>
              </div>
            </StaggerCard>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHY SWITCH
          ════════════════════════════════════════════ */}
      <section style={{ padding: "72px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <RevealSection>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: C.ivory, marginBottom: "14px" }}>
              Why modern institutions switch.
            </h2>
            <p style={{ fontSize: "16px", color: C.ash, maxWidth: "520px", margin: "0 auto" }}>
              Engineered for data sovereignty, institutional independence, and operational reliability.
            </p>
          </div>
        </RevealSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {whySwitch.map((item, i) => (
            <StaggerCard key={i} index={i}>
              <div
                style={{
                  padding: "30px",
                  borderRadius: "14px",
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowSm,
                  height: "100%",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.borderHover;
                  e.currentTarget.style.boxShadow = C.shadowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = C.shadowSm;
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    backgroundColor: C.surfaceSubtle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <Shield size={18} color={C.cobalt} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: C.ivory, marginBottom: "8px" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "14px", color: C.ash, lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            </StaggerCard>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS — 5 steps
          ════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "72px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <RevealSection>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: C.ivory, marginBottom: "14px" }}>
              From first login to offer letter.
            </h2>
            <p style={{ fontSize: "16px", color: C.ash, maxWidth: "500px", margin: "0 auto" }}>
              A clear, verified pathway guiding every student through recruitment milestones.
            </p>
          </div>
        </RevealSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px", textAlign: "center" }}>
          {steps.map((step, i) => (
            <StaggerCard key={i} index={i}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "24px 16px",
                  borderRadius: "14px",
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowSm,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: `1px solid ${C.cobaltBorder}`,
                    backgroundColor: C.cobaltLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: C.cobalt,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {step.num}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: C.ivory, marginBottom: "6px" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "13px", color: C.ash, maxWidth: "170px", lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
            </StaggerCard>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TESTIMONIALS / STORIES
          ════════════════════════════════════════════ */}
      <section id="stories" style={{ padding: "72px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <RevealSection>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: C.ivory, marginBottom: "14px" }}>
              What students and TPOs say.
            </h2>
            <p style={{ fontSize: "16px", color: C.ash, maxWidth: "500px", margin: "0 auto" }}>
              Real feedback from the institutions and candidates using the portal daily.
            </p>
          </div>
        </RevealSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {testimonials.map((t, i) => (
            <StaggerCard key={i} index={i}>
              <div
                style={{
                  padding: "32px",
                  borderRadius: "14px",
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowSm,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.borderHover;
                  e.currentTarget.style.boxShadow = C.shadowHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = C.shadowSm;
                }}
              >
                <p style={{ fontSize: "15px", color: "#334155", lineHeight: 1.65, marginBottom: "24px", fontWeight: 450, fontStyle: "italic" }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: `1px solid ${C.borderLight}`, paddingTop: "16px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: C.cobaltLight,
                      border: `1px solid ${C.cobaltBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: C.cobalt,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: C.ivory }}>{t.name}</div>
                    <div style={{ fontSize: "12px", color: C.ash }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </StaggerCard>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CTA BANNER (Light theme with high-contrast electric cobalt)
          ════════════════════════════════════════════ */}
      <section style={{ padding: "40px 24px 60px", maxWidth: "1080px", margin: "0 auto" }}>
        <RevealSection>
          <div
            style={{
              borderRadius: "20px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              padding: "56px 36px",
              textAlign: "center",
              boxShadow: "0 20px 35px -8px rgba(37, 99, 235, 0.35)",
            }}
          >
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 600, color: C.white, marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Ready to modernize your placement season?
            </h2>
            <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.9)", maxWidth: "560px", margin: "0 auto 36px", lineHeight: 1.6 }}>
              Onboard your college in under 5 minutes or sign up as a student to prepare with AI mock interviews and ATS scoring.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px" }}>
              {/* Primary: Get started -> /register-college */}
              <Link
                to="/register-college"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "13px 32px",
                  borderRadius: "32px",
                  backgroundColor: C.white,
                  color: C.cobalt,
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.backgroundColor = C.white;
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.12)";
                }}
              >
                <Building2 size={16} />
                Get started (Register College)
              </Link>

              {/* Secondary: Sign up as student -> /signup/email */}
              <Link
                to="/signup/email"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "13px 28px",
                  borderRadius: "32px",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: C.white,
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.25s ease",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                }}
              >
                <UserPlus size={16} />
                Sign up as student
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ════════════════════════════════════════════
          FAQ ACCORDION
          ════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: "60px 24px 80px", maxWidth: "760px", margin: "0 auto" }}>
        <RevealSection>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: C.ivory, marginBottom: "14px" }}>
              Frequently asked questions.
            </h2>
            <p style={{ fontSize: "16px", color: C.ash }}>
              Everything you need to know about getting started.
            </p>
          </div>
        </RevealSection>
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {faqs.map((faq, idx) => (
            <RevealSection key={idx} delay={idx * 0.05}>
              <div style={{ borderBottom: `1px solid ${C.border}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "20px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: openFaq === idx ? C.cobalt : C.ivory,
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (openFaq !== idx) e.currentTarget.style.color = C.cobalt;
                  }}
                  onMouseLeave={(e) => {
                    if (openFaq !== idx) e.currentTarget.style.color = C.ivory;
                  }}
                >
                  <span style={{ paddingRight: "16px" }}>{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === idx ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ flexShrink: 0 }}
                  >
                    <ChevronDown size={18} color={openFaq === idx ? C.cobalt : C.ash} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <p style={{ fontSize: "15px", color: C.ash, lineHeight: 1.65, paddingBottom: "20px" }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER (Light Theme)
          ════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          backgroundColor: C.card,
          padding: "60px 24px 36px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "40px",
            marginBottom: "48px",
          }}
        >
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: C.cobalt,
                  boxShadow: `0 0 10px ${C.cobalt}60`,
                }}
              />
              <span style={{ fontSize: "16px", fontWeight: 600, color: C.ivory }}>
                Placement Portal
              </span>
            </div>
            <p style={{ fontSize: "14px", color: C.ash, lineHeight: 1.6, maxWidth: "280px" }}>
              The comprehensive campus placement and career-prep platform built for colleges and training offices.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.ivory,
                marginBottom: "16px",
              }}
            >
              Explore
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: C.ash,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* For Institutions & Students */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.ivory,
                marginBottom: "16px",
              }}
            >
              Get Started
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                to="/register-college"
                style={{ fontSize: "14px", color: C.ash, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
              >
                Register your college
              </Link>
              <Link
                to="/signup/email"
                style={{ fontSize: "14px", color: C.ash, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
              >
                Sign up as student
              </Link>
              <Link
                to="/login"
                style={{ fontSize: "14px", color: C.ash, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
              >
                Account sign in
              </Link>
            </div>
          </div>

          {/* Contact column */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.ivory,
                marginBottom: "16px",
              }}
            >
              Support & Contact
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a
                href="mailto:hello@placementportal.app"
                style={{ fontSize: "14px", color: C.ash, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
              >
                hello@placementportal.app
              </a>
              <Link
                to="/contact"
                style={{ fontSize: "14px", color: C.ash, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.cobalt; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ash; }}
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            borderTop: `1px solid ${C.borderLight}`,
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            fontSize: "13px",
            color: C.ash,
          }}
        >
          <span>© {new Date().getFullYear()} Placement Portal. All rights reserved.</span>
          <span>Designed for modern campus recruitment.</span>
        </div>
      </footer>
    </div>
  );
}
