import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchCustomRules,
  createCustomRule,
  updateCustomRule,
  deleteCustomRule,
  toggleCustomRule,
  CustomRiskRule,
  CustomRuleCondition,
  CustomRuleField,
  CustomRuleOperator,
  CustomRuleConjunction,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function CustomRulesPage() {
  const [rules, setRules] = useState<CustomRiskRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRiskRule | null>(null);
  const [formData, setFormData] = useState<Partial<CustomRiskRule>>({
    name: "",
    description: "",
    enabled: true,
    condition: {
      type: "imageName",
      operator: "contains",
      value: "",
    },
    conditions: [
      {
        type: "imageName",
        operator: "contains",
        value: "",
      },
    ],
    riskScore: 10,
    riskFactor: "",
    priority: 100,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomRules(true); // Include disabled
      setRules(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Kurallar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const normalizeFormData = (data: Partial<CustomRiskRule>): CustomRiskRule => {
    const base: any = {
      ...data,
    };

    // conditions dizisini temizle (boş değerleri at)
    const conditions = (base.conditions as CustomRuleCondition[] | undefined)
      ?.filter(
        (c) =>
          c &&
          c.type &&
          c.operator &&
          c.value !== undefined &&
          String(c.value) !== ""
      ) || [];

    if (conditions.length > 0) {
      base.conditions = conditions.map((c, idx) => ({
        ...c,
        conj: idx === 0 ? undefined : c.conj || "AND",
      }));
      base.condition = base.conditions[0];
    } else if (base.condition) {
      // Geri uyumluluk: tek condition
      base.conditions = undefined;
    }

    return base as CustomRiskRule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Kural eklenemez/güncellenemez.");
      return;
    }

    try {
      const payload = normalizeFormData(formData);

      if (editingRule?._id) {
        await updateCustomRule(editingRule._id, payload);
      } else {
        await createCustomRule(payload);
      }
      await loadRules();
      setShowForm(false);
      setEditingRule(null);
      setFormData({
        name: "",
        description: "",
        enabled: true,
        condition: {
          type: "imageName",
          operator: "contains",
          value: "",
        },
        conditions: [
          {
            type: "imageName",
            operator: "contains",
            value: "",
          },
        ],
        riskScore: 10,
        riskFactor: "",
        priority: 100,
      });
    } catch (e: any) {
      setError(e.message || "Kural kaydedilemedi.");
    }
  };

  const handleEdit = (rule: CustomRiskRule) => {
    setEditingRule(rule);
    setFormData({
      ...rule,
      conditions:
        rule.conditions && rule.conditions.length > 0
          ? rule.conditions
          : [rule.condition],
    });
    setShowForm(true);
  };

  const applyTemplate = (template: "prod-snapshot" | "latest-tag" | "old-image") => {
    if (template === "prod-snapshot") {
      setFormData({
        name: "Prod snapshot tag",
        description:
          "prod namespace'lerinde tag'i '-snapshot' içeren imajları yükselt",
        enabled: true,
        condition: {
          type: "imageName",
          operator: "contains",
          value: "snapshot",
        },
        conditions: [
          {
            type: "namespace",
            operator: "startsWith",
            value: "prod",
          },
          {
            conj: "AND",
            type: "tag",
            operator: "contains",
            value: "snapshot",
          },
        ],
        riskScore: 20,
        riskFactor: "Custom: Prod snapshot tag",
        priority: 50,
      });
    } else if (template === "latest-tag") {
      setFormData({
        name: "Latest tag in prod",
        description: "prod ortamında 'latest' tag'i kullanan imajları yükselt",
        enabled: true,
        condition: {
          type: "tag",
          operator: "equals",
          value: "latest",
        },
        conditions: [
          {
            type: "namespace",
            operator: "startsWith",
            value: "prod",
          },
          {
            conj: "AND",
            type: "tag",
            operator: "equals",
            value: "latest",
          },
        ],
        riskScore: 25,
        riskFactor: "Custom: Latest tag in prod",
        priority: 40,
      });
    } else if (template === "old-image") {
      setFormData({
        name: "Very old images",
        description: "180 günden eski imajları ek puanla işaretle",
        enabled: true,
        condition: {
          type: "age",
          operator: "greaterThan",
          value: 180,
        },
        conditions: [
          {
            type: "age",
            operator: "greaterThan",
            value: 180,
          },
        ],
        riskScore: 15,
        riskFactor: "Custom: Age > 180 days",
        priority: 80,
      });
    }
  };

  const addConditionRow = () => {
    setFormData((prev) => {
      const list = (prev.conditions || []) as CustomRuleCondition[];
      const last = list[list.length - 1] || prev.condition;
      const next: CustomRuleCondition = {
        type: last?.type || "imageName",
        operator: last?.operator || "contains",
        value: "",
        conj: "AND",
      };
      return {
        ...prev,
        conditions: [...list, next],
      } as Partial<CustomRiskRule>;
    });
  };

  const updateConditionRow = (
    index: number,
    patch: Partial<CustomRuleCondition>
  ) => {
    setFormData((prev) => {
      const list = ((prev.conditions ||
        [prev.condition]) as CustomRuleCondition[]).map((c) => ({ ...c }));
      if (!list[index]) return prev;
      list[index] = { ...list[index], ...patch };
      return {
        ...prev,
        conditions: list,
      } as Partial<CustomRiskRule>;
    });
  };

  const removeConditionRow = (index: number) => {
    setFormData((prev) => {
      const list = ((prev.conditions ||
        [prev.condition]) as CustomRuleCondition[]).slice();
      if (list.length <= 1) return prev;
      list.splice(index, 1);
      return {
        ...prev,
        conditions: list,
      } as Partial<CustomRiskRule>;
    });
  };

  const renderConditionLabel = (c: CustomRuleCondition): string => {
    const fieldMap: Record<CustomRuleField, string> = {
      imageName: "imageName",
      namespace: "namespace",
      tag: "tag",
      age: "age (gün)",
      baseImage: "baseImage",
      custom: "custom",
    };
    const opMap: Record<CustomRuleOperator, string> = {
      contains: "içerir",
      equals: "eşittir",
      startsWith: "ile başlar",
      endsWith: "ile biter",
      regex: "regex",
      greaterThan: "büyüktür",
      lessThan: "küçüktür",
    };
    return `${fieldMap[c.type]} ${opMap[c.operator]} "${c.value}"`;
  };

  const handleDelete = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Kural silinemez.");
      return;
    }
    if (!confirm("Bu kuralı silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      await deleteCustomRule(id);
      await loadRules();
    } catch (e: any) {
      setError(e.message || "Kural silinemedi.");
    }
  };

  const handleToggle = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Kural değiştirilemez.");
      return;
    }
    try {
      await toggleCustomRule(id);
      await loadRules();
    } catch (e: any) {
      setError(e.message || "Kural durumu değiştirilemedi.");
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Özel Risk Kuralları - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Özel Risk Kuralları</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="role-badge">
            <span
              className={`role-badge-dot ${IS_READONLY ? "readonly" : ""}`}
            />
            <span style={{ fontWeight: 500 }}>
              Rol: {IS_READONLY ? "Read-only" : "Admin"}
            </span>
          </div>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {IS_READONLY && (
          <div
            style={{
              padding: 12,
              backgroundColor: "#374151",
              borderRadius: 4,
              marginBottom: 16,
              color: "#fbbf24",
            }}
          >
            ⚠️ Bu ortam read-only modda. Kurallar görüntülenebilir ancak değiştirilemez.
          </div>
        )}

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {!IS_READONLY && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingRule(null);
                  setFormData({
                    name: "",
                    description: "",
                    enabled: true,
                    condition: {
                      type: "imageName",
                      operator: "contains",
                      value: "",
                    },
                    conditions: [
                      {
                        type: "imageName",
                        operator: "contains",
                        value: "",
                      },
                    ],
                    riskScore: 10,
                    riskFactor: "",
                    priority: 100,
                  });
                }}
              >
                {showForm ? "Formu Kapat" : "Yeni Kural Ekle"}
              </button>
              <button
                className="button button-secondary"
                style={{ fontSize: 12, padding: "6px 10px" }}
                onClick={() => {
                  setShowForm(true);
                  setEditingRule(null);
                  applyTemplate("prod-snapshot");
                }}
              >
                Prod snapshot şablonu
              </button>
              <button
                className="button button-secondary"
                style={{ fontSize: 12, padding: "6px 10px" }}
                onClick={() => {
                  setShowForm(true);
                  setEditingRule(null);
                  applyTemplate("latest-tag");
                }}
              >
                Prod latest tag şablonu
              </button>
              <button
                className="button button-secondary"
                style={{ fontSize: 12, padding: "6px 10px" }}
                onClick={() => {
                  setShowForm(true);
                  setEditingRule(null);
                  applyTemplate("old-image");
                }}
              >
                Eski imaj (180+ gün) şablonu
              </button>
            </div>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              {editingRule ? "Kuralı Düzenle" : "Yeni Özel Risk Kuralı"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Kural Adı *
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
                <input
                  className="input"
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 4,
                  backgroundColor: "#111827",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div className="muted" style={{ fontSize: 12 }}>
                    Koşullar
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={addConditionRow}
                  >
                    Koşul Ekle
                  </button>
                </div>

                {(formData.conditions || []).map((cond, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    {idx > 0 && (
                      <select
                        className="select"
                        style={{ width: 80 }}
                        value={cond.conj || "AND"}
                        onChange={(e) =>
                          updateConditionRow(idx, {
                            conj: e.target.value as CustomRuleConjunction,
                          })
                        }
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}
                    <select
                      className="select"
                      value={cond.type}
                      onChange={(e) =>
                        updateConditionRow(idx, {
                          type: e.target.value as CustomRuleField,
                        })
                      }
                    >
                      <option value="imageName">Image Adı</option>
                      <option value="namespace">Namespace</option>
                      <option value="tag">Tag</option>
                      <option value="age">Yaş (gün)</option>
                      <option value="baseImage">Base Image</option>
                    </select>
                    <select
                      className="select"
                      value={cond.operator}
                      onChange={(e) =>
                        updateConditionRow(idx, {
                          operator: e.target.value as CustomRuleOperator,
                        })
                      }
                    >
                      <option value="contains">İçerir</option>
                      <option value="equals">Eşittir</option>
                      <option value="startsWith">İle Başlar</option>
                      <option value="endsWith">İle Biter</option>
                      <option value="regex">Regex</option>
                      <option value="greaterThan">Büyüktür</option>
                      <option value="lessThan">Küçüktür</option>
                    </select>
                    <input
                      className="input"
                      type={cond.type === "age" ? "number" : "text"}
                      value={cond.value ?? ""}
                      onChange={(e) =>
                        updateConditionRow(idx, {
                          value:
                            cond.type === "age"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      style={{ minWidth: 160 }}
                    />
                    {idx > 0 && (
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => removeConditionRow(idx)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Risk Skoru (0-100) *
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.riskScore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      riskScore: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Risk Faktörü (Gösterilecek Metin) *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.riskFactor}
                  onChange={(e) =>
                    setFormData({ ...formData, riskFactor: e.target.value })
                  }
                  placeholder="Örn: Custom rule: Contains 'test'"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Öncelik (Düşük sayı = Yüksek öncelik)
                </label>
                <input
                  className="input"
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="pill-toggle">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, enabled: e.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>

              <button type="submit" className="button">
                {editingRule ? "Güncelle" : "Kaydet"}
              </button>
              {editingRule && (
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    setShowForm(false);
                    setEditingRule(null);
                  }}
                >
                  İptal
                </button>
              )}
            </form>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && rules.length === 0 && (
          <p className="muted">Henüz özel kural tanımlanmamış.</p>
        )}

        {!loading && rules.length > 0 && (
          <div className="grid">
            {rules.map((rule) => (
              <div
                key={rule._id}
                className="card"
                style={{
                  opacity: rule.enabled ? 1 : 0.6,
                  borderLeft: rule.enabled ? "3px solid #10b981" : "3px solid #6b7280",
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
                      {rule.name}
                    </div>
                    {rule.description && (
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        {rule.description}
                      </div>
                    )}
                  </div>
                  <span
                    className={`badge ${rule.enabled ? "badge-low" : "badge-medium"}`}
                    style={{ fontSize: 11 }}
                  >
                    {rule.enabled ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                    Koşul:
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {(() => {
                      const conds =
                        (rule.conditions && rule.conditions.length > 0
                          ? rule.conditions
                          : [rule.condition]) || [];
                      return conds
                        .map((c, idx) => {
                          const label = renderConditionLabel(c);
                          if (idx === 0) return label;
                          return `${c.conj || "AND"} ${label}`;
                        })
                        .join(" ");
                    })()}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      Risk Skoru
                    </div>
                    <div className="risk-score">{rule.riskScore}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      Öncelik
                    </div>
                    <div style={{ fontSize: 14 }}>{rule.priority}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                    Risk Faktörü:
                  </div>
                  <div style={{ fontSize: 12 }}>{rule.riskFactor}</div>
                </div>

                {!IS_READONLY && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 12, padding: "4px 8px", flex: 1 }}
                      onClick={() => handleEdit(rule)}
                    >
                      Düzenle
                    </button>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 12, padding: "4px 8px", flex: 1 }}
                      onClick={() => rule._id && handleToggle(rule._id)}
                    >
                      {rule.enabled ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                    <button
                      className="button button-secondary"
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        flex: 1,
                        backgroundColor: "#ef4444",
                      }}
                      onClick={() => rule._id && handleDelete(rule._id)}
                    >
                      Sil
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

