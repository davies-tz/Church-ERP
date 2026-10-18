import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Asset, AssetType, OrgUnit, T } from "../lib/types";

interface Props {
  t: T;
  locale: string;
  onSaved: (a: Asset) => void;
  onCancel: () => void;
}

export function AssetForm({ t, locale, onSaved, onCancel }: Props) {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [f, setF] = useState<Record<string, string>>({ condition: "good" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AssetType[]>("/asset-types").then(setTypes).catch(() => {});
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, []);

  const label = (o: { label_en: string; label_sw: string }) =>
    locale === "sw" ? o.label_sw : o.label_en;
  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const a = await api<Asset>("/assets", {
        method: "POST",
        body: JSON.stringify({
          type: f.type,
          name: f.name,
          org_unit_id: f.org_unit_id || null,
          value: f.value ? Number(f.value) : null,
          condition: f.condition || null,
          reg_no: f.reg_no || null,
          custodian: f.custodian || null,
          acquisition_date: f.acquisition_date || null,
        }),
      });
      onSaved(a);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t("registerAsset")}</h2>
        <button className="btn-muted btn-small" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
      <form onSubmit={submit} className="stack">
        <div className="grid-2">
          <div>
            <label>{t("assetType")}</label>
            <select value={f.type || ""} onChange={set("type")}>
              <option value="">{t("chooseType")}</option>
              {types.map((x) => (
                <option key={x.key} value={x.key}>
                  {label(x)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>{t("condition")}</label>
            <select value={f.condition || "good"} onChange={set("condition")}>
              <option value="good">{t("good")}</option>
              <option value="fair">{t("fair")}</option>
              <option value="poor">{t("poor")}</option>
            </select>
          </div>
        </div>
        <label>{t("name")}</label>
        <input value={f.name || ""} onChange={set("name")} />
        <div className="grid-2">
          <div>
            <label>{t("value")}</label>
            <input type="number" min="0" value={f.value || ""} onChange={set("value")} />
          </div>
          <div>
            <label>{t("acquired")}</label>
            <input type="date" value={f.acquisition_date || ""} onChange={set("acquisition_date")} />
          </div>
        </div>
        <label>{t("regNo")}</label>
        <input value={f.reg_no || ""} onChange={set("reg_no")} />
        <label>{t("unit")}</label>
        <select value={f.org_unit_id || ""} onChange={set("org_unit_id")}>
          <option value="">—</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <label>{t("custodian")}</label>
        <input value={f.custodian || ""} onChange={set("custodian")} />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={!f.type || !f.name}>
          {t("save")}
        </button>
      </form>
    </section>
  );
}
