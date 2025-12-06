import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import {
  fetchAllComplianceReports,
  ComplianceReport,
} from "../../lib/api";

interface Props {
  reports: ComplianceReport[] | null;
  error?: string;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f87171";
    case "medium":
      return "#fbbf24";
    case "low":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

function complianceColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 70) return "#fbbf24";
  if (score >= 50) return "#f87171";
  return "#ef4444";
}

export default function CompliancePage({ reports, error }: Props) {
  return (
    <div className="layout">
      <Head>
        <title>Compliance Raporları - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Compliance Raporları</div>
        <Link href="/">
          <button className="button button-secondary">Ana Sayfa</button>
        </Link>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {!reports && !error && <p>Yükleniyor...</p>}

        {reports && reports.length === 0 && (
          <p>Compliance raporu oluşturulamadı.</p>
        )}

        {reports && reports.length > 0 && (
          <>
            <div className="muted" style={{ marginBottom: 16 }}>
              {reports.length} compliance standard için rapor oluşturuldu.
            </div>

            <div className="grid">
              {reports.map((report) => (
                <div key={report.standard} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>
                        {report.standard}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {report.passedChecks}/{report.totalChecks} kontrol geçti
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: complianceColor(report.overallCompliance),
                      }}
                    >
                      {report.overallCompliance}%
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                      fontSize: 11,
                    }}
                  >
                    {report.summary.criticalIssues > 0 && (
                      <span style={{ color: "#ef4444" }}>
                        Critical: {report.summary.criticalIssues}
                      </span>
                    )}
                    {report.summary.highIssues > 0 && (
                      <span style={{ color: "#f87171" }}>
                        High: {report.summary.highIssues}
                      </span>
                    )}
                    {report.summary.mediumIssues > 0 && (
                      <span style={{ color: "#fbbf24" }}>
                        Medium: {report.summary.mediumIssues}
                      </span>
                    )}
                    {report.summary.lowIssues > 0 && (
                      <span style={{ color: "#10b981" }}>
                        Low: {report.summary.lowIssues}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Kontroller:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {report.checks.map((check, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 8,
                            backgroundColor: "#1f2937",
                            borderRadius: 4,
                            fontSize: 12,
                            borderLeft: `3px solid ${
                              check.passed
                                ? "#10b981"
                                : severityColor(check.severity)
                            }`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                              marginBottom: 4,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>
                                {check.passed ? "✅" : "❌"} {check.requirement}
                              </div>
                              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                {check.details}
                              </div>
                            </div>
                            {!check.passed && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  backgroundColor: severityColor(check.severity),
                                  color: "white",
                                }}
                              >
                                {check.severity.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 12, fontSize: 11 }}>
                    Oluşturulma:{" "}
                    {new Date(report.generatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const reports = await fetchAllComplianceReports();
    return { props: { reports } };
  } catch (e: any) {
    console.error("Error in getServerSideProps:", e);
    return {
      props: {
        reports: null,
        error: e.message || "Backend'den compliance raporları alınamadı.",
      },
    };
  }
};

