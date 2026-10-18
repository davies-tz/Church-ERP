import { useEffect, useState } from "react";
import { api, downloadFile } from "../lib/api";
import { T, VerificationRequest } from "../lib/types";

interface Props {
  t: T;
}

export function VerifyPage({ t }: Props) {
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setItems(await api<VerificationRequest[]>("/verification"));
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function act(id: string, action: string) {
    setError(null);
    try {
      await api<VerificationRequest>(`/verification/${id}/${action}`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="panel">
      <h2>{t("verificationQueue")} ({items.length})</h2>
      {items.length === 0 && <p className="muted">{t("noRequests")}</p>}
      {error && <div className="error">{error}</div>}
      {items.map((r) => (
        <div className="req-item" key={r.id}>
          <div className="req-head">
            <strong>{r.member_name}</strong>
            <span className="status pending">{t("pending")}</span>
          </div>
          <div className="muted small">
            {r.never_baptized
              ? t("neverBaptized")
              : `${t("baptizedAt")}: ${r.baptized_at_unit_name ?? "—"}`}
            {r.note ? ` · ${r.note}` : ""}
          </div>
          {r.documents.length > 0 && (
            <div className="doc-list">
              {r.documents.map((d) => (
                <button
                  key={d.id}
                  className="btn-muted btn-small"
                  onClick={() =>
                    downloadFile(`/verification/${r.id}/documents/${d.id}`, d.filename)
                  }
                >
                  ⬇ {d.filename}
                </button>
              ))}
            </div>
          )}
          <div className="req-actions">
            <button className="btn-approve" onClick={() => act(r.id, "approve")}>
              {t("approve")}
            </button>
            <button className="btn-muted" onClick={() => act(r.id, "reject")}>
              {t("reject")}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
