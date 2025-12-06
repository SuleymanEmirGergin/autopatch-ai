import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchReportHistory,
  fetchReportHistoryById,
  ReportHistory,
  ReportHistoryType,
} from "../../lib/api";

const REPORT_TYPE_LABELS: Record<ReportHistoryType, string> = {
  RISK_SUMMARY: "Risk Özet",
  EXECUTIVE: "Executive Summary",
  COMPLIANCE: "Compliance",
  DETAILED: "Detaylı Analiz",
  EXCEL_EXPORT: "Excel Export",
  CSV_EXPORT: "CSV Export",
  JSON_EXPORT: "JSON Export",
};

export default function ReportComparisonPage() {
  const [reports, setReports] = useState<ReportHistory[]>([]);
  const [report1, setReport1] = useState<ReportHistory | null>(null);
  const [report2, setReport2] = useState<ReportHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingReport1, setLoadingReport1] = useState(false);
  const [loadingReport2, setLoadingReport2] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await fetchReportHistory(1, 100); // Son 100 raporu getir
      setReports(result.reports);
    } catch (e: any) {
      setError(e.message || "Raporlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (id: string, setReport: (r: ReportHistory) => void, setLoading: (l: boolean) => void) => {
    try {
      setLoading(true);
      const report = await fetchReportHistoryById(id);
      setReport(report);
    } catch (e: any) {
      alert(e.message || "Rapor yüklenemedi.");
    } finally {
      setLoading(false);
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

  const compareStats = (stat1?: any, stat2?: any) => {
    if (!stat1 && !stat2) return null;
    const changes: Array<{ label: string; value1: string; value2: string; change?: number }> = [];

    if (stat1?.totalImages !== undefined || stat2?.totalImages !== undefined) {
      const val1 = stat1?.totalImages ?? 0;
      const val2 = stat2?.totalImages ?? 0;
      const change = val2 - val1;
      changes.push({
        label: "Toplam Image",
        value1: val1.toString(),
        value2: val2.toString(),
        change,
      });
    }

    if (stat1?.highOrCritical !== undefined || stat2?.highOrCritical !== undefined) {
      const val1 = stat1?.highOrCritical ?? 0;
      const val2 = stat2?.highOrCritical ?? 0;
      const change = val2 - val1;
      changes.push({
        label: "HIGH/CRITICAL",
        value1: val1.toString(),
        value2: val2.toString(),
        change,
      });
    }

    if (stat1?.avgRiskScore !== undefined || stat2?.avgRiskScore !== undefined) {
      const val1 = stat1?.avgRiskScore ?? 0;
      const val2 = stat2?.avgRiskScore ?? 0;
      const change = val2 - val1;
      changes.push({
        label: "Ortalama Risk Skoru",
        value1: val1.toFixed(1),
        value2: val2.toFixed(1),
        change,
      });
    }

    if (stat1?.prodImpactedPods !== undefined || stat2?.prodImpactedPods !== undefined) {
      const val1 = stat1?.prodImpactedPods ?? 0;
      const val2 = stat2?.prodImpactedPods ?? 0;
      const change = val2 - val1;
      changes.push({
        label: "Prod Pod Etkisi",
        value1: val1.toString(),
        value2: val2.toString(),
        change,
      });
    }

    return changes;
  };

  return (
    <div className="layout">
      <Head>
        <title>Rapor Karşılaştırma - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Rapor Karşılaştırma</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/report-history">
            <button className="button button-secondary">Rapor Geçmişi</button>
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

        {/* Rapor Seçimi */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Rapor 1 */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Rapor 1</h3>
            {loadingReport1 ? (
              <div style={{ textAlign: "center", padding: 24 }}>Yükleniyor...</div>
            ) : report1 ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {REPORT_TYPE_LABELS[report1.reportType]}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    {report1.fileName}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {formatDate(report1.createdAt)}
                  </div>
                  {report1.templateName && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      Şablon: {report1.templateName}
                    </div>
                  )}
                </div>
                <button
                  className="button button-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setReport1(null)}
                >
                  Değiştir
                </button>
              </div>
            ) : (
              <div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      loadReport(e.target.value, setReport1, setLoadingReport1);
                    }
                  }}
                  style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
                >
                  <option value="">Rapor seçin...</option>
                  {reports.map((r) => (
                    <option key={r._id} value={r._id}>
                      {REPORT_TYPE_LABELS[r.reportType]} - {formatDate(r.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rapor 2 */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Rapor 2</h3>
            {loadingReport2 ? (
              <div style={{ textAlign: "center", padding: 24 }}>Yükleniyor...</div>
            ) : report2 ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {REPORT_TYPE_LABELS[report2.reportType]}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    {report2.fileName}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {formatDate(report2.createdAt)}
                  </div>
                  {report2.templateName && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      Şablon: {report2.templateName}
                    </div>
                  )}
                </div>
                <button
                  className="button button-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setReport2(null)}
                >
                  Değiştir
                </button>
              </div>
            ) : (
              <div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      loadReport(e.target.value, setReport2, setLoadingReport2);
                    }
                  }}
                  style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
                >
                  <option value="">Rapor seçin...</option>
                  {reports.map((r) => (
                    <option key={r._id} value={r._id}>
                      {REPORT_TYPE_LABELS[r.reportType]} - {formatDate(r.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Karşılaştırma Sonuçları */}
        {report1 && report2 && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Karşılaştırma Sonuçları</h3>

            {/* İstatistik Karşılaştırması */}
            {report1.stats && report2.stats && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12 }}>İstatistik Karşılaştırması</h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Metrik</th>
                        <th style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>
                          {formatDate(report1.createdAt).split(" ")[0]}
                        </th>
                        <th style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>
                          {formatDate(report2.createdAt).split(" ")[0]}
                        </th>
                        <th style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>Değişim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareStats(report1.stats, report2.stats)?.map((change, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: 12 }}>{change.label}</td>
                          <td style={{ padding: 12, textAlign: "right" }}>{change.value1}</td>
                          <td style={{ padding: 12, textAlign: "right" }}>{change.value2}</td>
                          <td
                            style={{
                              padding: 12,
                              textAlign: "right",
                              color:
                                change.change === undefined
                                  ? "#6b7280"
                                  : change.change > 0
                                  ? "#ef4444"
                                  : change.change < 0
                                  ? "#10b981"
                                  : "#6b7280",
                              fontWeight: change.change !== undefined && change.change !== 0 ? 600 : 400,
                            }}
                          >
                            {change.change !== undefined ? (
                              <>
                                {change.change > 0 ? "+" : ""}
                                {change.change.toFixed(change.label.includes("Skoru") ? 1 : 0)}
                                {change.label.includes("Skoru") ? "" : ""}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Filtre Karşılaştırması */}
            {(report1.filters || report2.filters) && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12 }}>Filtre Karşılaştırması</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Rapor 1 Filtreleri</div>
                    <div style={{ fontSize: 13 }}>
                      {report1.filters ? (
                        <div>
                          {report1.filters.riskLevel && (
                            <div>Risk Seviyesi: {report1.filters.riskLevel}</div>
                          )}
                          {report1.filters.namespace && (
                            <div>Namespace: {report1.filters.namespace}</div>
                          )}
                          {report1.filters.clusterId && (
                            <div>Cluster ID: {report1.filters.clusterId}</div>
                          )}
                          {report1.filters.projectId && (
                            <div>Project ID: {report1.filters.projectId}</div>
                          )}
                          {report1.filters.standard && (
                            <div>Standard: {report1.filters.standard}</div>
                          )}
                          {!report1.filters.riskLevel &&
                            !report1.filters.namespace &&
                            !report1.filters.clusterId &&
                            !report1.filters.projectId &&
                            !report1.filters.standard && <div className="muted">Filtre yok</div>}
                        </div>
                      ) : (
                        <div className="muted">Filtre yok</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Rapor 2 Filtreleri</div>
                    <div style={{ fontSize: 13 }}>
                      {report2.filters ? (
                        <div>
                          {report2.filters.riskLevel && (
                            <div>Risk Seviyesi: {report2.filters.riskLevel}</div>
                          )}
                          {report2.filters.namespace && (
                            <div>Namespace: {report2.filters.namespace}</div>
                          )}
                          {report2.filters.clusterId && (
                            <div>Cluster ID: {report2.filters.clusterId}</div>
                          )}
                          {report2.filters.projectId && (
                            <div>Project ID: {report2.filters.projectId}</div>
                          )}
                          {report2.filters.standard && (
                            <div>Standard: {report2.filters.standard}</div>
                          )}
                          {!report2.filters.riskLevel &&
                            !report2.filters.namespace &&
                            !report2.filters.clusterId &&
                            !report2.filters.projectId &&
                            !report2.filters.standard && <div className="muted">Filtre yok</div>}
                        </div>
                      ) : (
                        <div className="muted">Filtre yok</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Genel Bilgiler */}
            <div>
              <h4 style={{ marginBottom: 12 }}>Genel Bilgiler</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Rapor Türü</div>
                  <div style={{ fontSize: 13 }}>
                    {REPORT_TYPE_LABELS[report1.reportType]} vs {REPORT_TYPE_LABELS[report2.reportType]}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Format</div>
                  <div style={{ fontSize: 13 }}>
                    {report1.format || "-"} vs {report2.format || "-"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Zaman Farkı</div>
                  <div style={{ fontSize: 13 }}>
                    {Math.round(
                      (new Date(report2.createdAt).getTime() - new Date(report1.createdAt).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    gün
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Şablon</div>
                  <div style={{ fontSize: 13 }}>
                    {report1.templateName || "-"} vs {report2.templateName || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!report1 || !report2 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
              Karşılaştırma için iki rapor seçin
            </div>
            <div style={{ fontSize: 14, color: "#9ca3af" }}>
              Yukarıdan iki rapor seçerek karşılaştırma yapabilirsiniz
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

