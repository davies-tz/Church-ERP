import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Member, OrgUnit, ServiceRequest, ServiceType, T } from "../lib/types";

interface Props {
  caps: Set<string>;
  locale: string;
  t: T;
}

export function RequestsPage({ caps, locale, t }: Props) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [feeById, setFeeById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const canApprove = caps.has("approve");
  const canSacraments = caps.has("manage_sacraments");
  const label = (o: { label_en: string; label_sw: string }) =>
    locale === "sw" ? o.label_sw : o.label_en;

  async function refresh() {
    setRequests(await api<ServiceRequest[]>("/service-requests"));
  }
  useEffect(() => {
    refresh().catch(() => {});
    api<ServiceType[]>("/service-types").then(setTypes).catch(() => {});
    api<Member[]>("/members").then(setMembers).catch(() => {});
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<ServiceRequest>("/service-requests", {
        method: "POST",
        body: JSON.stringify({
          member_id: memberId,
          type,
          org_unit_id: place || null,
          scheduled_date: date || null,
        }),
      });
      setMemberId("");
      setType("");
      setPlace("");
      setDate("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function act(id: string, action: string, extra?: object) {
    setError(null);
    try {
      await api<ServiceRequest>(`/service-requests/${id}/${action}`, {
        method: "POST",
        body: action === "complete" ? JSON.stringify(extra ?? {}) : undefined,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function actionsFor(r: ServiceRequest) {
    const canComplete = r.sacrament_type ? canSacraments : canApprove;
    return (
      <div className="req-actions">
        {r.status === "pending" && canApprove && (
          <>
            <button className="btn-approve" onClick={() => act(r.id, "approve")}>
              {t("approve")}
            </button>
            <button className="btn-muted" onClick={() => act(r.id, "reject")}>
              {t("reject")}
            </button>
          </>
        )}
        {r.status === "approved" && canComplete && (
          <>
            <input
              className="fee-input"
              type="number"
              min="0"
              placeholder={`${t("fee")} (${t("optional")})`}
              value={feeById[r.id] ?? ""}
              onChange={(e) =>
                setFeeById((p) => ({ ...p, [r.id]: e.target.value }))
              }
            />
            <button
              className="btn-approve"
              onClick={() =>
                act(r.id, "complete", {
                  fee: feeById[r.id] ? Number(feeById[r.id]) : null,
                })
              }
            >
              {t("complete")}
            </button>
          </>
        )}
        {(r.status === "pending" || r.status === "approved") && canApprove && (
          <button className="btn-muted" onClick={() => act(r.id, "cancel")}>
            {t("cancel")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="two-col">
      <section className="panel">
        <h2>
          {t("requests")} ({requests.length})
        </h2>
        {requests.length === 0 && <p className="muted">{t("noRequests")}</p>}
        {requests.map((r) => (
          <div className="req-item" key={r.id}>
            <div className="req-head">
              <strong>{label({ label_en: r.type_label_en, label_sw: r.type_label_sw })}</strong>
              <span className={`status ${r.status}`}>{t(r.status)}</span>
            </div>
            <div className="muted small">
              {r.member_name}
              {r.scheduled_date ? ` · ${r.scheduled_date}` : ""}
              {r.place ? ` · ${r.place}` : ""}
              {r.sacrament_type ? " · ⛪" : ""}
            </div>
            {r.produced_record_id && (
              <div className="small produced">✓ {t("producedRecord")}</div>
            )}
            {r.produced_fee_id && (
              <div className="small produced">✓ {t("feeRecorded")}</div>
            )}
            {actionsFor(r)}
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>{t("requestService")}</h2>
        <form onSubmit={submit} className="stack">
          <label>{t("member")}</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">{t("selectMember")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <label>{t("service")}</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("selectService")}</option>
            {types.map((x) => (
              <option key={x.key} value={x.key}>
                {label(x)}
                {x.sacrament_type ? " ⛪" : ""}
              </option>
            ))}
          </select>
          <label>{t("place")}</label>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">—</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <label>{t("schedule")}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={!memberId || !type}>
            {t("submit")}
          </button>
        </form>
      </section>
    </div>
  );
}
