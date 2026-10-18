import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Member, OrgUnit, T } from "../lib/types";

interface Props {
  t: T;
  onSaved: (m: Member) => void;
  onCancel: () => void;
}

type Fields = Record<string, string>;

export function MemberForm({ t, onSaved, onCancel }: Props) {
  const [f, setF] = useState<Fields>({ gender: "Male" });
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, []);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(f)) body[k] = v === "" ? null : v;
    body.full_name = f.full_name || "";
    try {
      const m = await api<Member>("/members", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSaved(m);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t("registerMember")}</h2>
        <button className="btn-muted btn-small" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
      <form onSubmit={submit} className="stack">
        <h3>{t("personalInfo")}</h3>
        <label>{t("fullName")}</label>
        <input value={f.full_name || ""} onChange={set("full_name")} />
        <div className="grid-2">
          <div>
            <label>{t("gender")}</label>
            <select value={f.gender || "Male"} onChange={set("gender")}>
              <option value="Male">{t("male")}</option>
              <option value="Female">{t("female")}</option>
            </select>
          </div>
          <div>
            <label>{t("dob")}</label>
            <input type="date" value={f.dob || ""} onChange={set("dob")} />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label>{t("marital")}</label>
            <input value={f.marital_status || ""} onChange={set("marital_status")} />
          </div>
          <div>
            <label>{t("occupation")}</label>
            <input value={f.occupation || ""} onChange={set("occupation")} />
          </div>
        </div>

        <h3>{t("contactInfo")}</h3>
        <div className="grid-2">
          <div>
            <label>{t("phone")}</label>
            <input value={f.phone || ""} onChange={set("phone")} />
          </div>
          <div>
            <label>{t("email")}</label>
            <input value={f.email || ""} onChange={set("email")} />
          </div>
        </div>

        <h3>{t("addressInfo")}</h3>
        <div className="grid-2">
          <div>
            <label>{t("region")}</label>
            <input value={f.region || ""} onChange={set("region")} />
          </div>
          <div>
            <label>{t("district")}</label>
            <input value={f.district || ""} onChange={set("district")} />
          </div>
        </div>

        <h3>{t("churchInfo")}</h3>
        <label>{t("unit")}</label>
        <select value={f.org_unit_id || ""} onChange={set("org_unit_id")}>
          <option value="">—</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <h3>{t("familyInfo")}</h3>
        <div className="grid-2">
          <div>
            <label>{t("spouse")}</label>
            <input value={f.spouse_name || ""} onChange={set("spouse_name")} />
          </div>
          <div>
            <label>{t("emergency")}</label>
            <input
              value={f.emergency_contact || ""}
              onChange={set("emergency_contact")}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={!f.full_name}>
          {t("save")}
        </button>
      </form>
    </section>
  );
}
