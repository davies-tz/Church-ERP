import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  FinanceCategory,
  FinanceEntry,
  FinanceSummary,
  Member,
  PaymentMethod,
  T,
} from "../lib/types";

interface Props {
  caps: Set<string>;
  locale: string;
  t: T;
}

function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export function FinancePage({ caps, locale, t }: Props) {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [sum, setSum] = useState<FinanceSummary | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canRecord = caps.has("record_finance");
  const canApprove = caps.has("approve");
  const label = (o: { label_en: string; label_sw: string }) =>
    locale === "sw" ? o.label_sw : o.label_en;
  const catLabel = (k: string) => {
    const c = categories.find((x) => x.key === k);
    return c ? label(c) : k;
  };

  async function refresh() {
    const [e, s] = await Promise.all([
      api<FinanceEntry[]>("/finance"),
      api<FinanceSummary>("/finance/summary"),
    ]);
    setEntries(e);
    setSum(s);
  }
  useEffect(() => {
    refresh().catch(() => {});
    api<FinanceCategory[]>("/finance/categories").then(setCategories).catch(() => {});
    api<PaymentMethod[]>("/finance/methods").then(setMethods).catch(() => {});
    api<Member[]>("/members").then(setMembers).catch(() => {});
  }, []);

  async function record(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api<FinanceEntry>("/finance", {
        method: "POST",
        body: JSON.stringify({
          category,
          amount: Number(amount),
          method: method || null,
          member_id: memberId || null,
        }),
      });
      setCategory("");
      setAmount("");
      setMethod("");
      setMemberId("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function act(id: string, action: string) {
    setError(null);
    try {
      await api<FinanceEntry>(`/finance/${id}/${action}`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const income = categories.filter((c) => c.direction === "income");
  const expense = categories.filter((c) => c.direction === "expense");

  return (
    <div className="two-col">
      <div className="stack-panels">
        {sum && (
          <div className="stat-grid">
            <div className="stat-card">
              <span>{t("income")}</span>
              <strong>{money(sum.income, sum.currency)}</strong>
            </div>
            <div className="stat-card">
              <span>{t("expense")}</span>
              <strong>{money(sum.expense, sum.currency)}</strong>
            </div>
            <div className="stat-card">
              <span>{t("net")}</span>
              <strong>{money(sum.net, sum.currency)}</strong>
            </div>
            <div className="stat-card">
              <span>{t("pendingApproval")}</span>
              <strong>{sum.pending}</strong>
            </div>
          </div>
        )}

        <section className="panel">
          <h2>{t("finance")}</h2>
          {entries.length === 0 && <p className="muted">{t("noEntries")}</p>}
          <table>
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("category")}</th>
                <th style={{ textAlign: "right" }}>{t("amount")}</th>
                <th>Status</th>
                {canApprove && <th></th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="small">{e.date}</td>
                  <td>
                    {catLabel(e.category)}
                    {e.member_name ? (
                      <div className="muted small">{e.member_name}</div>
                    ) : null}
                  </td>
                  <td
                    style={{ textAlign: "right" }}
                    className={e.direction === "expense" ? "neg" : "pos"}
                  >
                    {e.direction === "expense" ? "−" : ""}
                    {money(e.amount, e.currency)}
                  </td>
                  <td>
                    <span className={`status ${e.approval_status}`}>
                      {t(e.approval_status)}
                    </span>
                  </td>
                  {canApprove && (
                    <td>
                      {e.approval_status === "pending" && (
                        <div className="req-actions">
                          <button
                            className="btn-approve btn-small"
                            onClick={() => act(e.id, "approve")}
                          >
                            {t("approve")}
                          </button>
                          <button
                            className="btn-muted btn-small"
                            onClick={() => act(e.id, "reject")}
                          >
                            {t("reject")}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {canRecord && (
        <section className="panel">
          <h2>{t("recordFinance")}</h2>
          <form onSubmit={record} className="stack">
            <label>{t("category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t("selectCategory")}</option>
              <optgroup label={t("income")}>
                {income.map((c) => (
                  <option key={c.key} value={c.key}>
                    {label(c)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("expense")}>
                {expense.map((c) => (
                  <option key={c.key} value={c.key}>
                    {label(c)}
                  </option>
                ))}
              </optgroup>
            </select>
            <label>{t("amount")}</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <label>{t("method")}</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">—</option>
              {methods.map((m) => (
                <option key={m.key} value={m.key}>
                  {label(m)}
                </option>
              ))}
            </select>
            <label>{t("forMember")}</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={!category || !amount}>
              {t("save")}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
