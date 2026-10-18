import { FormEvent, useEffect, useState } from "react";
import { api, downloadFile } from "../lib/api";
import { Me, MyTransfer, OrgUnit, T, TransferRequest } from "../lib/types";

interface Props {
  t: T;
  caps: Set<string>;
  me: Me | null;
}

const STATUS_LABEL_KEY: Record<string, string> = {
  pending_source: "transferPendingSource",
  pending_destination: "transferPendingDestination",
  approved: "transferApproved",
  rejected: "transferRejected",
};

export function TransfersPage({ t, caps, me }: Props) {
  const [mine, setMine] = useState<MyTransfer | null>(null);
  const [queue, setQueue] = useState<TransferRequest[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [toUnit, setToUnit] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refreshMine() {
    if (me?.member_id) setMine(await api<MyTransfer>("/transfers/mine"));
  }
  async function refreshQueue() {
    if (caps.has("manage_members")) setQueue(await api<TransferRequest[]>("/transfers"));
  }

  useEffect(() => {
    refreshMine().catch(() => {});
    refreshQueue().catch(() => {});
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, [me, caps]);

  const openRequest = mine?.request &&
    ["pending_source", "pending_destination"].includes(mine.request.status);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<TransferRequest>("/transfers", {
        method: "POST",
        body: JSON.stringify({ to_unit_id: toUnit, reason: reason || null }),
      });
      setOpen(false);
      setToUnit("");
      setReason("");
      await refreshMine();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function act(id: string, action: string) {
    setError(null);
    try {
      await api<TransferRequest>(`/transfers/${id}/${action}`, { method: "POST" });
      await refreshQueue();
      await refreshMine();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="stack">
      {me?.member_id && (
        <section className="panel">
          <h2>{t("myTransfer")}</h2>
          {error && <div className="error">{error}</div>}
          {mine?.request ? (
            <div className="req-item">
              <div className="req-head">
                <strong>
                  {mine.request.from_unit_name ?? "—"} → {mine.request.to_unit_name}
                </strong>
                <span className={`status ${mine.request.status}`}>
                  {t(STATUS_LABEL_KEY[mine.request.status] ?? mine.request.status)}
                </span>
              </div>
              {mine.request.reason && (
                <div className="muted small">{mine.request.reason}</div>
              )}
              {mine.request.has_letter && (
                <button
                  className="btn-muted btn-small"
                  onClick={() =>
                    downloadFile(`/transfers/${mine!.request!.id}/letter.pdf`, "transfer-letter.pdf")
                  }
                >
                  ⬇ {t("downloadLetter")}
                </button>
              )}
            </div>
          ) : (
            <p className="muted">{t("noTransfers")}</p>
          )}

          {!openRequest && !open && (
            <button className="btn-approve btn-small" onClick={() => setOpen(true)}>
              {t("requestTransfer")}
            </button>
          )}
          {open && (
            <form onSubmit={submit} className="stack verify-form">
              <label>{t("transferTo")}</label>
              <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} required>
                <option value="">{t("selectChurch")}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <label>{t("transferReason")}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="req-actions">
                <button type="submit" className="btn-approve">
                  {t("submit")}
                </button>
                <button type="button" className="btn-muted" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {caps.has("manage_members") && (
        <section className="panel">
          <h2>{t("transfers")} ({queue.length})</h2>
          {queue.length === 0 && <p className="muted">{t("noTransfers")}</p>}
          {queue.map((r) => (
            <div className="req-item" key={r.id}>
              <div className="req-head">
                <strong>{r.member_name}</strong>
                <span className={`status ${r.status}`}>
                  {t(STATUS_LABEL_KEY[r.status] ?? r.status)}
                </span>
              </div>
              <div className="muted small">
                {t("from")}: {r.from_unit_name ?? "—"} · {t("to")}: {r.to_unit_name}
                {r.reason ? ` · ${r.reason}` : ""}
              </div>
              {r.has_letter && (
                <div className="doc-list">
                  <button
                    className="btn-muted btn-small"
                    onClick={() => downloadFile(`/transfers/${r.id}/letter.pdf`, "transfer-letter.pdf")}
                  >
                    ⬇ {t("downloadLetter")}
                  </button>
                </div>
              )}
              <div className="req-actions">
                {r.status === "pending_source" ? (
                  <>
                    <button className="btn-approve" onClick={() => act(r.id, "approve-source")}>
                      {t("approveSource")}
                    </button>
                    <button className="btn-muted" onClick={() => act(r.id, "reject-source")}>
                      {t("rejectSource")}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-approve" onClick={() => act(r.id, "approve-destination")}>
                      {t("approveDestination")}
                    </button>
                    <button className="btn-muted" onClick={() => act(r.id, "reject-destination")}>
                      {t("rejectDestination")}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
