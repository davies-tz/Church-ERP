import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Asset, AssetSummary, InventoryItem, T } from "../lib/types";
import { AssetDetail } from "../components/AssetDetail";
import { AssetForm } from "../components/AssetForm";

interface Props {
  caps: Set<string>;
  locale: string;
  t: T;
}

function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export function AssetsPage({ locale, t }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sum, setSum] = useState<AssetSummary | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [mode, setMode] = useState<"view" | "add">("view");

  // inventory add form
  const [iName, setIName] = useState("");
  const [iQty, setIQty] = useState("");
  const [iUnit, setIUnit] = useState("");
  const [iReorder, setIReorder] = useState("");

  async function refresh() {
    const [a, s, inv] = await Promise.all([
      api<Asset[]>("/assets"),
      api<AssetSummary>("/assets/summary"),
      api<InventoryItem[]>("/inventory"),
    ]);
    setAssets(a);
    setSum(s);
    setInventory(inv);
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    await api<InventoryItem>("/inventory", {
      method: "POST",
      body: JSON.stringify({
        name: iName,
        quantity: iQty ? Number(iQty) : 0,
        unit: iUnit || null,
        reorder_level: iReorder ? Number(iReorder) : null,
      }),
    });
    setIName("");
    setIQty("");
    setIUnit("");
    setIReorder("");
    await refresh();
  }

  return (
    <div className="stack-panels">
      {sum && (
        <div className="stat-grid">
          <div className="stat-card">
            <span>{t("totalValue")}</span>
            <strong>{money(sum.total_value, sum.currency)}</strong>
          </div>
          <div className="stat-card">
            <span>{t("assetCount")}</span>
            <strong>{sum.total_count}</strong>
          </div>
          <div className="stat-card">
            <span>{t("lowStock")}</span>
            <strong>{sum.low_stock}</strong>
          </div>
        </div>
      )}

      <div className="md-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{t("assets")} ({assets.length})</h2>
            <button
              className="btn-small"
              onClick={() => {
                setMode("add");
                setSelected(null);
              }}
            >
              + {t("registerAsset")}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t("assetType")}</th>
                <th>{t("name")}</th>
                <th style={{ textAlign: "right" }}>{t("value")}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr
                  key={a.id}
                  className={`clickable ${selected?.id === a.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelected(a);
                    setMode("view");
                  }}
                >
                  <td>
                    <span className="tree-badge">{t(a.type)}</span>
                  </td>
                  <td>{a.name}</td>
                  <td style={{ textAlign: "right" }} className="pos">
                    {a.value != null ? money(a.value, a.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && <p className="muted">{t("noAssets")}</p>}
        </section>

        <div>
          {mode === "add" ? (
            <AssetForm
              t={t}
              locale={locale}
              onCancel={() => setMode("view")}
              onSaved={async (a) => {
                await refresh();
                setSelected(a);
                setMode("view");
              }}
            />
          ) : selected ? (
            <AssetDetail asset={selected} t={t} />
          ) : (
            <section className="panel">
              <p className="muted">{t("selectAssetHint")}</p>
            </section>
          )}
        </div>
      </div>

      <section className="panel">
        <h2>{t("inventory")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th style={{ textAlign: "right" }}>{t("quantity")}</th>
              <th>{t("measure")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td style={{ textAlign: "right" }}>{i.quantity}</td>
                <td className="muted small">{i.unit ?? ""}</td>
                <td>
                  {i.low_stock && <span className="status pending">{t("lowStock")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addItem} className="inline-form">
          <input placeholder={t("name")} value={iName} onChange={(e) => setIName(e.target.value)} />
          <input placeholder={t("quantity")} type="number" value={iQty} onChange={(e) => setIQty(e.target.value)} />
          <input placeholder={t("measure")} value={iUnit} onChange={(e) => setIUnit(e.target.value)} />
          <input placeholder={t("reorderLevel")} type="number" value={iReorder} onChange={(e) => setIReorder(e.target.value)} />
          <button type="submit" disabled={!iName}>
            {t("addItem")}
          </button>
        </form>
      </section>
    </div>
  );
}
