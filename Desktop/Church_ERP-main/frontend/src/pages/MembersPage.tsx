import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Me, Member, T } from "../lib/types";
import { SacramentsView } from "../components/SacramentsView";
import { MemberForm } from "../components/MemberForm";
import { MemberProfile } from "../components/MemberProfile";

interface Props {
  caps: Set<string>;
  locale: string;
  t: T;
  me: Me | null;
}

export function MembersPage({ caps, locale, t, me }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [mode, setMode] = useState<"view" | "add">("view");
  const canAdd = caps.has("manage_members");

  async function refresh(): Promise<Member[]> {
    const list = await api<Member[]>("/members");
    setMembers(list);
    return list;
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <div className="md-grid">
      <section className="panel">
        <div className="panel-head">
          <h2>
            {t("members")} ({members.length})
          </h2>
          {canAdd && (
            <button
              className="btn-small"
              onClick={() => {
                setMode("add");
                setSelected(null);
              }}
            >
              + {t("registerMember")}
            </button>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t("fullName")}</th>
              <th>{t("unit")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className={`clickable ${selected?.id === m.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(m);
                  setMode("view");
                }}
              >
                <td>{m.member_no}</td>
                <td>{m.full_name}</td>
                <td>{m.org_unit_name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="stack-panels">
        {mode === "add" && canAdd ? (
          <MemberForm
            t={t}
            onCancel={() => setMode("view")}
            onSaved={async (m) => {
              const list = await refresh();
              setSelected(list.find((x) => x.id === m.id) ?? m);
              setMode("view");
            }}
          />
        ) : selected ? (
          <>
            <MemberProfile
              member={selected}
              t={t}
              canEdit={caps.has("manage_members") || selected.id === me?.member_id}
              onUpdated={async () => {
                const list = await refresh();
                setSelected(list.find((x) => x.id === selected.id) ?? null);
              }}
            />
            <SacramentsView member={selected} caps={caps} locale={locale} t={t} />
          </>
        ) : (
          <section className="panel">
            <p className="muted">{t("selectMemberHint")}</p>
          </section>
        )}
      </div>
    </div>
  );
}
