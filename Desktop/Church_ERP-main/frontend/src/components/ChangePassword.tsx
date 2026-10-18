import { FormEvent, useState } from "react";
import { api } from "../lib/api";
import { T } from "../lib/types";

interface Props {
  t: T;
  onClose: () => void;
}

export function ChangePassword({ t, onClose }: Props) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await api<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: cur, new_password: nw }),
      });
      setMsg(t("passwordChanged"));
      setCur("");
      setNw("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{t("changePassword")}</h2>
          <button className="btn-muted btn-small" onClick={onClose}>
            {t("close")}
          </button>
        </div>
        <form onSubmit={submit} className="stack">
          <label>{t("currentPassword")}</label>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <label>{t("newPassword")}</label>
          <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
          {err && <div className="error">{err}</div>}
          {msg && <div className="small produced">{msg}</div>}
          <button type="submit" disabled={!cur || !nw}>
            {t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}
