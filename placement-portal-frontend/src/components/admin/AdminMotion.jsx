import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Search, X, Sparkles, Filter, Command } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   KINETIC TYPOGRAPHY & ANIMATED TEXT
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Word-by-word kinetic text reveal (GPU-accelerated, Apple/Linear caliber)
 */
export function AnimatedWords({ text, className = "", delay = 0 }) {
  if (!text) return null;
  const words = text.split(" ");
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.03, delayChildren: delay } },
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
              y: 12,
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Kinetic character-by-character reveal for badges, tags, or short numbers
 */
export function AnimatedChars({ text, className = "", delay = 0 }) {
  if (!text) return null;
  const chars = Array.from(text);
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        visible: { transition: { staggerChildren: 0.015, delayChildren: delay } },
        hidden: {},
      }}
    >
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-transform"
          variants={{
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
            },
            hidden: { opacity: 0, y: 8 },
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL REVEALS & CONTAINER ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Smooth scroll-triggered reveal wrapper
 */
export function RevealOnScroll({ children, className = "", delay = 0, y = 24 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container for card grids or list items
 */
export function StaggerGrid({ children, className = "", staggerDelay = 0.07 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger card with interactive hover lift and shadow
 */
export function StaggerCard({ children, className = "", hoverLift = true }) {
  return (
    <motion.div
      className={className}
      variants={{
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
        hidden: { opacity: 0, y: 20 },
      }}
      whileHover={
        hoverLift
          ? {
              y: -4,
              boxShadow: "0 18px 30px -8px rgba(15, 23, 42, 0.09)",
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER COUNTER (STATS & METRICS)
   ═══════════════════════════════════════════════════════════════════════════ */

export function AnimatedCounter({
  target,
  value,
  suffix = "",
  prefix = "",
  duration = 1100,
  className = "",
}) {
  const actualTarget = target ?? value ?? 0;
  const [displayVal, setDisplayVal] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (!isInView || actualTarget == null) return;
    const str = actualTarget.toString();
    const numeric = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
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
  }, [isInView, actualTarget, duration]);

  return (
    <span ref={ref} className={`tabular-nums font-inherit ${className}`}>
      {prefix}
      {isInView ? displayVal : 0}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACTIVE LIVE SEARCH BOX (WITH PULSE, CLEAR, SHORTCUT & FILTERS)
   ═══════════════════════════════════════════════════════════════════════════ */

export function InteractiveSearchBox({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  totalCount,
  filteredCount,
  filters = [],
  activeFilter,
  onFilterChange,
  shortcutKey = "/",
  className = "",
  autoFocus = false,
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!shortcutKey) return;
    const handleKeyDown = (e) => {
      if (
        (e.key === shortcutKey || (shortcutKey === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutKey]);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div
        className={`relative flex items-center transition-all duration-200 rounded-2xl bg-white border ${
          isFocused
            ? "border-indigo-500 shadow-md ring-4 ring-indigo-500/10"
            : "border-slate-200/90 hover:border-slate-300 shadow-xs"
        }`}
      >
        {/* Animated Search Icon */}
        <motion.div
          animate={isFocused ? { scale: 1.15, rotate: 12 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="pl-3.5 pr-2 flex items-center pointer-events-none"
        >
          <Search
            size={18}
            className={`transition-colors ${
              isFocused ? "text-indigo-600" : value ? "text-slate-700" : "text-slate-400"
            }`}
          />
        </motion.div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full py-2.5 pr-20 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        {/* Right Action Cluster */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {/* Clear Button */}
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={() => {
                  if (onClear) onClear();
                  else onChange("");
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Clear search"
              >
                <X size={15} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Shortcut Badge */}
          {shortcutKey && !value && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200/80 rounded-md select-none">
              {shortcutKey === "k" ? "⌘K" : shortcutKey}
            </kbd>
          )}

          {/* Live Result Match Counter */}
          {totalCount != null && filteredCount != null && (
            <motion.span
              layout
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                filteredCount === 0
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : filteredCount < totalCount
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {filteredCount}/{totalCount}
            </motion.span>
          )}
        </div>
      </div>

      {/* Optional Interactive Filter Chips */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            <Filter size={12} />
            <span>Filter:</span>
          </div>
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => onFilterChange?.(f.id)}
                className={`relative px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.icon && <f.icon size={13} />}
                <span>{f.label}</span>
                {f.count != null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN LIVE TICKER RIBBON (REAL-TIME CAMPUS TELEMETRY)
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdminTickerRibbon({ items = null, className = "" }) {
  const defaultItems = [
    "🏛️ Campus License: Active (Standard 30-Day Tier)",
    "🛡️ Institutional Integrity: 99.4% Verified",
    "📊 NAAC & NBA Placement Audit Ready",
    "⚡ Student Verification: Multi-Tenant Zero Leakage Active",
    "💼 Live Drives Monitored: Real-Time Sync",
    "🚀 Razorpay Campus Gateway: Operational",
    "🔒 Automated RBAC Enforced: Strict Isolation",
  ];

  const displayItems = items || defaultItems;

  return (
    <div
      className={`py-2 px-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-inner border border-indigo-900/40 relative select-none ${className}`}
    >
      <div className="flex items-center gap-8 whitespace-nowrap text-xs font-mono tracking-wider uppercase font-semibold animate-marquee will-change-transform">
        {[...displayItems, ...displayItems].map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-indigo-300 font-bold">{item}</span>
            <span className="text-slate-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE STATUS BEACON & RADAR BADGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function LiveStatusBeacon({ label = "LIVE TELEMETRY", color = "emerald" }) {
  const colorMap = {
    emerald: {
      ping: "bg-emerald-400",
      dot: "bg-emerald-500",
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    indigo: {
      ping: "bg-indigo-400",
      dot: "bg-indigo-500",
      pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    blue: {
      ping: "bg-blue-400",
      dot: "bg-blue-500",
      pill: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${c.pill}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.ping}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
      </span>
      <span>{label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACTIVE TAB SWITCHER (WITH GLIDING MOTION PILL)
   ═══════════════════════════════════════════════════════════════════════════ */

export function InteractiveTabSwitcher({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  layoutId = "adminActiveTabPill",
}) {
  return (
    <div
      className={`flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 shadow-inner overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const tabKey = tab.id ?? tab.key;
        const isActive = activeTab === tabKey;
        const Icon = tab.icon;
        return (
          <button
            key={tabKey}
            type="button"
            onClick={() => onTabChange(tabKey)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 whitespace-nowrap z-10 ${
              isActive ? "text-slate-900 font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/70 -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            {Icon && (
              <Icon
                size={16}
                className={`transition-colors ${isActive ? "text-indigo-600" : "text-slate-400"}`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge != null && (
              <span
                className={`text-xs px-2 py-0.2 rounded-full font-normal ${
                  isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-slate-200/80 text-slate-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLASSMORPHIC CARD CONTAINER (LUXURY APPLE/LINEAR FINISH)
   ═══════════════════════════════════════════════════════════════════════════ */

export function GlassCard({
  children,
  className = "",
  hoverLift = true,
  glow = false,
  ...props
}) {
  return (
    <motion.div
      {...props}
      whileHover={
        hoverLift
          ? {
              y: -4,
              boxShadow: "0 20px 35px -10px rgba(15, 23, 42, 0.08)",
              borderColor: "rgba(99, 102, 241, 0.3)",
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
      className={`relative backdrop-blur-md bg-white/90 border border-slate-200/90 rounded-2xl shadow-xs transition-colors duration-200 overflow-hidden ${
        glow ? "ring-1 ring-indigo-500/10" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
