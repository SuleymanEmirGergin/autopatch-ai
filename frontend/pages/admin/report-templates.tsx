import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  copyReportTemplate,
  exportReportTemplate,
  importReportTemplate,
  setReportTemplateAsDefault,
  ReportTemplate,
  CreateReportTemplatePayload,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function ReportTemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState<CreateReportTemplatePayload>({
    name: "",
    description: "",
    primaryColor: "#4472C4",
    secondaryColor: "#6B7280",
    accentColor: "#10B981",
    contentOptions: {
      includeSummary: true,
      includeRiskDistribution: true,
      includeTopRiskyImages: true,
      includeRecommendations: true,
      topRiskyCount: 10,
    },
    pdfOptions: {
      pageSize: "A4",
      orientation: "portrait",
      margin: { top: 50, right: 50, bottom: 50, left: 50 },
      fontFamily: "Helvetica",
      fontSize: { title: 20, heading: 14, body: 10 },
    },
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchReportTemplates();
      setTemplates(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Şablonlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Şablon oluşturulamaz.");
      return;
    }

    try {
      if (editingTemplate) {
        await updateReportTemplate(editingTemplate._id, formData);
      } else {
        await createReportTemplate(formData);
      }
      await loadTemplates();
      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
    } catch (e: any) {
      setError(e.message || "Şablon kaydedilemedi.");
    }
  };

  const handleEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      logo: template.logo,
      headerText: template.headerText,
      footerText: template.footerText,
      companyName: template.companyName,
      companyAddress: template.companyAddress,
      companyContact: template.companyContact,
      primaryColor: template.primaryColor || "#4472C4",
      secondaryColor: template.secondaryColor || "#6B7280",
      accentColor: template.accentColor || "#10B981",
      contentOptions: template.contentOptions,
      pdfOptions: template.pdfOptions,
      excelOptions: template.excelOptions,
      isDefault: template.isDefault,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Şablon silinemez.");
      return;
    }
    if (!confirm(`"${name}" şablonunu silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteReportTemplate(id);
      await loadTemplates();
    } catch (e: any) {
      setError(e.message || "Şablon silinemedi.");
    }
  };

  const handleSetDefault = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Şablon güncellenemez.");
      return;
    }
    try {
      await setReportTemplateAsDefault(id);
      await loadTemplates();
    } catch (e: any) {
      setError(e.message || "Varsayılan şablon ayarlanamadı.");
    }
  };

  const handleCopy = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Şablon kopyalanamaz.");
      return;
    }
    try {
      setError(null);
      const newName = prompt("Yeni şablon adı:", `Copy of ${name}`);
      if (!newName) return; // Kullanıcı iptal etti

      await copyReportTemplate(id, newName);
      await loadTemplates();
    } catch (e: any) {
      setError(e.message || "Şablon kopyalanamadı.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      primaryColor: "#4472C4",
      secondaryColor: "#6B7280",
      accentColor: "#10B981",
      contentOptions: {
        includeSummary: true,
        includeRiskDistribution: true,
        includeTopRiskyImages: true,
        includeRecommendations: true,
        topRiskyCount: 10,
      },
      pdfOptions: {
        pageSize: "A4",
        orientation: "portrait",
        margin: { top: 50, right: 50, bottom: 50, left: 50 },
        fontFamily: "Helvetica",
        fontSize: { title: 20, heading: 14, body: 10 },
      },
    });
  };

  return (
    <div className="layout">
      <Head>
        <title>Rapor Şablonları - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Rapor Şablonları</div>
          <span className="badge badge-medium" style={{ fontSize: 11 }}>
            {templates.length} şablon
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!IS_READONLY && (
            <button className="button button-secondary" onClick={handleImport}>
              Import
            </button>
          )}
          <button className="button button-secondary" onClick={loadTemplates}>
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
            <button
              className="button"
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) {
                  setEditingTemplate(null);
                  resetForm();
                }
              }}
            >
              {showForm ? "Formu Kapat" : editingTemplate ? "Düzenlemeyi İptal" : "Yeni Şablon Oluştur"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24, maxWidth: 900 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              {editingTemplate ? "Şablonu Düzenle" : "Yeni Şablon"}
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    İsim *
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Varsayılan Şablon
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.isDefault || false}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    <span className="muted">Varsayılan olarak ayarla</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Açıklama
                </label>
                <textarea
                  className="input"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>Şirket Bilgileri</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      Şirket Adı
                    </label>
                    <input
                      className="input"
                      type="text"
                      value={formData.companyName || ""}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      İletişim
                    </label>
                    <input
                      className="input"
                      type="text"
                      value={formData.companyContact || ""}
                      onChange={(e) => setFormData({ ...formData, companyContact: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Adres
                  </label>
                  <textarea
                    className="input"
                    value={formData.companyAddress || ""}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    rows={2}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Header Metni
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={formData.headerText || ""}
                    onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Footer Metni
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={formData.footerText || ""}
                    onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>Renk Şeması</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      Ana Renk
                    </label>
                    <input
                      className="input"
                      type="color"
                      value={formData.primaryColor || "#4472C4"}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      İkincil Renk
                    </label>
                    <input
                      className="input"
                      type="color"
                      value={formData.secondaryColor || "#6B7280"}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      Vurgu Rengi
                    </label>
                    <input
                      className="input"
                      type="color"
                      value={formData.accentColor || "#10B981"}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>İçerik Seçenekleri</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeSummary !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeSummary: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Özet</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeRiskDistribution !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeRiskDistribution: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Risk Dağılımı</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeTopRiskyImages !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeTopRiskyImages: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">En Riskli Image'ler</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeRiskFactorAnalysis || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeRiskFactorAnalysis: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Risk Faktörü Analizi</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeNamespaceAnalysis || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeNamespaceAnalysis: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Namespace Analizi</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeTrends || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeTrends: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Trend Analizi</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.contentOptions?.includeRecommendations !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            includeRecommendations: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="muted">Öneriler</span>
                  </label>
                  <div>
                    <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                      En Riskli Image Sayısı
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.contentOptions?.topRiskyCount || 10}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contentOptions: {
                            ...formData.contentOptions,
                            topRiskyCount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="button">
                {editingTemplate ? "Güncelle" : "Oluştur"}
              </button>
            </form>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && templates.length === 0 && (
          <p className="muted">Henüz şablon tanımlanmamış.</p>
        )}

        {!loading && templates.length > 0 && (
          <div className="grid">
            {templates.map((template) => (
              <div
                key={template._id}
                className="card"
                style={{
                  borderLeft: template.isDefault ? "4px solid #10b981" : "4px solid #6b7280",
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
                      {template.name}
                      {template.isDefault && (
                        <span className="badge badge-low" style={{ marginLeft: 8, fontSize: 10 }}>
                          Varsayılan
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        {template.description}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 11 }}>
                      Kullanım: {template.usageCount} • Son kullanım:{" "}
                      {template.lastUsedAt
                        ? new Date(template.lastUsedAt).toLocaleDateString("tr-TR")
                        : "Hiç"}
                    </div>
                  </div>
                </div>

                {template.companyName && (
                  <div style={{ marginBottom: 8, fontSize: 11 }}>
                    <div className="muted">Şirket: {template.companyName}</div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: template.primaryColor || "#4472C4",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                    title="Ana Renk"
                  />
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: template.secondaryColor || "#6B7280",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                    title="İkincil Renk"
                  />
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: template.accentColor || "#10B981",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                    }}
                    title="Vurgu Rengi"
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Link href={`/admin/template-preview?id=${template._id}`}>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      Önizle
                    </button>
                  </Link>
                  <button
                    className="button button-secondary"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => handleExport(template._id, template.name)}
                  >
                    Export
                  </button>
                  {!IS_READONLY && (
                    <>
                      {!template.isDefault && (
                        <button
                          className="button button-secondary"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                          onClick={() => handleSetDefault(template._id)}
                        >
                          Varsayılan Yap
                        </button>
                      )}
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleCopy(template._id, template.name)}
                      >
                        Kopyala
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleEdit(template)}
                      >
                        Düzenle
                      </button>
                      <button
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => handleDelete(template._id, template.name)}
                      >
                        Sil
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

