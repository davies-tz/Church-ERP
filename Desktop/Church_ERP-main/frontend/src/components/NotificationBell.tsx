import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AppNotification, T } from "../lib/types";

interface Props {
  t: T;
  onNavigate?: (section: string) => void;
}

export function NotificationBell({ t, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  async function refreshCount() {
    try {
      const c = await api<{ count: number }>("/notifications/unread-count");
      setUnread(c.count);
    } catch {
      /* ignore */
    }
  }
  async function refreshList() {
    setItems(await api<AppNotification[]>("/notifications"));
  }

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 30000);
    return () => clearInterval(id);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await refreshList().catch(() => {});
  }

  async function onItem(n: AppNotification) {
    if (!n.read) {
      await api<void>(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (n.link && onNavigate) {
      onNavigate(n.link);
      setOpen(false);
    }
    await refreshCount();
    await refreshList().catch(() => {});
  }

  async function markAll() {
    await api<void>("/notifications/read-all", { method: "POST" }).catch(() => {});
    await refreshCount();
    await refreshList().catch(() => {});
  }

  return (
    <div className="notif">
      <button className="ghost notif-btn" onClick={toggle}>
        🔔
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>{t("notifications")}</strong>
            <button className="btn-muted btn-small" onClick={markAll}>
              {t("markAllRead")}
            </button>
          </div>
          {items.length === 0 && <p className="muted small">{t("noNotifications")}</p>}
          {items.map((n) => (
            <button
              key={n.id}
              className={`notif-item ${n.read ? "" : "unread"}`}
              onClick={() => onItem(n)}
            >
              <strong>{n.title}</strong>
              {n.body && <div className="muted small">{n.body}</div>}
              <div className="notif-date">{n.created_at.slice(0, 10)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
