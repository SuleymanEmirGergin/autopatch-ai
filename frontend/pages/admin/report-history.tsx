import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchReportHistory,
  fetchReportHistoryStatistics,
  deleteReportHistory,
  ReportHistory,
  ReportHistoryType,
  ReportHistoryStatistics,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const REPORT_TYPE_LABELS: Record<ReportHistoryType, string> = {
  RISK_SUMMARY: "Risk Özet",
  EXECUTIVE: "Executive Summary",
  COMPLIANCE: "Compliance",
  DETAILED: "Detaylı Analiz",
  EXCEL_EXPORT: "Excel Export",
  CSV_EXPORT: "CSV Export",
  JSON_EXPORT: "JSON Export",
};

const FORMAT_LABELS: Record<string, string> = {
  PDF: "PDF",
  XLSX: "Excel",
  CSV: "CSV",
  JSON: "JSON",
};

export default function ReportHistoryPage() {
  const [reports, setReports] = useState<ReportHistory[]>([]);
  const [statistics, setStatistics] = useState<ReportHistoryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    reportType: "" as ReportHistoryType | "",
    templateId: "",
    clusterId: "",
    projectId: "",
    startDate: "",
    endDate: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, filters]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReportHistory(page, 20, {
        reportType: filters.reportType || undefined,
        templateId: filters.templateId || undefined,
        clusterId: filters.clusterId || undefined,
        projectId: filters.projectId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setReports(result.reports);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message || "Rapor geçmişi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await fetchReportHistoryStatistics();
      setStatistics(stats);
    } catch (e: any) {
      console.error("İstatistikler yüklenemedi:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu rapor geçmişini silmek istediğinize emin misiniz?")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteReportHistory(id);
      await loadData();
      await loadStatistics();
    } catch (e: any) {
      alert(e.message || "Rapor geçmişi silinemedi.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="layout">
      <Head>
        <title>Rapor Geçmişi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Rapor Geçmişi</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/reports">
            <button className="button button-secondary">Rapor Oluştur</button>
          </Link>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="main-content">
        {/* İstatistikler */}
        {statistics && (
          <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#2563eb" }}>
                {statistics.totalReports}
              </div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>Toplam Rapor</div>
            </div>
            {Object.entries(statistics.reportsByType).map(([type, count]) => (
              <div key={type} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 20, fontWeight: "bold" }}>{count}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  {REPORT_TYPE_LABELS[type as ReportHistoryType]}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filtreler */}
        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Filtreler</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Rapor Türü
              </label>
              <select
                value={filters.reportType}
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value as ReportHistoryType | "" })}
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              >
                <option value="">Tümü</option>
                {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Cluster ID
              </label>
              <input
                type="text"
                value={filters.clusterId}
                onChange={(e) => setFilters({ ...filters, clusterId: e.target.value })}
                placeholder="Tümü"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Project ID
              </label>
              <input
                type="text"
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                placeholder="Tümü"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => {
                setFilters({
                  reportType: "",
                  templateId: "",
                  clusterId: "",
                  projectId: "",
                  startDate: "",
                  endDate: "",
                });
                setPage(1);
              }}
              className="button button-secondary"
              style={{ fontSize: 14 }}
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Rapor listesi */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div>Yükleniyor...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
              Henüz rapor geçmişi yok
            </div>
            <Link href="/admin/reports">
              <button className="button button-primary">İlk Raporu Oluştur</button>
            </Link>
          </div>
        ) : (
          <>
            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Rapor Türü</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Dosya Adı</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Format</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Boyut</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Şablon</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>İstatistikler</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Oluşturulma</th>
                      {!IS_READONLY && (
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>İşlemler</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: 12 }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: "#eff6ff",
                              color: "#1e40af",
                            }}
                          >
                            {REPORT_TYPE_LABELS[report.reportType]}
                          </span>
                        </td>
                        <td style={{ padding: 12, fontFamily: "monospace", fontSize: 13 }}>
                          {report.fileName}
                        </td>
                        <td style={{ padding: 12 }}>
                          {report.format ? (
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: 12,
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                              }}
                            >
                              {FORMAT_LABELS[report.format]}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: 12, color: "#6b7280" }}>
                          {formatFileSize(report.fileSize)}
                        </td>
                        <td style={{ padding: 12 }}>
                          {report.templateName ? (
                            <span style={{ fontSize: 13 }}>{report.templateName}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          {report.stats ? (
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {report.stats.totalImages !== undefined && (
                                <div>📊 {report.stats.totalImages} image</div>
                              )}
                              {report.stats.highOrCritical !== undefined && (
                                <div>⚠️ {report.stats.highOrCritical} HIGH/CRITICAL</div>
                              )}
                              {report.stats.avgRiskScore !== undefined && (
                                <div>📈 Ort: {report.stats.avgRiskScore.toFixed(1)}</div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
                          {formatDate(report.createdAt)}
                        </td>
                        {!IS_READONLY && (
                          <td style={{ padding: 12 }}>
                            <button
                              onClick={() => handleDelete(report._id)}
                              disabled={deletingId === report._id}
                              className="button button-danger"
                              style={{ fontSize: 12, padding: "4px 8px" }}
                            >
                              {deletingId === report._id ? "Siliniyor..." : "Sil"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sayfalama */}
            {totalPages > 1 && (
              <div style={{ marginTop: 24, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="button button-secondary"
                >
                  Önceki
                </button>
                <span style={{ color: "#6b7280" }}>
                  Sayfa {page} / {totalPages} (Toplam: {total})
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="button button-secondary"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

