import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchRiskBudgets,
  createRiskBudget,
  updateRiskBudget,
  deleteRiskBudget,
  fetchRiskBudgetStatus,
  checkAllRiskBudgets,
  RiskBudget,
  RiskBudgetStatus,
  CreateRiskBudgetPayload,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function RiskBudgetsPage() {
  const [budgets, setBudgets] = useState<RiskBudget[]>([]);
  const [statuses, setStatuses] = useState<Map<string, RiskBudgetStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateRiskBudgetPayload>({
    name: "",
    description: "",
    enabled: true,
    maxCritical: null,
    maxHigh: null,
    maxMedium: null,
    maxTotalRiskScore: null,
    alertOnExceed: true,
    alertChannels: [],
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await fetchRiskBudgets();
      setBudgets(data);
      
      // Tüm budget'ların durumunu kontrol et
      const allStatuses = await checkAllRiskBudgets();
      const statusMap = new Map<string, RiskBudgetStatus>();
      allStatuses.forEach((status) => {
        statusMap.set(status.budget._id, status);
      });
      setStatuses(statusMap);
      
      setError(null);
    } catch (e: any) {
      setError(e.message || "Risk budget'lar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Budget oluşturulamaz.");
      return;
    }

    try {
      await createRiskBudget(formData);
      await loadBudgets();
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        enabled: true,
        maxCritical: null,
        maxHigh: null,
        maxMedium: null,
        maxTotalRiskScore: null,
        alertOnExceed: true,
        alertChannels: [],
      });
    } catch (e: any) {
      setError(e.message || "Budget oluşturulamadı.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Budget silinemez.");
      return;
    }
    if (!confirm(`"${name}" risk budget'ını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteRiskBudget(id);
      await loadBudgets();
    } catch (e: any) {
      setError(e.message || "Budget silinemedi.");
    }
  };

  const handleToggleEnabled = async (budget: RiskBudget) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Budget güncellenemez.");
      return;
    }
    try {
      await updateRiskBudget(budget._id, { enabled: !budget.enabled });
      await loadBudgets();
    } catch (e: any) {
      setError(e.message || "Budget güncellenemedi.");
    }
  };

  const handleCheck = async (id: string) => {
    try {
      const status = await fetchRiskBudgetStatus(id);
      setStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, status);
        return newMap;
      });
    } catch (e: any) {
      setError(e.message || "Budget durumu kontrol edilemedi.");
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Risk Budget Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Risk Budget Yönetimi</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadBudgets}>
            Yenile
          </button>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {!IS_READONLY && (
          <div style={{ marginBottom: 16 }}>
            <button className="button" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Formu Kapat" : "Yeni Risk Budget Oluştur"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Risk Budget</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  İsim *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Açıklama
                </label>
                <textarea
                  className="input"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Max CRITICAL (opsiyonel)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={formData.maxCritical ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxCritical: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Max HIGH (opsiyonel)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={formData.maxHigh ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxHigh: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Max MEDIUM (opsiyonel)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={formData.maxMedium ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxMedium: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Max Toplam Risk Skoru (opsiyonel)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={formData.maxTotalRiskScore ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTotalRiskScore: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={formData.alertOnExceed}
                    onChange={(e) =>
                      setFormData({ ...formData, alertOnExceed: e.target.checked })
                    }
                  />
                  <span className="muted">Threshold aşıldığında alert gönder</span>
                </label>
              </div>

              <button type="submit" className="button">
                Oluştur
              </button>
            </form>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && budgets.length === 0 && (
          <p className="muted">Henüz risk budget tanımlanmamış.</p>
        )}

        {!loading && budgets.length > 0 && (
          <div className="grid">
            {budgets.map((budget) => {
              const status = statuses.get(budget._id);
              const isExceeded = status?.isExceeded || false;
              const utilization = status?.utilization;

              return (
                <div
                  key={budget._id}
                  className="card"
                  style={{
                    borderLeft: isExceeded ? "4px solid #ef4444" : "4px solid #10b981",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                        {budget.name}
                        {!budget.enabled && (
                          <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                            (Devre Dışı)
                          </span>
                        )}
                      </div>
                      {budget.description && (
                        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                          {budget.description}
                        </div>
                      )}
                    </div>
                    <span
                      className={`badge ${isExceeded ? "badge-critical" : "badge-low"}`}
                      style={{ fontSize: 11 }}
                    >
                      {isExceeded ? "AŞILDI" : "OK"}
                    </span>
                  </div>

                  {/* Utilization göstergeleri */}
                  {utilization && (
                    <div style={{ marginBottom: 12 }}>
                      {budget.maxCritical !== null && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                            <span className="muted">CRITICAL:</span>
                            <span>
                              {budget.currentCritical} / {budget.maxCritical} (
                              {utilization.critical.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 6,
                              backgroundColor: "#1f2937",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, utilization.critical)}%`,
                                height: "100%",
                                backgroundColor:
                                  utilization.critical >= 100
                                    ? "#ef4444"
                                    : utilization.critical >= 80
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {budget.maxHigh !== null && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                            <span className="muted">HIGH:</span>
                            <span>
                              {budget.currentHigh} / {budget.maxHigh} (
                              {utilization.high.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 6,
                              backgroundColor: "#1f2937",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, utilization.high)}%`,
                                height: "100%",
                                backgroundColor:
                                  utilization.high >= 100
                                    ? "#ef4444"
                                    : utilization.high >= 80
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {budget.maxTotalRiskScore !== null && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                            <span className="muted">Toplam Risk Skoru:</span>
                            <span>
                              {budget.currentTotalRiskScore.toFixed(0)} / {budget.maxTotalRiskScore} (
                              {utilization.totalRiskScore.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 6,
                              backgroundColor: "#1f2937",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, utilization.totalRiskScore)}%`,
                                height: "100%",
                                backgroundColor:
                                  utilization.totalRiskScore >= 100
                                    ? "#ef4444"
                                    : utilization.totalRiskScore >= 80
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {status?.exceededFields && status.exceededFields.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        Aşılan Alanlar:
                      </div>
                      <div className="chips">
                        {status.exceededFields.map((field, idx) => (
                          <span key={idx} className="chip" style={{ backgroundColor: "#ef4444" }}>
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => handleCheck(budget._id)}
                    >
                      Kontrol Et
                    </button>
                    {!IS_READONLY && (
                      <>
                        <button
                          className="button button-secondary"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                          onClick={() => handleToggleEnabled(budget)}
                        >
                          {budget.enabled ? "Devre Dışı Bırak" : "Aktif Et"}
                        </button>
                        <button
                          className="button button-secondary"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            backgroundColor: "#ef4444",
                          }}
                          onClick={() => handleDelete(budget._id, budget.name)}
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

