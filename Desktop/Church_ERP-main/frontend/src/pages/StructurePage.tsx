import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, uploadForm } from "../lib/api";
import { ImportResult, Level, OrgUnit, T } from "../lib/types";

interface Props {
  caps: Set<string>;
  locale: string;
  t: T;
}

export function StructurePage({ caps, locale, t }: Props) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [filter, setFilter] = useState("");
  const [levelKey, setLevelKey] = useState("");
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = caps.has("manage_structure");

  async function refresh() {
    const [lv, u] = await Promise.all([
      api<Level[]>("/structure/levels"),
      api<OrgUnit[]>("/structure/units"),
    ]);
    setLevels(lv);
    setUnits(u);
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const label = (l: { label_en: string; label_sw: string }) =>
    locale === "sw" ? l.label_sw : l.label_en;
  const levelLabel = (key: string) => {
    const l = levels.find((x) => x.key === key);
    return l ? label(l) : key;
  };

  const shown = filter ? units.filter((u) => u.level_key === filter) : units;
  const selectedLevel = levels.find((l) => l.key === levelKey);
  const parentOptions = useMemo(
    () =>
      selectedLevel?.parent_key
        ? units.filter((u) => u.level_key === selectedLevel.parent_key)
        : [],
    [selectedLevel, units]
  );

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<OrgUnit>("/structure/units", {
        method: "POST",
        body: JSON.stringify({
          level_key: levelKey,
          name,
          parent_id: parentId || null,
          code: code || null,
          region: region || null,
          district: district || null,
        }),
      });
      setName("");
      setCode("");
      setRegion("");
      setDistrict("");
      setParentId("");
      setLevelKey("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function doImport() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setImportMsg(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await uploadForm<ImportResult>("/structure/import", form);
      setImportMsg(
        `${res.created} imported` +
          (res.errors.length ? ` · ${res.errors.length} error(s): ${res.errors[0]}` : "")
      );
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (err) {
      setImportMsg((err as Error).message);
    }
  }

  return (
    <div className={canManage ? "two-col" : ""}>
      <section className="panel">
        <div className="panel-head">
          <h2>{t("structure")}</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t("allLevels")}</option>
            {levels.map((l) => (
              <option key={l.key} value={l.key}>
                {label(l)}
              </option>
            ))}
          </select>
        </div>
        <div>
          {shown.map((u) => (
            <div
              className="tree-row"
              key={u.id}
              style={{ paddingLeft: filter ? 0 : `${u.depth * 22}px` }}
            >
              <span className="tree-badge">{levelLabel(u.level_key)}</span>
              <div className="unit-body">
                <div>
                  <strong>{u.name}</strong>
                  {u.code ? <span className="muted small"> · {u.code}</span> : null}
                  {u.region ? <span className="muted small"> · {u.region}</span> : null}
                </div>
                {u.leaders.length > 0 && (
                  <div className="muted small">
                    {u.leaders
                      .map(
                        (l) =>
                          `${locale === "sw" ? l.role_label_sw : l.role_label_en}: ${l.user_name}`
                      )
                      .join(" · ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="muted">—</p>}
        </div>
      </section>

      {canManage && (
        <div className="stack-panels">
          <section className="panel">
            <h2>{t("addUnit")}</h2>
            <form onSubmit={add} className="stack">
              <label>{t("level")}</label>
              <select
                value={levelKey}
                onChange={(e) => {
                  setLevelKey(e.target.value);
                  setParentId("");
                }}
              >
                <option value="">{t("selectLevel")}</option>
                {levels.map((l) => (
                  <option key={l.key} value={l.key}>
                    {label(l)}
                  </option>
                ))}
              </select>
              {selectedLevel?.parent_key && (
                <>
                  <label>{t("parent")}</label>
                  <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="">{t("selectParent")}</option>
                    {parentOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <label>{t("name")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid-2">
                <div>
                  <label>{t("churchId")}</label>
                  <input value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div>
                  <label>{t("region")}</label>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
              </div>
              <label>{t("district")}</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} />
              {error && <div className="error">{error}</div>}
              <button
                type="submit"
                disabled={!levelKey || !name || (!!selectedLevel?.parent_key && !parentId)}
              >
                {t("add")}
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>{t("batchImport")}</h2>
            <p className="muted small">{t("importHint")}</p>
            <input ref={fileRef} type="file" accept=".csv" />
            <button className="btn-muted" onClick={doImport} style={{ marginTop: "0.6rem" }}>
              {t("import")}
            </button>
            {importMsg && <div className="small produced">{importMsg}</div>}
          </section>
        </div>
      )}
    </div>
  );
}
