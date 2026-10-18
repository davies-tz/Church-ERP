import { FormEvent, useState } from "react";
import {
  fetchTemplates,
  fetchTenants,
  provisionTenant,
  ProvisionResult,
  TemplateInfo,
  TenantSummary,
} from "../lib/platform";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function OnboardingWizard() {
  const [token, setToken] = useState("dev-platform-token");
  const [unlocked, setUnlocked] = useState(false);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [template, setTemplate] = useState("");
  const [locale, setLocale] = useState("en");
  const [primary, setPrimary] = useState("#6d28d9");
  const [accent, setAccent] = useState("#f59e0b");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const [tpls, tns] = await Promise.all([
        fetchTemplates(token),
        fetchTenants(token),
      ]);
      setTemplates(tpls);
      setTenants(tns);
      if (tpls.length) setTemplate(tpls[0].key);
      setUnlocked(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onName(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  const slugTaken = !!slug && tenants.some((t) => t.slug === slug);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await provisionTenant(token, {
        slug,
        name,
        template,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        display_name: name,
        color_primary: primary,
        color_accent: accent,
        default_locale: locale,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-card">
          <div className="ok-badge">✓</div>
          <h1>{result.name} is ready</h1>
          <p className="muted">
            Provisioned with its own hierarchy, branding and first administrator.
          </p>
          <div className="result-row">
            <span>Portal</span>
            <code>
              {window.location.origin}
              {result.portal_path}
            </code>
          </div>
          <div className="result-row">
            <span>Admin</span>
            <code>{result.admin_email}</code>
          </div>
          <a className="btn-link" href={result.portal_path}>
            Open the church portal →
          </a>
          <button
            className="ghost"
            onClick={() => {
              setResult(null);
              setName("");
              setSlug("");
              setSlugEdited(false);
              setAdminName("");
              setAdminEmail("");
              setAdminPassword("");
            }}
          >
            Provision another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-wrap">
      <div className="wizard-card wide">
        <div className="wizard-head">
          <div className="platform-badge">⛪</div>
          <div>
            <h1>Onboard a church</h1>
            <p className="muted">Platform provisioning console</p>
          </div>
        </div>

        {!unlocked ? (
          <form onSubmit={unlock} className="stack">
            <label>Platform operator token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={busy}>
              {busy ? "…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="stack">
            <h3>Church</h3>
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="e.g. Grace Cathedral"
            />
            <label>Subdomain</label>
            <div className="slug-row">
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
              />
              <span className="slug-suffix">.churcherp.app</span>
            </div>
            {slugTaken && (
              <div className="error">Subdomain "{slug}" is already taken</div>
            )}

            <h3>Denomination template</h3>
            <div className="template-grid">
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={`template-card ${template === t.key ? "selected" : ""}`}
                  onClick={() => setTemplate(t.key)}
                >
                  <strong>{t.label}</strong>
                  <small>{t.levels.map((l) => l.label_en).join(" › ")}</small>
                </button>
              ))}
            </div>

            <h3>Branding</h3>
            <div className="grid-2">
              <div>
                <label>Default language</label>
                <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
              <div className="color-row">
                <div>
                  <label>Primary</label>
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                  />
                </div>
                <div>
                  <label>Accent</label>
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <h3>First administrator</h3>
            <div className="grid-2">
              <div>
                <label>Name</label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@church.org"
                />
              </div>
            </div>
            <label>Temporary password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="min 8 characters"
            />

            {error && <div className="error">{error}</div>}
            <button
              type="submit"
              disabled={
                busy ||
                !name ||
                !slug ||
                slugTaken ||
                !template ||
                !adminName ||
                !adminEmail ||
                adminPassword.length < 8
              }
            >
              {busy ? "Provisioning…" : "Create church"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
