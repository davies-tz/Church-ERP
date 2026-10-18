import { FormEvent, useEffect, useRef, useState } from "react";
import { api, uploadForm } from "../lib/api";
import { MyVerification, OrgUnit, T, VerificationRequest } from "../lib/types";

interface Props {
  t: T;
}

export function VerificationBanner({ t }: Props) {
  const [mine, setMine] = useState<MyVerification | null>(null);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [church, setChurch] = useState("");
  const [never, setNever] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setMine(await api<MyVerification>("/verification/mine"));
  }
  useEffect(() => {
    refresh().catch(() => setMine(null));
    api<OrgUnit[]>("/structure/units").then(setUnits).catch(() => {});
  }, []);

  // hidden unless the user is a member and not yet verified
  if (!mine || mine.verification_status == null || mine.verification_status === "verified")
    return null;

  const status = mine.verification_status;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const req = await api<VerificationRequest>("/verification", {
        method: "POST",
        body: JSON.stringify({
          baptized_at_unit_id: never ? null : church || null,
          never_baptized: never,
          note: note || null,
        }),
      });
      const f = fileRef.current?.files?.[0];
      if (f) {
        const form = new FormData();
        form.append("file", f);
        await uploadForm(`/verification/${req.id}/documents`, form);
      }
      setOpen(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className={`verify-banner ${status}`}>
      <div className="verify-row">
        <span>
          {status === "pending" ? t("verifyPending") : t("verifyUnverified")}
        </span>
        {status === "unverified" && !open && (
          <button className="btn-approve btn-small" onClick={() => setOpen(true)}>
            {t("requestVerification")}
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="stack verify-form">
          <label className="check-row">
            <input
              type="checkbox"
              checked={never}
              onChange={(e) => setNever(e.target.checked)}
            />
            {t("neverBaptized")}
          </label>
          {!never && (
            <>
              <label>{t("baptizedAt")}</label>
              <select value={church} onChange={(e) => setChurch(e.target.value)}>
                <option value="">{t("selectChurch")}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label>{t("supportingDocument")}</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" />
          <label>{t("note")}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <div className="req-actions">
            <button type="submit" className="btn-approve">
              {t("submit")}
            </button>
            <button type="button" className="btn-muted" onClick={() => setOpen(false)}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
