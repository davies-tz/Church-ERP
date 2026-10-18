import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Announcement, OrgUnit, T } from "../lib/types";

interface Props {
  t: T;
  caps: Set<string>;
}

const URGENCIES = ["low", "normal", "high", "urgent"];

function urgencyLabel(t: T, u: string) {
  return t(`urgency${u.charAt(0).toUpperCase()}${u.slice(1)}`);
}

export function AnnouncementsPage({ t, caps }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [scope, setScope] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setItems(await api<Announcement[]>("/announcements"));
  }

  useEffect(() => {
    refresh().catch(() => {});
    if (caps.has("manage_structure")) {
      api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
    }
  }, [caps]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<Announcement>("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title,
          body: body,
          urgency,
          org_unit_id: scope || null,
        }),
      });
      setOpen(false);
      setTitle("");
      setBody("");
      setUrgency("normal");
      setScope("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="stack">
      {caps.has("manage_structure") && (
        <section className="panel">
          <h2>{t("publishAnnouncement")}</h2>
          {error && <div className="error">{error}</div>}
          {!open && (
            <button className="btn-approve btn-small" onClick={() => setOpen(true)}>
              {t("publishAnnouncement")}
            </button>
          )}
          {open && (
            <form onSubmit={submit} className="stack verify-form">
              <label>{t("announcementTitle")}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              <label>{t("announcementBody")}</label>
              <input value={body} onChange={(e) => setBody(e.target.value)} required />
              <label>{t("urgency")}</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {urgencyLabel(t, u)}
                  </option>
                ))}
              </select>
              <label>{t("publishScope")}</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="">{t("entireInstitution")}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="req-actions">
                <button type="submit" className="btn-approve">
                  {t("publish")}
                </button>
                <button type="button" className="btn-muted" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="panel">
        <h2>{t("announcements")} ({items.length})</h2>
        {items.length === 0 && <p className="muted">{t("noAnnouncements")}</p>}
        {items.map((a) => (
          <div className="req-item" key={a.id}>
            <div className="req-head">
              <strong>{a.title}</strong>
              <span className={`status urgency-${a.urgency}`}>{urgencyLabel(t, a.urgency)}</span>
            </div>
            <p className="muted small">{a.body}</p>
            <div className="muted small">
              {a.org_unit_name ?? t("entireInstitution")}
              {a.published_by_name ? ` · ${a.published_by_name}` : ""}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
