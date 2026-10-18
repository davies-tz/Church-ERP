import { useEffect, useState } from "react";
import { api, clearToken } from "./lib/api";
import { Branding } from "./lib/branding";
import { fetchPermissions, Permissions } from "./lib/permissions";
import { Me } from "./lib/types";
import { makeT } from "./i18n";
import { ChangePassword } from "./components/ChangePassword";
import { NotificationBell } from "./components/NotificationBell";
import { VerificationBanner } from "./components/VerificationBanner";
import { LanguageToggle } from "./components/LanguageToggle";
import { AnnouncementCard } from "./components/AnnouncementCard";
import { DashboardPage } from "./pages/DashboardPage";
import { VerifyPage } from "./pages/VerifyPage";
import { MembersPage } from "./pages/MembersPage";
import { StructurePage } from "./pages/StructurePage";
import { RequestsPage } from "./pages/RequestsPage";
import { TransfersPage } from "./pages/TransfersPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { FinancePage } from "./pages/FinancePage";
import { AssetsPage } from "./pages/AssetsPage";
import { UsersPage } from "./pages/UsersPage";

interface Props {
  branding: Branding;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onLogout: () => void;
}

export function AppShell({ branding, locale, onLocaleChange, onLogout }: Props) {
  const t = makeT(locale);
  const [me, setMe] = useState<Me | null>(null);
  const [perms, setPerms] = useState<Permissions | null>(null);
  const [section, setSection] = useState<string>("members");
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(() => {
    api<Me>("/auth/me").then(setMe).catch(() => onLogout());
    fetchPermissions()
      .then((p) => {
        setPerms(p);
        // land admins on the consolidated dashboard
        if (p.capabilities.includes("view_reports")) setSection("dashboard");
      })
      .catch(() => {});
  }, []);

  const caps = new Set(perms?.capabilities ?? []);
  const nav = [
    ...(caps.has("view_reports") ? [{ id: "dashboard", label: t("dashboard") }] : []),
    { id: "members", label: t("members") },
    { id: "structure", label: t("structure") },
    { id: "requests", label: t("requests") },
    { id: "transfers", label: t("transfers") },
    { id: "announcements", label: t("announcements") },
    ...(caps.has("manage_members") ? [{ id: "verify", label: t("verify") }] : []),
    ...(caps.has("view_finance") ? [{ id: "finance", label: t("finance") }] : []),
    ...(caps.has("manage_assets") ? [{ id: "assets", label: t("assets") }] : []),
    ...(caps.has("appoint") ? [{ id: "users", label: t("users") }] : []),
  ];

  function logout() {
    clearToken();
    onLogout();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-badge sm">{branding.display_name.charAt(0)}</div>
          <strong>{branding.display_name}</strong>
        </div>
        <div className="top-right">
          {me && (
            <span className="muted">
              {me.name} · {me.role}
            </span>
          )}
          <LanguageToggle value={locale} onChange={onLocaleChange} />
          <NotificationBell t={t} onNavigate={(s) => setSection(s)} />
          <button className="ghost" onClick={() => setShowChangePw(true)}>
            🔑
          </button>
          <button className="ghost" onClick={logout}>
            {t("logout")}
          </button>
        </div>
      </header>

      {showChangePw && (
        <ChangePassword t={t} onClose={() => setShowChangePw(false)} />
      )}

      <div className="layout">
        <nav className="sidenav">
          {nav.map((n) => (
            <button
              key={n.id}
              className={section === n.id ? "active" : ""}
              onClick={() => setSection(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <main className="main-area">
          <VerificationBanner t={t} />
          <AnnouncementCard t={t} onNavigate={(s) => setSection(s)} />
          {section === "dashboard" && (
            <DashboardPage locale={locale} t={t} onNavigate={(s) => setSection(s)} />
          )}
          {section === "members" && (
            <MembersPage caps={caps} locale={locale} t={t} me={me} />
          )}
          {section === "structure" && (
            <StructurePage caps={caps} locale={locale} t={t} />
          )}
          {section === "requests" && (
            <RequestsPage caps={caps} locale={locale} t={t} />
          )}
          {section === "transfers" && <TransfersPage t={t} caps={caps} me={me} />}
          {section === "announcements" && <AnnouncementsPage t={t} caps={caps} />}
          {section === "verify" && <VerifyPage t={t} />}
          {section === "finance" && (
            <FinancePage caps={caps} locale={locale} t={t} />
          )}
          {section === "assets" && (
            <AssetsPage caps={caps} locale={locale} t={t} />
          )}
          {section === "users" && <UsersPage locale={locale} t={t} />}
        </main>
      </div>
    </div>
  );
}
