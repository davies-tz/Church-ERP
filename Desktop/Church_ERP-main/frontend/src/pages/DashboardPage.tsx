import { useEffect, useState } from "react";
import { api, downloadFile } from "../lib/api";
import { Dashboard, T } from "../lib/types";

interface Props {
  locale: string;
  t: T;
  onNavigate: (section: string) => void;
}

function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export function DashboardPage({ locale, t, onNavigate }: Props) {
  const [d, setD] = useState<Dashboard | null>(null);
  const label = (o: { label_en: string; label_sw: string }) =>
    locale === "sw" ? o.label_sw : o.label_en;

  useEffect(() => {
    api<Dashboard>("/reports/dashboard").then(setD).catch(() => {});
  }, []);

  if (!d) return <p className="muted">…</p>;

  const cur = d.finance.currency;
  const maxUnit = Math.max(1, ...d.members_by_unit.map((u) => u.count));
  const maxCat = Math.max(1, ...d.finance_by_category.map((c) => c.total));

  return (
    <div className="stack-panels">
      <div className="stat-grid">
        <button className="stat-card" onClick={() => onNavigate("members")}>
          <span>{t("members")}</span>
          <strong>{d.members_total}</strong>
        </button>
        <button className="stat-card" onClick={() => onNavigate("finance")}>
          <span>{t("net")}</span>
          <strong>{money(d.finance.net, cur)}</strong>
        </button>
        <button className="stat-card" onClick={() => onNavigate("assets")}>
          <span>{t("totalValue")}</span>
          <strong>{money(d.assets.total_value, cur)}</strong>
        </button>
        <button className="stat-card" onClick={() => onNavigate("requests")}>
          <span>{t("pendingRequests")}</span>
          <strong>{d.requests_pending}</strong>
        </button>
      </div>

      <div className="md-grid">
        <section className="panel">
          <h2>{t("membersByUnit")}</h2>
          {d.members_by_unit.map((u) => (
            <div className="bar-row" key={u.name}>
              <span className="bar-label">{u.name}</span>
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{ width: `${(u.count / maxUnit) * 100}%` }}
                />
              </span>
              <span className="bar-val">{u.count}</span>
            </div>
          ))}
          {d.members_by_unit.length === 0 && <p className="muted">—</p>}

          <h3>{t("sacramentsByType")}</h3>
          {d.sacraments_by_type.map((s) => (
            <div className="list-line" key={s.key}>
              <span>{label(s)}</span>
              <strong>{s.count}</strong>
            </div>
          ))}
          {d.sacraments_by_type.length === 0 && <p className="muted">—</p>}
        </section>

        <section className="panel">
          <h2>{t("financeByCategory")}</h2>
          {d.finance_by_category.map((c) => (
            <div className="bar-row" key={c.category}>
              <span className="bar-label">{label(c)}</span>
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{
                    width: `${(c.total / maxCat) * 100}%`,
                    background:
                      c.direction === "expense"
                        ? "#b91c1c"
                        : "var(--brand-primary)",
                  }}
                />
              </span>
              <span className="bar-val">{money(c.total, cur)}</span>
            </div>
          ))}
          {d.finance_by_category.length === 0 && <p className="muted">—</p>}

          <h3>{t("reportsCenter")}</h3>
          <div className="report-btns">
            <button className="btn-muted" onClick={() => downloadFile("/reports/members.csv", "members.csv")}>
              ⬇ {t("members")} CSV
            </button>
            <button className="btn-muted" onClick={() => downloadFile("/reports/finance.csv", "finance.csv")}>
              ⬇ {t("finance")} CSV
            </button>
            <button className="btn-muted" onClick={() => downloadFile("/reports/sacraments.csv", "sacraments.csv")}>
              ⬇ {t("sacramentalRecord")} CSV
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
