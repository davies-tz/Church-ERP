import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Asset, Maintenance, T } from "../lib/types";

interface Props {
  asset: Asset;
  t: T;
}

function money(n: number | null, currency: string) {
  if (n == null) return "—";
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export function AssetDetail({ asset, t }: Props) {
  const [log, setLog] = useState<Maintenance[]>([]);
  const [date, setDate] = useState("");
  const [action, setAction] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLog(await api<Maintenance[]>(`/assets/${asset.id}/maintenance`));
  }
  useEffect(() => {
    setLog([]);
    refresh().catch(() => {});
  }, [asset.id]);

  const rows: [string, string | null][] = [
    [t("assetType"), asset.type],
    [t("unit"), asset.org_unit_name],
    [t("value"), money(asset.value, asset.currency)],
    [t("condition"), asset.condition],
    [t("regNo"), asset.reg_no],
    [t("custodian"), asset.custodian],
    [t("acquired"), asset.acquisition_date],
  ];

  async function record(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<Maintenance>(`/assets/${asset.id}/maintenance`, {
        method: "POST",
        body: JSON.stringify({ date, action, cost: cost ? Number(cost) : null }),
      });
      setDate("");
      setAction("");
      setCost("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{asset.name}</h2>
        <span className="muted small">{asset.code ?? ""}</span>
      </div>
      <dl className="profile-list">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div className="profile-row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      <h3>{t("maintenance")}</h3>
      {log.length === 0 && <p className="muted small">{t("noMaintenance")}</p>}
      {log.map((m) => (
        <div className="req-item" key={m.id}>
          <div className="req-head">
            <strong>{m.action}</strong>
            <span className="muted small">{m.date}</span>
          </div>
          <div className="muted small">
            {m.cost != null ? money(m.cost, asset.currency) : ""}
            {m.recorded_by_name ? ` · ${m.recorded_by_name}` : ""}
          </div>
        </div>
      ))}

      <form onSubmit={record} className="stack sacr-form">
        <h3>{t("recordMaintenance")}</h3>
        <div className="grid-2">
          <div>
            <label>{t("date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>{t("cost")}</label>
            <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <label>{t("action")}</label>
        <input value={action} onChange={(e) => setAction(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={!date || !action}>
          {t("save")}
        </button>
      </form>
    </section>
  );
}
