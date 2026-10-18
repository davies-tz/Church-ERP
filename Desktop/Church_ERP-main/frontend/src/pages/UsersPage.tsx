import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Assignment, Member, OrgUnit, Role, T } from "../lib/types";

interface Props {
  locale: string;
  t: T;
}

export function UsersPage({ locale, t }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [memberId, setMemberId] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [unitId, setUnitId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const [a, m, r, un] = await Promise.all([
      api<Assignment[]>("/assignments"),
      api<Member[]>("/members"),
      api<Role[]>("/roles"),
      api<OrgUnit[]>("/structure/units"),
    ]);
    setAssignments(a);
    setMembers(m);
    setRoles(r);
    setUnits(un);
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function appoint(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await api<Assignment>("/assignments", {
        method: "POST",
        body: JSON.stringify({
          member_id: memberId,
          role_key: roleKey,
          org_unit_id: unitId || null,
        }),
      });
      if (res.temp_password) {
        setNotice(`${res.user_name}: ${t("tempPassword")} = ${res.temp_password}`);
      }
      setMemberId("");
      setRoleKey("");
      setUnitId("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const roleLabel = (r: Role) => (locale === "sw" ? r.label_sw : r.label_en);

  return (
    <div className="two-col">
      <section className="panel">
        <h2>
          {t("assignments")} ({assignments.length})
        </h2>
        <table>
          <thead>
            <tr>
              <th>{t("user")}</th>
              <th>{t("role")}</th>
              <th>{t("scope")}</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.user_name}</td>
                <td>{locale === "sw" ? a.role_label_sw : a.role_label_en}</td>
                <td>{a.org_unit_name ?? t("tenantWide")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>{t("appointPerson")}</h2>
        <p className="muted small">{t("appointHint")}</p>
        <form onSubmit={appoint} className="stack">
          <label>{t("member")}</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">{t("selectMember")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {m.org_unit_name ? ` — ${m.org_unit_name}` : ""}
              </option>
            ))}
          </select>

          <label>{t("role")}</label>
          <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            <option value="">{t("selectRole")}</option>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {roleLabel(r)}
              </option>
            ))}
          </select>

          <label>{t("scope")}</label>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">{t("tenantWide")}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {error && <div className="error">{error}</div>}
          {notice && <div className="small produced">{notice}</div>}
          <button type="submit" disabled={!memberId || !roleKey}>
            {t("appoint")}
          </button>
        </form>
      </section>
    </div>
  );
}
