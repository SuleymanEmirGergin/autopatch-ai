import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import {
  generateReport,
  ReportType,
  ReportFormat,
  ComplianceStandard,
  exportData,
  exportComplianceToExcel,
  ExportFormat,
  ExportOptions,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: "RISK_SUMMARY",
    label: "Risk Özet Raporu",
    description: "Tüm image'lerin risk skorları ve özet bilgileri",
  },
  {
    value: "EXECUTIVE",
    label: "Executive Summary",
    description: "Yönetim için özet rapor (key metrics, trend analizi)",
  },
  {
    value: "COMPLIANCE",
    label: "Compliance Raporu",
    description: "Compliance standartlarına göre değerlendirme raporu",
  },
  {
    value: "DETAILED",
    label: "Detaylı Analiz Raporu",
    description: "Kapsamlı risk analizi ve istatistikler",
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>("RISK_SUMMARY");
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("PDF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    riskLevel: "ALL",
    namespace: "ALL",
    standard: "ALL" as ComplianceStandard | "ALL",
    clusterId: "",
    projectId: "",
    templateId: "",
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const options: any = {};
      if (filters.riskLevel !== "ALL") options.riskLevel = filters.riskLevel;
      if (filters.namespace !== "ALL") options.namespace = filters.namespace;
      if (filters.standard !== "ALL") options.standard = filters.standard;
      if (filters.clusterId) options.clusterId = filters.clusterId;
      if (filters.projectId) options.projectId = filters.projectId;
      if (filters.templateId) options.templateId = filters.templateId;
      options.format = selectedFormat;

      const blob = await generateReport(selectedType, options);

      // Raporu indir veya yeni pencerede aç
      const fileExtension = selectedFormat === "HTML" ? "html" : selectedFormat === "MARKDOWN" ? "md" : "pdf";
      const url = window.URL.createObjectURL(blob);
      
      if (selectedFormat === "HTML") {
        // HTML için yeni pencerede aç
        const newWindow = window.open(url, "_blank");
        if (!newWindow) {
          // Popup blocker varsa indir
          const a = document.createElement("a");
          a.href = url;
          a.download = `autopatch-${selectedType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        // PDF veya Markdown için indir
        const a = document.createElement("a");
        a.href = url;
        a.download = `autopatch-${selectedType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e: any) {
      setError(e.message || "Rapor oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Rapor Oluştur - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Rapor Oluştur</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        <div className="card" style={{ maxWidth: 800 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Rapor Tipi Seçin</h3>

          <div style={{ marginBottom: 16 }}>
            {REPORT_TYPES.map((type) => (
              <label
                key={type.value}
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  border: `2px solid ${selectedType === type.value ? "var(--accent)" : "var(--border-color)"}`,
                  backgroundColor: selectedType === type.value ? "var(--bg-tertiary)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setSelectedType(type.value)}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={() => setSelectedType(type.value)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{type.label}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{type.description}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Format Seçimi */}
          <div style={{ marginBottom: 16 }}>
            <label className="muted" style={{ display: "block", marginBottom: 8 }}>
              Format
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="format"
                  value="PDF"
                  checked={selectedFormat === "PDF"}
                  onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                />
                <span>PDF</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="format"
                  value="HTML"
                  checked={selectedFormat === "HTML"}
                  onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                />
                <span>HTML</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="format"
                  value="MARKDOWN"
                  checked={selectedFormat === "MARKDOWN"}
                  onChange={(e) => setSelectedFormat(e.target.value as ReportFormat)}
                />
                <span>Markdown</span>
              </label>
            </div>
          </div>

          {/* Filtreler */}
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: "var(--bg-tertiary)", borderRadius: 8 }}>
            <h4 style={{ fontSize: 14, marginTop: 0, marginBottom: 12 }}>Filtreler (Opsiyonel)</h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Risk Seviyesi
                </label>
                <select
                  className="select"
                  value={filters.riskLevel}
                  onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                  style={{ fontSize: 12 }}
                >
                  <option value="ALL">Tümü</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Namespace
                </label>
                <input
                  className="input"
                  type="text"
                  value={filters.namespace === "ALL" ? "" : filters.namespace}
                  onChange={(e) => setFilters({ ...filters, namespace: e.target.value || "ALL" })}
                  placeholder="Namespace (boş = tümü)"
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>

            {selectedType === "COMPLIANCE" && (
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Compliance Standardı
                </label>
                <select
                  className="select"
                  value={filters.standard}
                  onChange={(e) => setFilters({ ...filters, standard: e.target.value as ComplianceStandard | "ALL" })}
                  style={{ fontSize: 12 }}
                >
                  <option value="ALL">Tüm Standartlar</option>
                  <option value="PCI-DSS">PCI-DSS</option>
                  <option value="SOC2">SOC 2</option>
                  <option value="ISO27001">ISO 27001</option>
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Cluster ID (Opsiyonel)
                </label>
                <input
                  className="input"
                  type="text"
                  value={filters.clusterId}
                  onChange={(e) => setFilters({ ...filters, clusterId: e.target.value })}
                  placeholder="Cluster ID"
                  style={{ fontSize: 12 }}
                />
              </div>

              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Project ID (Opsiyonel)
                </label>
                <input
                  className="input"
                  type="text"
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  placeholder="Project ID"
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>
          </div>

          <button
            className="button"
            onClick={handleGenerate}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Rapor Oluşturuluyor..." : "PDF Raporu Oluştur ve İndir"}
          </button>
        </div>

        {!IS_READONLY && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <Link href="/admin/scheduled-reports">
              <button className="button button-secondary">
                Scheduled Reports Yönetimi →
              </button>
            </Link>
          </div>
        )}

        <div className="card" style={{ maxWidth: 800, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>CSV/Excel Export</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              className="button button-secondary"
              onClick={async () => {
                try {
                  const blob = await exportData({
                    format: "CSV",
                    riskLevel: filters.riskLevel !== "ALL" ? filters.riskLevel : undefined,
                    namespace: filters.namespace !== "ALL" ? filters.namespace : undefined,
                    clusterId: filters.clusterId || undefined,
                    projectId: filters.projectId || undefined,
                    includeRiskFactors: true,
                    includePods: false,
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `autopatch-export-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e: any) {
                  alert(e.message || "Export başarısız");
                }
              }}
            >
              CSV İndir
            </button>
            <button
              className="button button-secondary"
              onClick={async () => {
                try {
                  const blob = await exportData({
                    format: "XLSX",
                    riskLevel: filters.riskLevel !== "ALL" ? filters.riskLevel : undefined,
                    namespace: filters.namespace !== "ALL" ? filters.namespace : undefined,
                    clusterId: filters.clusterId || undefined,
                    projectId: filters.projectId || undefined,
                    includeRiskFactors: true,
                    includePods: true,
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `autopatch-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e: any) {
                  alert(e.message || "Export başarısız");
                }
              }}
            >
              Excel İndir
            </button>
            {selectedType === "COMPLIANCE" && (
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    const blob = await exportComplianceToExcel(
                      filters.standard !== "ALL" ? filters.standard : undefined,
                      filters.clusterId || undefined,
                      filters.projectId || undefined
                    );
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (e: any) {
                    alert(e.message || "Export başarısız");
                  }
                }}
              >
                Compliance Excel İndir
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 800, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Rapor Tipleri Hakkında</h3>
          <div style={{ fontSize: 13 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>Risk Özet Raporu:</strong> Tüm image'lerin risk skorları, risk faktörleri ve pod bilgilerini içeren temel rapor.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Executive Summary:</strong> Yönetim için hazırlanmış özet rapor. Key metrics, trend analizi ve öneriler içerir.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Compliance Raporu:</strong> PCI-DSS, SOC 2 veya ISO 27001 standartlarına göre compliance durumu ve gereksinimler.
            </p>
            <p>
              <strong>Detaylı Analiz Raporu:</strong> Kapsamlı risk analizi, risk faktörü dağılımı, namespace analizi ve detaylı image listesi.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

