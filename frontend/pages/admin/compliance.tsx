import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchComplianceAssessments,
  fetchLatestComplianceAssessment,
  assessCompliance,
  ComplianceAssessment,
  ComplianceStandard,
  ComplianceStatus,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const STANDARDS: ComplianceStandard[] = ["PCI-DSS", "SOC2", "ISO27001"];

function getStandardLabel(standard: ComplianceStandard): string {
  const labels: Record<ComplianceStandard, string> = {
    "PCI-DSS": "PCI-DSS",
    SOC2: "SOC 2",
    ISO27001: "ISO 27001",
  };
  return labels[standard] || standard;
}

function getStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case "PASS":
      return "#10b981";
    case "FAIL":
      return "#ef4444";
    case "WARNING":
      return "#fbbf24";
    case "NOT_APPLICABLE":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

function getStatusLabel(status: ComplianceStatus): string {
  const labels: Record<ComplianceStatus, string> = {
    PASS: "✅ Geçti",
    FAIL: "❌ Başarısız",
    WARNING: "⚠️ Uyarı",
    NOT_APPLICABLE: "➖ Uygulanamaz",
  };
  return labels[status] || status;
}

export default function CompliancePage() {
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<ComplianceStandard | "ALL">("ALL");
  const [assessing, setAssessing] = useState<string | null>(null);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const standard = selectedStandard !== "ALL" ? selectedStandard : undefined;
      const data = await fetchComplianceAssessments(standard);
      setAssessments(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Compliance assessment'lar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssess = async (standard: ComplianceStandard) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Assessment yapılamaz.");
      return;
    }

    try {
      setAssessing(standard);
      await assessCompliance(standard);
      await loadAssessments();
    } catch (e: any) {
      setError(e.message || "Assessment yapılamadı.");
    } finally {
      setAssessing(null);
    }
  };

  // Her standart için en son assessment'ı bul
  const latestAssessments = STANDARDS.map((standard) => {
    const latest = assessments
      .filter((a) => a.standard === standard)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];
    return { standard, assessment: latest };
  });

  return (
    <div className="layout">
      <Head>
        <title>Compliance Dashboard - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Compliance Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadAssessments}>
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

        {/* Standart Özeti */}
        <div className="grid" style={{ marginBottom: 24 }}>
          {latestAssessments.map(({ standard, assessment }) => (
            <div
              key={standard}
              className="card"
              style={{
                borderLeft: `4px solid ${
                  assessment
                    ? getStatusColor(assessment.overallStatus)
                    : "#6b7280"
                }`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                    {getStandardLabel(standard)}
                  </div>
                  {assessment && (
                    <div className="muted" style={{ fontSize: 11 }}>
                      {assessment.version}
                    </div>
                  )}
                </div>
                {assessment && (
                  <span
                    className={`badge ${
                      assessment.overallStatus === "PASS"
                        ? "badge-low"
                        : assessment.overallStatus === "FAIL"
                        ? "badge-critical"
                        : "badge-medium"
                    }`}
                    style={{ fontSize: 10 }}
                  >
                    {getStatusLabel(assessment.overallStatus)}
                  </span>
                )}
              </div>

              {assessment ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 32, fontWeight: "bold", color: getStatusColor(assessment.overallStatus) }}>
                      {assessment.complianceScore}%
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      Compliance Skoru
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      Gereksinimler:
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                      <span style={{ color: "#10b981" }}>
                        ✅ {assessment.passedRequirements}
                      </span>
                      <span style={{ color: "#ef4444" }}>
                        ❌ {assessment.failedRequirements}
                      </span>
                      <span style={{ color: "#fbbf24" }}>
                        ⚠️ {assessment.warningRequirements}
                      </span>
                    </div>
                  </div>

                  <div className="muted" style={{ fontSize: 10 }}>
                    Son değerlendirme: {new Date(assessment.assessedAt).toLocaleString()}
                  </div>
                  {assessment.nextAssessmentDue && (
                    <div className="muted" style={{ fontSize: 10 }}>
                      Sonraki değerlendirme: {new Date(assessment.nextAssessmentDue).toLocaleDateString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Henüz değerlendirme yapılmamış
                </div>
              )}

              {!IS_READONLY && (
                <button
                  className="button button-secondary"
                  style={{ marginTop: 12, fontSize: 12, padding: "6px 12px" }}
                  onClick={() => handleAssess(standard)}
                  disabled={assessing === standard}
                >
                  {assessing === standard ? "Değerlendiriliyor..." : "Değerlendir"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Filtre */}
        <div style={{ marginBottom: 16 }}>
          <span className="muted" style={{ fontSize: 12, marginRight: 8 }}>Standart:</span>
          <select
            className="select"
            value={selectedStandard}
            onChange={(e) => {
              setSelectedStandard(e.target.value as ComplianceStandard | "ALL");
              loadAssessments();
            }}
            style={{ fontSize: 12 }}
          >
            <option value="ALL">Tümü</option>
            {STANDARDS.map((s) => (
              <option key={s} value={s}>
                {getStandardLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {loading && <p>Yükleniyor...</p>}

        {!loading && assessments.length === 0 && (
          <p className="muted">Henüz compliance assessment bulunmuyor.</p>
        )}

        {/* Detaylı Assessment Listesi */}
        {!loading && assessments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assessments.map((assessment) => (
              <div
                key={assessment._id}
                className="card"
                style={{
                  borderLeft: `4px solid ${getStatusColor(assessment.overallStatus)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                      {getStandardLabel(assessment.standard)} - {assessment.version}
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      Değerlendirme: {new Date(assessment.assessedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: getStatusColor(assessment.overallStatus),
                      }}
                    >
                      {assessment.complianceScore}%
                    </div>
                    <span
                      className={`badge ${
                        assessment.overallStatus === "PASS"
                          ? "badge-low"
                          : assessment.overallStatus === "FAIL"
                          ? "badge-critical"
                          : "badge-medium"
                      }`}
                      style={{ fontSize: 10 }}
                    >
                      {getStatusLabel(assessment.overallStatus)}
                    </span>
                  </div>
                </div>

                {/* Requirements Listesi */}
                <div>
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Gereksinimler</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {assessment.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          backgroundColor: "var(--bg-tertiary)",
                          borderRadius: 6,
                          borderLeft: `3px solid ${getStatusColor(req.status)}`,
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
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                              {req.id}: {req.title}
                            </div>
                            <div className="muted" style={{ fontSize: 11 }}>
                              {req.description}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span
                              className={`badge badge-${req.severity.toLowerCase()}`}
                              style={{ fontSize: 9 }}
                            >
                              {req.severity}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: getStatusColor(req.status),
                                color: "white",
                              }}
                            >
                              {getStatusLabel(req.status)}
                            </span>
                          </div>
                        </div>
                        {req.notes && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            📝 {req.notes}
                          </div>
                        )}
                        {req.evidence && req.evidence.length > 0 && (
                          <div style={{ fontSize: 10, marginTop: 4 }}>
                            <span className="muted">Kanıt: </span>
                            {req.evidence.slice(0, 3).join(", ")}
                            {req.evidence.length > 3 && ` +${req.evidence.length - 3} daha`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

