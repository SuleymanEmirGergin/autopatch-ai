import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  fetchReportTemplates,
  fetchReportTemplate,
  previewReportTemplate,
  ReportTemplate,
} from "../../lib/api";

export default function TemplatePreviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"config" | "visual">("visual");

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadTemplate(id);
    }
  }, [id]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchReportTemplates();
      setTemplates(data);
      if (data.length > 0 && !id) {
        setSelectedTemplate(data[0]);
      }
    } catch (e: any) {
      setError(e.message || "Şablonlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const template = await fetchReportTemplate(templateId);
      setSelectedTemplate(template);
    } catch (e: any) {
      setError(e.message || "Şablon yüklenemedi.");
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    router.push(`/admin/template-preview?id=${templateId}`);
  };

  if (loading) {
    return (
      <div className="layout">
        <Head>
          <title>Şablon Önizleme - AutoPatch AI</title>
        </Head>
        <div style={{ textAlign: "center", padding: 48 }}>
          <div>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <Head>
        <title>Şablon Önizleme - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Şablon Önizleme</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/report-templates">
            <button className="button button-secondary">Şablon Yönetimi</button>
          </Link>
          <Link href="/admin/reports">
            <button className="button button-secondary">Rapor Oluştur</button>
          </Link>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
          {/* Şablon Listesi */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Şablonlar</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((template) => (
                <button
                  key={template._id}
                  onClick={() => handleTemplateSelect(template._id)}
                  className={`button ${selectedTemplate?._id === template._id ? "button-primary" : "button-secondary"}`}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    fontSize: 14,
                    justifyContent: "flex-start",
                  }}
                >
                  <div style={{ fontWeight: selectedTemplate?._id === template._id ? 600 : 400 }}>
                    {template.name}
                  </div>
                  {template.isDefault && (
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Varsayılan</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Önizleme */}
          <div>
            {selectedTemplate ? (
              <>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>{selectedTemplate.name}</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setPreviewMode("visual")}
                        className={`button ${previewMode === "visual" ? "button-primary" : "button-secondary"}`}
                        style={{ fontSize: 12 }}
                      >
                        Görsel Önizleme
                      </button>
                      <button
                        onClick={() => setPreviewMode("config")}
                        className={`button ${previewMode === "config" ? "button-primary" : "button-secondary"}`}
                        style={{ fontSize: 12 }}
                      >
                        Yapılandırma
                      </button>
                    </div>
                  </div>
                  {selectedTemplate.description && (
                    <p style={{ color: "#6b7280", marginBottom: 16 }}>{selectedTemplate.description}</p>
                  )}
                </div>

                {previewMode === "visual" ? (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 16 }}>Görsel Önizleme</h4>
                    
                    {/* Logo Önizleme */}
                    {selectedTemplate.logo && (
                      <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Logo</div>
                        <img
                          src={selectedTemplate.logo}
                          alt="Logo"
                          style={{ maxWidth: 200, maxHeight: 100, objectFit: "contain" }}
                        />
                      </div>
                    )}

                    {/* Renk Şeması Önizleme */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Renk Şeması</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div>
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              backgroundColor: selectedTemplate.primaryColor || "#4472C4",
                              borderRadius: 4,
                              marginBottom: 4,
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Primary</div>
                        </div>
                        <div>
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              backgroundColor: selectedTemplate.secondaryColor || "#6B7280",
                              borderRadius: 4,
                              marginBottom: 4,
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Secondary</div>
                        </div>
                        <div>
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              backgroundColor: selectedTemplate.accentColor || "#10B981",
                              borderRadius: 4,
                              marginBottom: 4,
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Accent</div>
                        </div>
                      </div>
                    </div>

                    {/* Şirket Bilgileri */}
                    {(selectedTemplate.companyName || selectedTemplate.companyAddress || selectedTemplate.companyContact) && (
                      <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Şirket Bilgileri</div>
                        {selectedTemplate.companyName && (
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedTemplate.companyName}</div>
                        )}
                        {selectedTemplate.companyAddress && (
                          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                            {selectedTemplate.companyAddress}
                          </div>
                        )}
                        {selectedTemplate.companyContact && (
                          <div style={{ fontSize: 13, color: "#6b7280" }}>{selectedTemplate.companyContact}</div>
                        )}
                      </div>
                    )}

                    {/* Header/Footer Text */}
                    {selectedTemplate.headerText && (
                      <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#eff6ff", borderRadius: 4 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Header Text</div>
                        <div style={{ color: selectedTemplate.primaryColor || "#4472C4", fontWeight: 600 }}>
                          {selectedTemplate.headerText}
                        </div>
                      </div>
                    )}

                    {selectedTemplate.footerText && (
                      <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Footer Text</div>
                        <div style={{ color: selectedTemplate.secondaryColor || "#6B7280", fontSize: 12 }}>
                          {selectedTemplate.footerText}
                        </div>
                      </div>
                    )}

                    {/* İçerik Seçenekleri */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>İçerik Seçenekleri</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                        {selectedTemplate.contentOptions?.includeSummary && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Risk Özeti</div>
                        )}
                        {selectedTemplate.contentOptions?.includeRiskDistribution && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Risk Dağılımı</div>
                        )}
                        {selectedTemplate.contentOptions?.includeTopRiskyImages && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>
                            ✓ En Riskli {selectedTemplate.contentOptions.topRiskyCount || 10} Image
                          </div>
                        )}
                        {selectedTemplate.contentOptions?.includeRiskFactorAnalysis && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Risk Faktörü Analizi</div>
                        )}
                        {selectedTemplate.contentOptions?.includeNamespaceAnalysis && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Namespace Analizi</div>
                        )}
                        {selectedTemplate.contentOptions?.includeTrends && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Trend Analizi</div>
                        )}
                        {selectedTemplate.contentOptions?.includeRecommendations && (
                          <div style={{ fontSize: 13, color: "#10b981" }}>✓ Öneriler</div>
                        )}
                      </div>
                    </div>

                    {/* PDF Ayarları */}
                    {selectedTemplate.pdfOptions && (
                      <div style={{ padding: 16, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>PDF Ayarları</div>
                        <div style={{ fontSize: 13 }}>
                          <div>Sayfa Boyutu: {selectedTemplate.pdfOptions.pageSize || "A4"}</div>
                          <div>Yönlendirme: {selectedTemplate.pdfOptions.orientation || "portrait"}</div>
                          <div>Font: {selectedTemplate.pdfOptions.fontFamily || "Helvetica"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 16 }}>Yapılandırma Detayları</h4>
                    <pre
                      style={{
                        backgroundColor: "#f9fafb",
                        padding: 16,
                        borderRadius: 8,
                        overflow: "auto",
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      {JSON.stringify(selectedTemplate.config || selectedTemplate, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
                  Şablon seçin
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Önizlemek için soldan bir şablon seçin
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

