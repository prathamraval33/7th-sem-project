// AnnouncementsPage — Broadcast composer + sent history (§5.8).
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";

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
        <h1 className="cd-topbar__title">Announcements</h1>
      </div>

      {/* Compose panel */}
      <div className="cd-panel">
        <div style={{ padding: "var(--cd-card-padding)" }}>
          <label className="cd-label" htmlFor="announcement-text">New Announcement</label>
          <textarea
            id="announcement-text"
            className="cd-textarea"
            placeholder="Write a broadcast message for all College Admins…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              className="cd-btn cd-btn--primary"
              onClick={handleSend}
              disabled={!text.trim()}
            >
              Send Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Sent announcements */}
      <div className="cd-mt-lg">
        <h2 className="cd-section-heading">Sent Announcements</h2>
        {announcements.length === 0 ? (
          <div className="cd-panel">
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--cd-text-muted)", fontSize: 14 }}>
              No announcements sent yet.
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
