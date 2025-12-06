import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AutoActionPolicy,
  AutoActionType,
  AutoActionExecutionResult,
  fetchAutoActionPolicies,
  createAutoActionPolicy,
  updateAutoActionPolicy,
  deleteAutoActionPolicy,
  executeAutoActionPolicy,
} from "../../lib/api";

const ACTION_COLORS: Record<AutoActionType, string> = {
  NOTIFY: "#3b82f6",
  REMEDIATE_DRY_RUN: "#f59e0b",
  REMEDIATE_EXECUTE: "#ef4444",
};

export default function AutoActionsPage() {
  const [policies, setPolicies] = useState<AutoActionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AutoActionExecutionResult | null>(null);

  const [form, setForm] = useState<Partial<AutoActionPolicy>>({
    name: "",
    description: "",
    enabled: true,
    riskScoreThreshold: 70,
    riskLevels: ["HIGH", "CRITICAL"],
    namespaces: [],
    riskFactors: [],
    maxActionsPerRun: 5,
    actionType: "REMEDIATE_DRY_RUN",
    dryRun: true,
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await fetchAutoActionPolicies();
      setPolicies(data);
    } catch (e: any) {
      setError(e.message || "Policy listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...form,
        namespaces: form.namespaces || [],
        riskFactors: form.riskFactors || [],
      };
      await createAutoActionPolicy(payload);
      await loadPolicies();
      setForm({
        name: "",
        description: "",
        enabled: true,
        riskScoreThreshold: 70,
        riskLevels: ["HIGH", "CRITICAL"],
        namespaces: [],
        riskFactors: [],
        maxActionsPerRun: 5,
        actionType: "REMEDIATE_DRY_RUN",
        dryRun: true,
      });
    } catch (e: any) {
      setError(e.message || "Policy oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (policy: AutoActionPolicy) => {
    try {
      await updateAutoActionPolicy(policy._id, { enabled: !policy.enabled });
      await loadPolicies();
    } catch (e: any) {
      setError(e.message || "Policy güncellenemedi.");
    }
  };

  const handleDelete = async (policy: AutoActionPolicy) => {
    if (!confirm("Policy silinsin mi?")) return;
    try {
      await deleteAutoActionPolicy(policy._id);
      await loadPolicies();
    } catch (e: any) {
      setError(e.message || "Policy silinemedi.");
    }
  };

  const handleExecute = async (policy: AutoActionPolicy) => {
    try {
      setExecutingId(policy._id);
      setError(null);
      const result = await executeAutoActionPolicy(policy._id, {
        maxActions: policy.maxActionsPerRun,
        dryRunOverride: policy.dryRun,
      });
      setLastResult(result);
    } catch (e: any) {
      setError(e.message || "Policy çalıştırılamadı.");
    } finally {
      setExecutingId(null);
    }
  };

  const setCommaList = (value: string, key: "namespaces" | "riskFactors") => {
    const arr = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    setForm({ ...form, [key]: arr });
  };

  return (
    <div className="layout">
      <Head>
        <title>Otomatik Aksiyonlar - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="header-title">Risk Skoruna Göre Otomatik Aksiyonlar</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/recommendations">
            <button className="button button-secondary">Öneriler</button>
          </Link>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Policy Oluştur */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Policy Oluştur</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                İsim
              </label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Prod kritik remediation"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Açıklama
              </label>
              <input
                className="input"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Kritik riskleri otomatik dry-run"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Risk Skor Eşiği
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={form.riskScoreThreshold}
                onChange={(e) => setForm({ ...form, riskScoreThreshold: parseInt(e.target.value) || 0 })}
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Max Aksiyon / Çalıştırma
              </label>
              <input
                type="number"
                min={1}
                max={50}
                className="input"
                value={form.maxActionsPerRun}
                onChange={(e) => setForm({ ...form, maxActionsPerRun: parseInt(e.target.value) || 1 })}
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Risk Seviyeleri
              </label>
              <select
                multiple
                className="select"
                value={form.riskLevels as string[]}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setForm({ ...form, riskLevels: opts as any });
                }}
                style={{ fontSize: 12, minHeight: 90 }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Namespace (virgülle)
              </label>
              <input
                className="input"
                value={(form.namespaces || []).join(", ")}
                onChange={(e) => setCommaList(e.target.value, "namespaces")}
                placeholder="prod, staging"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Risk Faktörleri (virgülle)
              </label>
              <input
                className="input"
                value={(form.riskFactors || []).join(", ")}
                onChange={(e) => setCommaList(e.target.value, "riskFactors")}
                placeholder="Uses latest tag, Uses root user"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Aksiyon Tipi
              </label>
              <select
                className="select"
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value as AutoActionType, dryRun: e.target.value !== "REMEDIATE_EXECUTE" })}
                style={{ fontSize: 12 }}
              >
                <option value="NOTIFY">Notify</option>
                <option value="REMEDIATE_DRY_RUN">Remediate (Dry Run)</option>
                <option value="REMEDIATE_EXECUTE">Remediate (Gerçek)</option>
              </select>
              {form.actionType !== "NOTIFY" && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={form.dryRun !== false}
                    onChange={(e) => setForm({ ...form, dryRun: e.target.checked })}
                  />
                  Dry-run zorunlu (gerçek çalıştırmayı kapatır)
                </label>
              )}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={form.enabled !== false}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Policy aktif
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={handleCreate}
              disabled={saving || !form.name}
            >
              {saving ? "Kaydediliyor..." : "Policy Oluştur"}
            </button>
          </div>
        </div>

        {/* Policy Listesi */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>Yükleniyor...</div>
          ) : policies.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              Henüz policy yok. Yukarıdan ekleyin.
            </div>
          ) : (
            policies.map((policy) => (
              <div key={policy._id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: ACTION_COLORS[policy.actionType] || "#6b7280",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {policy.actionType}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: policy.enabled ? "#10b981" : "#6b7280",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        {policy.enabled ? "AKTİF" : "PASİF"}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{policy.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                      {policy.description || "Açıklama belirtilmemiş"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: 12 }}>
                      <div><strong>Eşik:</strong> ≥ {policy.riskScoreThreshold}</div>
                      <div><strong>Risk Seviyeleri:</strong> {policy.riskLevels.join(", ")}</div>
                      <div><strong>Max Aksiyon:</strong> {policy.maxActionsPerRun}</div>
                      <div><strong>Namespaces:</strong> {policy.namespaces.length > 0 ? policy.namespaces.join(", ") : "Tümü"}</div>
                      <div><strong>Risk Faktörleri:</strong> {policy.riskFactors.length > 0 ? policy.riskFactors.join(", ") : "Tümü"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <button
                      className="button button-secondary"
                      onClick={() => handleToggleEnabled(policy)}
                      style={{ fontSize: 11, padding: "6px 10px" }}
                    >
                      {policy.enabled ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                    <button
                      className="button button-primary"
                      onClick={() => handleExecute(policy)}
                      disabled={executingId === policy._id}
                      style={{ fontSize: 11, padding: "6px 10px" }}
                    >
                      {executingId === policy._id ? "Çalıştırılıyor..." : "Şimdi Çalıştır"}
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => handleDelete(policy)}
                      style={{ fontSize: 11, padding: "6px 10px" }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Son Çalıştırma Sonucu */}
        {lastResult && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Son Çalıştırma Sonucu</h3>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
              Policy: {lastResult.policyName} — Eşleşen: {lastResult.totalMatches} — Uygulanan: {lastResult.executedCount}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lastResult.items.map((item, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 8, backgroundColor: "#0f172a", border: "1px solid #1f2937" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 600 }}>{item.imageName}</div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: item.status === "EXECUTED" || item.status === "NOTIFIED" ? "#10b981" : "#ef4444",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                    Risk: {item.riskLevel} ({item.riskScore}) — Faktörler: {item.matchedRiskFactors.join(", ") || "Yok"}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {item.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


