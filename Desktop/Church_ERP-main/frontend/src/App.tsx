import { useEffect, useState } from "react";
import { getToken } from "./lib/api";
import { applyBranding, Branding, fetchBranding } from "./lib/branding";
import { getStoredLocale, storeLocale } from "./lib/locale";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AppShell } from "./AppShell";

export default function App() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("en");

  useEffect(() => {
    fetchBranding()
      .then((b) => {
        applyBranding(b);
        setBranding(b);
        setLocale(getStoredLocale(b.default_locale));
      })
      .catch((e) => setError(e.message));
  }, []);

  function changeLocale(l: string) {
    storeLocale(l);
    setLocale(l);
  }

  if (error) return <div className="center muted">Could not load tenant: {error}</div>;
  if (!branding) return <div className="center muted">Loading…</div>;

  if (authed)
    return (
      <AppShell
        branding={branding}
        locale={locale}
        onLocaleChange={changeLocale}
        onLogout={() => setAuthed(false)}
      />
    );

  return mode === "register" ? (
    <Register
      branding={branding}
      locale={locale}
      onLocaleChange={changeLocale}
      onAuthed={() => setAuthed(true)}
      onSwitch={() => setMode("login")}
    />
  ) : (
    <Login
      branding={branding}
      locale={locale}
      onLocaleChange={changeLocale}
      onLogin={() => setAuthed(true)}
      onRegister={() => setMode("register")}
    />
  );
}
