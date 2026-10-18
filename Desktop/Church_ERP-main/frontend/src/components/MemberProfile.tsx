import { FormEvent, useEffect, useRef, useState } from "react";
import { api, fetchObjectUrl, uploadForm } from "../lib/api";
import { Member, T } from "../lib/types";

interface Props {
  member: Member;
  t: T;
  canEdit: boolean;
  onUpdated: () => void;
}

const EDIT_FIELDS: [keyof Member, string][] = [
  ["gender", "gender"],
  ["dob", "dob"],
  ["marital_status", "marital"],
  ["occupation", "occupation"],
  ["phone", "phone"],
  ["email", "email"],
  ["region", "region"],
  ["district", "district"],
  ["spouse_name", "spouse"],
  ["emergency_contact", "emergency"],
];

export function MemberProfile({ member, t, canEdit, onUpdated }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(false);
    setPhoto(null);
    if (member.has_photo) fetchObjectUrl(`/members/${member.id}/photo`).then(setPhoto);
  }, [member.id, member.has_photo]);

  function startEdit() {
    const init: Record<string, string> = { full_name: member.full_name };
    for (const [k] of EDIT_FIELDS) init[k as string] = (member[k] as string) ?? "";
    setF(init);
    setEditing(true);
  }
  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(f)) body[k] = v === "" ? null : v;
    try {
      await api<Member>(`/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function uploadPhoto(e: { target: { files: FileList | null } }) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      await uploadForm(`/members/${member.id}/photo`, form);
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const rows: [string, string | null][] = [
    [t("unit"), member.org_unit_name],
    [t("gender"), member.gender],
    [t("dob"), member.dob],
    [t("marital"), member.marital_status],
    [t("occupation"), member.occupation],
    [t("phone"), member.phone],
    [t("email"), member.email],
    [t("region"), member.region],
    [t("spouse"), member.spouse_name],
    [t("emergency"), member.emergency_contact],
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="member-head">
          <div className="avatar">
            {photo ? <img src={photo} alt="" /> : member.full_name.charAt(0)}
          </div>
          <div>
            <h2>{member.full_name}</h2>
            <span className="muted small">{member.member_no}</span>
          </div>
        </div>
        {canEdit && !editing && (
          <div className="req-actions">
            <button className="btn-muted btn-small" onClick={startEdit}>
              {t("edit")}
            </button>
            <button
              className="btn-muted btn-small"
              onClick={() => fileRef.current?.click()}
            >
              {t("photo")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={uploadPhoto}
            />
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {editing ? (
        <form onSubmit={save} className="stack">
          <label>{t("fullName")}</label>
          <input value={f.full_name || ""} onChange={set("full_name")} />
          <div className="grid-2">
            {EDIT_FIELDS.map(([k, labelKey]) => (
              <div key={k as string}>
                <label>{t(labelKey)}</label>
                <input
                  type={k === "dob" ? "date" : "text"}
                  value={f[k as string] || ""}
                  onChange={set(k as string)}
                />
              </div>
            ))}
          </div>
          <div className="req-actions">
            <button type="submit" className="btn-approve">
              {t("save")}
            </button>
            <button
              type="button"
              className="btn-muted"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
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
      )}
    </section>
  );
}
