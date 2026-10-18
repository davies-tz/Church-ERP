import { FormEvent, useState } from "react";
import { api, setToken } from "../lib/api";
import { Branding } from "../lib/branding";
import { makeT } from "../i18n";
import { LanguageToggle } from "../components/LanguageToggle";

interface Props {
  branding: Branding;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function Login({ branding, locale, onLocaleChange, onLogin, onRegister }: Props) {
  const t = makeT(locale);
  const [email, setEmail] = useState(`admin@${branding.slug}.local`);
  const [password, setPassword] = useState("password");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      onLogin();
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <LanguageToggle value={locale} onChange={onLocaleChange} />
        <div className="brand-badge">{branding.display_name.charAt(0)}</div>
        <h1>{branding.display_name}</h1>
        {branding.tagline && <p className="muted">{branding.tagline}</p>}
        <form onSubmit={submit}>
          <label>{t("email")}</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <label>{t("password")}</label>
          <div className="pw-field">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? t("hide") : t("show")}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
          <button disabled={busy} type="submit">
            {busy ? "…" : t("login")}
          </button>
        </form>
        <button className="link-btn" onClick={onRegister}>
          {t("registerAsMember")}
        </button>
        <div className="tenant-hint">tenant: {branding.slug}</div>
      </div>
    </div>
  );
}
