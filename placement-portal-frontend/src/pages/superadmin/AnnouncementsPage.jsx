// AnnouncementsPage — Broadcast composer + sent history (§5.8).
import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import {
  AnimatedWords,
  LiveStatusBeacon,
  SuperAdminTickerRibbon,
} from "../../components/common/MotionKit";

export default function AnnouncementsPage() {
  const announcements = useSuperAdminStore((s) => s.announcements);
  const sendAnnouncement = useSuperAdminStore((s) => s.sendAnnouncement);
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    sendAnnouncement(text.trim());
    setText("");
  };

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
              <Megaphone size={13} className="text-indigo-600" />
              <span>Broadcast Network</span>
            </span>
            <LiveStatusBeacon label="NETWORK READY" variant="active" />
          </div>

          <h1 className="cd-topbar__title text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            <AnimatedWords text="Platform Broadcasts & Announcements" delay={0.05} />
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Dispatch urgent updates, scheduled maintenance notices, and system-wide announcements to all institutional administrators.
          </p>
        </div>
      </div>

      <SuperAdminTickerRibbon className="mb-6" />

      {/* Compose panel */}
      <div className="cd-panel">
        <div style={{ padding: "var(--cd-card-padding)" }}>
          <label className="cd-label font-bold text-slate-800" htmlFor="announcement-text">
            Compose New Institutional Announcement
          </label>
          <textarea
            id="announcement-text"
            className="cd-textarea"
            rows={4}
            placeholder="Write a high-priority broadcast message for all College Administrators…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              className="cd-btn cd-btn--primary flex items-center gap-2"
              onClick={handleSend}
              disabled={!text.trim()}
            >
              <Send size={14} />
              <span>Broadcast Announcement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sent announcements */}
      <div className="cd-mt-lg">
        <h2 className="cd-section-heading">Dispatched Broadcast History</h2>
        {announcements.length === 0 ? (
          <div className="cd-panel">
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--cd-text-muted)", fontSize: 14 }}>
              No platform broadcasts dispatched yet.
            </div>
          </div>
        ) : (
          <div className="cd-panel">
            <div className="cd-panel__body">
              {announcements.map((ann) => (
                <div key={ann.id} className="cd-activity-row">
                  <div className="cd-activity-row__icon cd-activity-row__icon--blue">
                    <Megaphone size={16} />
                  </div>
                  <span className="cd-activity-row__text" style={{ lineHeight: 1.5 }}>
                    {ann.text}
                  </span>
                  <span className="cd-activity-row__time">
                    {format(new Date(ann.sentAt), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
