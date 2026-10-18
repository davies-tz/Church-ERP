import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LatestAnnouncement, T } from "../lib/types";

interface Props {
  t: T;
  onNavigate: (section: string) => void;
}

export function AnnouncementCard({ t, onNavigate }: Props) {
  const [latest, setLatest] = useState<LatestAnnouncement | null>(null);

  useEffect(() => {
    api<LatestAnnouncement>("/announcements/latest").then(setLatest).catch(() => {});
  }, []);

  const a = latest?.announcement;
  if (!a) return null;

  return (
    <button className={`announcement-card urgency-${a.urgency}`} onClick={() => onNavigate("announcements")}>
      <div className="announcement-head">
        <span className="announcement-label">{t("latestAnnouncement")}</span>
        <span className={`status urgency-${a.urgency}`}>{t(`urgency${a.urgency[0].toUpperCase()}${a.urgency.slice(1)}`)}</span>
      </div>
      <strong>{a.title}</strong>
      <p className="muted small">{a.body}</p>
    </button>
  );
}
