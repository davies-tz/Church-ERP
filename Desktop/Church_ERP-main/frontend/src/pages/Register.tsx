import { FormEvent, useEffect, useState } from "react";
import { api, setToken } from "../lib/api";
import { Branding } from "../lib/branding";
import { ChurchOption } from "../lib/types";
import { makeT } from "../i18n";
import { LanguageToggle } from "../components/LanguageToggle";

interface Props {
  branding: Branding;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onAuthed: () => void;
  onSwitch: () => void;
}

export function Register({ branding, locale, onLocaleChange, onAuthed, onSwitch }: Props) {
  const t = makeT(locale);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [f, setF] = useState<Record<string, string>>({ gender: "Male" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ChurchOption[]>("/tenant/churches").then(setChurches).catch(() => {});
  }, []);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ access_token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: f.full_name,
          email: f.email,
          password: f.password,
          org_unit_id: f.org_unit_id,
          phone: f.phone || null,
          gender: f.gender || null,
          dob: f.dob || null,
          region: f.region || null,
        }),
      });
      setToken(res.access_token);
      onAuthed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card wide-card">
        <LanguageToggle value={locale} onChange={onLocaleChange} />
        <div className="brand-badge">{branding.display_name.charAt(0)}</div>
        <h1>{branding.display_name}</h1>
        <p className="muted">{t("registerAsMember")}</p>
        <form onSubmit={submit}>
          <label>{t("fullName")}</label>
          <input value={f.full_name || ""} onChange={set("full_name")} />
          <label>{t("church")}</label>
          <select value={f.org_unit_id || ""} onChange={set("org_unit_id")}>
            <option value="">{t("selectChurch")}</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="grid-2">
            <div>
              <label>{t("gender")}</label>
              <select value={f.gender || "Male"} onChange={set("gender")}>
                <option value="Male">{t("male")}</option>
                <option value="Female">{t("female")}</option>
              </select>
            </div>
            <div>
              <label>{t("phone")}</label>
              <input value={f.phone || ""} onChange={set("phone")} />
            </div>
          </div>
          <label>{t("email")}</label>
          <input type="email" value={f.email || ""} onChange={set("email")} />
          <label>{t("password")}</label>
          <div className="pw-field">
            <input
              type={showPw ? "text" : "password"}
              value={f.password || ""}
              onChange={set("password")}
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}>
              {showPw ? t("hide") : t("show")}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
          <button
            type="submit"
            disabled={busy || !f.full_name || !f.email || !f.password || !f.org_unit_id}
          >
            {busy ? "…" : t("signUp")}
          </button>
        </form>
        <button className="link-btn" onClick={onSwitch}>
          {t("haveAccount")}
        </button>
      </div>
    </div>
  );
}
