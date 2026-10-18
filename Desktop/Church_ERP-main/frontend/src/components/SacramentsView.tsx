import { FormEvent, useEffect, useState } from "react";
import { api, downloadFile } from "../lib/api";
import { Member, OrgUnit, SacramentType, T, Timeline } from "../lib/types";

interface Props {
  member: Member;
  caps: Set<string>;
  locale: string;
  t: T;
}

export function SacramentsView({ member, caps, locale, t }: Props) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [types, setTypes] = useState<SacramentType[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [minister, setMinister] = useState("");
  const [book, setBook] = useState("");
  const [page, setPage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canRecord = caps.has("manage_sacraments");

  const label = (o: { label_en: string; label_sw: string }) =>
    locale === "sw" ? o.label_sw : o.label_en;
  const typeLabel = (k: string) => {
    const x = types.find((tt) => tt.key === k);
    return x ? label(x) : k;
  };

  useEffect(() => {
    setTimeline(null);
    api<Timeline>(`/members/${member.id}/sacraments`).then(setTimeline).catch(() => {});
  }, [member.id]);

  useEffect(() => {
    api<SacramentType[]>("/sacrament-types").then(setTypes).catch(() => {});
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, []);

  async function record(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const tl = await api<Timeline>(`/members/${member.id}/sacraments`, {
        method: "POST",
        body: JSON.stringify({
          type,
          date,
          org_unit_id: place || null,
          minister_name: minister || null,
          register_book: book || null,
          register_page: page || null,
        }),
      });
      setTimeline(tl);
      setType("");
      setDate("");
      setPlace("");
      setMinister("");
      setBook("");
      setPage("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="panel">
      <h2>
        {t("sacramentalRecord")} — {member.full_name}
      </h2>

      {timeline && timeline.records.length === 0 && (
        <p className="muted">{t("noRecords")}</p>
      )}
      <div className="timeline">
        {timeline?.records.map((r) => (
          <div className="sacr-item" key={r.id}>
            <span className={`sacr-badge ${r.is_master ? "master" : ""}`}>
              {typeLabel(r.type)}
            </span>
            <div className="sacr-body">
              <div>
                <strong>{r.date}</strong>
                {r.place ? ` · ${r.place}` : ""}
                {r.is_master ? ` · ${t("masterRecord")}` : ""}
              </div>
              {(r.minister_name || r.register_book) && (
                <div className="muted small">
                  {r.minister_name}
                  {r.register_book
                    ? ` · ${t("register")} ${r.register_book}/${r.register_page || ""}`
                    : ""}
                </div>
              )}
              {r.annotations.length > 0 && (
                <div className="annotations">
                  {r.annotations.map((a, i) => (
                    <div className="annotation" key={i}>
                      ↳ {a.text}
                    </div>
                  ))}
                </div>
              )}
              {canRecord && (
                <button
                  className="btn-muted btn-small cert-btn"
                  onClick={() =>
                    downloadFile(
                      `/sacraments/${r.id}/certificate.pdf`,
                      `${r.type}-certificate.pdf`
                    )
                  }
                >
                  ⬇ {t("certificate")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canRecord && (
        <form onSubmit={record} className="stack sacr-form">
          <h3>{t("recordSacrament")}</h3>
          <div className="grid-2">
            <div>
              <label>{t("type")}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{t("selectType")}</option>
                {types.map((x) => (
                  <option key={x.key} value={x.key}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("date")}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label>{t("place")}</label>
              <select value={place} onChange={(e) => setPlace(e.target.value)}>
                <option value="">—</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("minister")}</label>
              <input value={minister} onChange={(e) => setMinister(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label>{t("registerBook")}</label>
              <input value={book} onChange={(e) => setBook(e.target.value)} />
            </div>
            <div>
              <label>{t("registerPage")}</label>
              <input value={page} onChange={(e) => setPage(e.target.value)} />
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={!type || !date}>
            {t("save")}
          </button>
        </form>
      )}
    </section>
  );
}
