import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import {
  fetchImage,
  fetchImageHistory,
  fetchImageBreakdown,
  fetchImageRemediation,
  fetchImageScorecard,
  createJiraTicket,
  fetchRunbookMappings,
  fetchSBOM,
  rescanSBOM,
  predictRisk,
  detectAIAnomaly,
  getIntelligentRecommendations,
  getImageHealthScore,
  forecastRisk,
  getSecurityPosture,
  ImageRisk,
  RiskBreakdownItem,
  RemediationRecommendation,
  SecurityScorecard,
  SBOM,
  PackageInfo,
  RiskPredictionResponse,
  AIAnomalyResponse,
  IntelligentRecommendationsResponse,
  ImageHealthScore,
  RiskForecast,
  SecurityPosture,
} from "../../lib/api";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  image: ImageRisk | null;
  history: { at: string; riskScore: number; riskLevel: string }[];
  breakdown: RiskBreakdownItem[];
  remediation: RemediationRecommendation[];
  scorecard: SecurityScorecard | null;
  error?: string;
}

type TabType = "overview" | "sbom" | "ai";

function riskBadgeClass(level: string) {
  switch (level) {
    case "LOW":
      return "badge badge-low";
    case "MEDIUM":
      return "badge badge-medium";
    case "HIGH":
      return "badge badge-high";
    case "CRITICAL":
      return "badge badge-critical";
    default:
      return "badge";
  }
}

function countProdPods(image: ImageRisk) {
  let prod = 0;
  let nonProd = 0;

  image.pods.forEach((p) => {
    const ns = p.namespace.toLowerCase();
    if (ns === "prod" || ns.startsWith("prod-")) {
      prod += 1;
    } else {
      nonProd += 1;
    }
  });

  return { prod, nonProd };
}

export default function ImageDetail({
  image,
  history,
  breakdown,
  remediation,
  scorecard,
  error,
}: Props) {
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraResult, setJiraResult] = useState<{ success: boolean; ticketUrl?: string; error?: string } | null>(null);
  const [runbookMappings, setRunbookMappings] = useState<Map<string, string>>(new Map());
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sbom, setSbom] = useState<SBOM | null>(null);
  const [sbomLoading, setSbomLoading] = useState(false);
  const [sbomError, setSbomError] = useState<string | null>(null);

  useEffect(() => {
    fetchRunbookMappings()
      .then((mappings) => {
        const map = new Map<string, string>();
        mappings.forEach((m) => {
          map.set(m.riskFactor, m.url);
        });
        setRunbookMappings(map);
      })
      .catch(() => {
        // Runbook mapping'ler yüklenemezse sessizce devam et
      });
  }, []);

  // SBOM'u yükle
  useEffect(() => {
    if (image && activeTab === "sbom") {
      setSbomLoading(true);
      setSbomError(null);
      fetchSBOM(image.imageName, image.clusterId)
        .then(setSbom)
        .catch((err) => {
          setSbomError(err.message || "SBOM yüklenemedi");
        })
        .finally(() => {
          setSbomLoading(false);
        });
    }
  }, [image, activeTab]);

  // AI Analysis yükle
  useEffect(() => {
    if (image && activeTab === "ai") {
      setAiLoading(true);
      Promise.all([
        predictRisk(image.imageName, image.clusterId).catch(() => null),
        detectAIAnomaly(image.imageName, image.clusterId).catch(() => null),
        getIntelligentRecommendations(image.imageName, image.clusterId).catch(() => null),
        getImageHealthScore(image.imageName, image.clusterId).catch(() => null),
        forecastRisk(image.imageName, 30, image.clusterId).catch(() => null),
        getSecurityPosture(image.imageName, image.clusterId).catch(() => null),
      ]).then(([prediction, anomaly, recommendations, health, forecast, posture]) => {
        if (prediction) setRiskPrediction(prediction);
        if (anomaly) setAnomalyDetection(anomaly);
        if (recommendations) setIntelligentRecommendations(recommendations);
        if (health) setHealthScore(health.healthScore);
        if (forecast) setRiskForecast(forecast.forecast);
        if (posture) setSecurityPosture(posture.posture);
      }).finally(() => {
        setAiLoading(false);
      });
    }
  }, [image, activeTab]);

  const handleRescanSBOM = async () => {
    if (!image) return;
    setSbomLoading(true);
    setSbomError(null);
    try {
      const newSbom = await rescanSBOM(image.imageName, image.clusterId);
      setSbom(newSbom);
    } catch (err: any) {
      setSbomError(err.message || "SBOM yeniden taranamadı");
    } finally {
      setSbomLoading(false);
    }
  };

  const handleCreateJiraTicket = async () => {
    if (!image) return;

    setJiraLoading(true);
    setJiraResult(null);

    try {
      const result = await createJiraTicket({
        imageName: image.imageName,
        riskScore: image.riskScore,
        riskLevel: image.riskLevel,
        riskFactors: image.riskFactors,
        pods: image.pods,
      });

      setJiraResult(result);
    } catch (err: any) {
      setJiraResult({
        success: false,
        error: err.message || "Jira ticket oluşturulamadı",
      });
    } finally {
      setJiraLoading(false);
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>
          {image ? image.imageName : "Image not found"} - AutoPatch AI
        </title>
      </Head>

      <header className="header">
        <div className="header-title">Image Detayı</div>
        <div style={{ display: "flex", gap: 8 }}>
          {image && (image.riskLevel === "HIGH" || image.riskLevel === "CRITICAL") && (
            <button
              className="button"
              onClick={handleCreateJiraTicket}
              disabled={jiraLoading}
              style={{
                backgroundColor: jiraLoading ? "#6b7280" : "#2563eb",
              }}
            >
              {jiraLoading ? "Oluşturuluyor..." : "Jira Ticket Oluştur"}
            </button>
          )}
          <Link href="/">
            <button className="button button-secondary">Geri dön</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {jiraResult && (
          <div
            style={{
              padding: 12,
              backgroundColor: jiraResult.success ? "#10b981" : "#ef4444",
              color: "white",
              borderRadius: 4,
              marginBottom: 16,
            }}
          >
            {jiraResult.success ? (
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  ✅ Jira ticket başarıyla oluşturuldu!
                </div>
                {jiraResult.ticketUrl && (
                  <a
                    href={jiraResult.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "white", textDecoration: "underline" }}
                  >
                    Ticket'ı görüntüle →
                  </a>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  ❌ Hata: {jiraResult.error || "Bilinmeyen hata"}
                </div>
              </div>
            )}
          </div>
        )}

        {!image && !error && <p>Image bulunamadı.</p>}

        {image && activeTab === "overview" && (
          <div className="card">
            <div className="muted" style={{ fontSize: 12 }}>
              Image
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              {image.imageName}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <div className="muted">Risk Score</div>
                <div className="risk-score">{image.riskScore}</div>
              </div>
              <span className={riskBadgeClass(image.riskLevel)}>
                {image.riskLevel}
              </span>
            </div>

            <div className="muted">
              Son tarama: {new Date(image.lastScannedAt).toLocaleString()}
            </div>

            <h3 style={{ marginTop: 16, marginBottom: 4, fontSize: 14 }}>
              Pods
            </h3>
            {image.pods.length > 0 && (() => {
              const { prod, nonProd } = countProdPods(image);
              if (prod === 0) return null;
              return (
                <div style={{ marginBottom: 6 }}>
                  <span className="prod-pill">
                    Prod pods: {prod}
                    {nonProd > 0 ? ` • Diğer: ${nonProd}` : ""}
                  </span>
                </div>
              );
            })()}
            {image.pods.length === 0 && (
              <p className="muted">Bu image şu an hiçbir pod tarafından kullanılmıyor.</p>
            )}
            {image.pods.length > 0 && (
              <ul className="list">
                {image.pods.map((p, idx) => (
                  <li key={idx}>
                    <span className="muted">{p.namespace}</span> / {p.name}
                  </li>
                ))}
              </ul>
            )}

            <h3 style={{ marginTop: 16, marginBottom: 4, fontSize: 14 }}>
              Risk Faktörleri
            </h3>
            {image.riskFactors.length === 0 && (
              <p className="muted">Bu image için tanımlanmış risk faktörü yok.</p>
            )}
            {image.riskFactors.length > 0 && (
              <div className="chips">
                {image.riskFactors.map((f, idx) => {
                  const runbookUrl = runbookMappings.get(f);
                  return (
                    <span className="chip" key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {f}
                      {runbookUrl && (
                        <a
                          href={runbookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                          title="Runbook'u aç"
                        >
                          📖
                        </a>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {breakdown.length > 0 && (
              <>
                <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>
                  Risk Skoru Detayı
                </h3>
                <div
                  style={{
                    backgroundColor: "#1f2937",
                    borderRadius: 4,
                    padding: 12,
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Toplam Risk Skoru:{" "}
                    </span>
                    <strong style={{ fontSize: 16 }}>
                      {breakdown.reduce((sum, item) => sum + item.score, 0)}
                    </strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {breakdown.map((item, idx) => {
                      const runbookUrl = runbookMappings.get(item.factor);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 8px",
                            backgroundColor: "#111827",
                            borderRadius: 4,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                              {item.factor}
                              {runbookUrl && (
                                <a
                                  href={runbookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    color: "#3b82f6",
                                    textDecoration: "none",
                                    fontSize: 11,
                                    fontWeight: 500,
                                  }}
                                  title="Runbook'u aç"
                                >
                                  📖 Runbook
                                </a>
                              )}
                            </div>
                            <div className="muted" style={{ fontSize: 11 }}>
                              {item.description}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: "bold",
                              color: "#f87171",
                              marginLeft: 12,
                            }}
                          >
                            +{item.score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {history.length > 0 && (
              <>
                <h3
                  style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}
                >
                  Risk Skor Trendi
                </h3>
                <div style={{ width: "100%", height: 200, marginBottom: 16 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={[...history]
                        .reverse()
                        .map((h) => ({
                          date: new Date(h.at).toLocaleDateString("tr-TR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          score: h.riskScore,
                          level: h.riskLevel,
                        }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        style={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        domain={[0, 100]}
                        style={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: 4,
                        }}
                        labelStyle={{ color: "#d1d5db" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <h3
                  style={{ marginTop: 16, marginBottom: 4, fontSize: 14 }}
                >
                  Son taramalar
                </h3>
                <ul className="list">
                  {history.map((h, idx) => (
                    <li key={idx}>
                      <span className="muted">
                        {new Date(h.at).toLocaleString()}
                      </span>{" "}
                      – Skor: {h.riskScore} ({h.riskLevel})
                    </li>
                  ))}
                </ul>
              </>
            )}

            {scorecard && (
              <>
                <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>
                  Güvenlik Skor Kartı
                </h3>
                <div
                  style={{
                    backgroundColor: "#1f2937",
                    borderRadius: 4,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Genel Skor
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: "bold",
                          color:
                            scorecard.overallScore >= 80
                              ? "#10b981"
                              : scorecard.overallScore >= 60
                              ? "#fbbf24"
                              : "#f87171",
                        }}
                      >
                        {scorecard.overallScore}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          Versiyonlama
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {scorecard.categoryScores.versioning}
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          Güvenlik
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {scorecard.categoryScores.security}
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          Compliance
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {scorecard.categoryScores.compliance}
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          Operasyonlar
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {scorecard.categoryScores.operations}
                        </div>
                      </div>
                    </div>
                  </div>

                  {scorecard.strengths.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Güçlü Yönler:
                      </div>
                      <div className="chips">
                        {scorecard.strengths.map((s, idx) => (
                          <span key={idx} className="chip" style={{ backgroundColor: "#10b981" }}>
                            ✅ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {scorecard.weaknesses.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Zayıf Yönler:
                      </div>
                      <div className="chips">
                        {scorecard.weaknesses.map((w, idx) => (
                          <span key={idx} className="chip" style={{ backgroundColor: "#f87171" }}>
                            ⚠️ {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {remediation.length > 0 && (
              <>
                <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>
                  Risk Azaltma Önerileri
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {remediation.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "#1f2937",
                        borderRadius: 4,
                        padding: 12,
                        borderLeft: `4px solid ${
                          rec.severity === "critical"
                            ? "#ef4444"
                            : rec.severity === "high"
                            ? "#f87171"
                            : rec.severity === "medium"
                            ? "#fbbf24"
                            : "#10b981"
                        }`,
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
                            {rec.riskFactor}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {rec.recommendation}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor:
                              rec.severity === "critical"
                                ? "#ef4444"
                                : rec.severity === "high"
                                ? "#f87171"
                                : rec.severity === "medium"
                                ? "#fbbf24"
                                : "#10b981",
                            color: "white",
                            textTransform: "uppercase",
                          }}
                        >
                          {rec.severity}
                        </span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                          Adımlar:
                        </div>
                        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                          {rec.steps.map((step, stepIdx) => (
                            <li key={stepIdx} style={{ marginBottom: 4 }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                      {rec.resources && rec.resources.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                            Kaynaklar:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {rec.resources.map((resource, resIdx) => (
                              <a
                                key={resIdx}
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "#3b82f6" }}
                              >
                                {resource}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* SBOM Tab */}
        {image && activeTab === "sbom" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: 16 }}>SBOM & CVE Analizi</h3>
              <button
                className="button button-secondary"
                onClick={handleRescanSBOM}
                disabled={sbomLoading}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                {sbomLoading ? "Taranıyor..." : "Yeniden Tara"}
              </button>
            </div>

            {sbomLoading && <p>SBOM yükleniyor...</p>}
            {sbomError && (
              <p style={{ color: "#f87171", marginBottom: 16 }}>{sbomError}</p>
            )}

            {sbom && (
              <>
                {/* SBOM Özet */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>SBOM Özet</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Toplam Paket</div>
                      <div style={{ fontSize: 18, fontWeight: "bold" }}>{sbom.totalPackages}</div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Zafiyetli Paket</div>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#f87171" }}>
                        {sbom.vulnerablePackages}
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>CRITICAL CVE</div>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#ef4444" }}>
                        {sbom.criticalVulnerabilities}
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>HIGH CVE</div>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#f87171" }}>
                        {sbom.highVulnerabilities}
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>MEDIUM CVE</div>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#fbbf24" }}>
                        {sbom.mediumVulnerabilities}
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>LOW CVE</div>
                      <div style={{ fontSize: 18, fontWeight: "bold", color: "#10b981" }}>
                        {sbom.lowVulnerabilities}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af" }}>
                    Son tarama: {new Date(sbom.scannedAt).toLocaleString()} • Scanner: {sbom.scanner}
                  </div>
                </div>

                {/* Paket Listesi */}
                <div className="card">
                  <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>Paketler ve CVE'ler</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sbom.packages.map((pkg, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          backgroundColor: "#111827",
                          borderRadius: 4,
                          borderLeft: pkg.vulnerabilities.length > 0 ? "4px solid #ef4444" : "4px solid #10b981",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                              {pkg.name} <span className="muted">v{pkg.version}</span>
                            </div>
                            <span
                              className="badge"
                              style={{
                                fontSize: 10,
                                backgroundColor: pkg.type === "npm" ? "#cb3837" : pkg.type === "pip" ? "#3776ab" : "#374151",
                              }}
                            >
                              {pkg.type}
                            </span>
                          </div>
                          {pkg.vulnerabilities.length > 0 && (
                            <span className="badge badge-critical" style={{ fontSize: 10 }}>
                              {pkg.vulnerabilities.length} CVE
                            </span>
                          )}
                        </div>

                        {pkg.vulnerabilities.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {pkg.vulnerabilities.map((vuln, vulnIdx) => (
                              <div
                                key={vulnIdx}
                                style={{
                                  padding: 8,
                                  backgroundColor: "#1f2937",
                                  borderRadius: 4,
                                  marginBottom: 6,
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                                      <a
                                        href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#3b82f6", textDecoration: "none" }}
                                      >
                                        {vuln.cveId}
                                      </a>
                                      <span
                                        className={`badge badge-${vuln.severity.toLowerCase()}`}
                                        style={{ marginLeft: 8, fontSize: 9 }}
                                      >
                                        {vuln.severity}
                                      </span>
                                    </div>
                                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                                      {vuln.description}
                                    </div>
                                    {vuln.fixedVersion && (
                                      <div style={{ fontSize: 11, color: "#10b981" }}>
                                        ✅ Düzeltme: v{vuln.fixedVersion}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#f87171", marginLeft: 8 }}>
                                    CVSS {vuln.score}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* AI Analysis Tab */}
        {image && activeTab === "ai" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: 16 }}>🤖 AI Analysis</h3>
            </div>

            {aiLoading && <p>AI analizi yükleniyor...</p>}

            {!aiLoading && (
              <div style={{ display: "grid", gap: 16 }}>
                {/* Risk Prediction */}
                {riskPrediction && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>🔮 Risk Prediction</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Mevcut Risk</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{riskPrediction.currentRisk.score}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{riskPrediction.currentRisk.level}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Tahmin Edilen</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{riskPrediction.prediction.predictedRiskScore}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{riskPrediction.prediction.predictedRiskLevel}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Güven</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{(riskPrediction.prediction.confidence * 100).toFixed(1)}%</div>
                        <div className="muted" style={{ fontSize: 12 }}>Trend: {riskPrediction.prediction.trend}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Anomaly Detection */}
                {anomalyDetection && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>⚠️ Anomaly Detection</h4>
                    {anomalyDetection.anomaly.isAnomaly ? (
                      <div style={{ padding: 12, backgroundColor: "#fee2e2", borderRadius: 4 }}>
                        <p><strong>Anomali Tespit Edildi!</strong></p>
                        <p>Tip: {anomalyDetection.anomaly.anomalyType}</p>
                        <p>Severity: {anomalyDetection.anomaly.severity}</p>
                        <p>Skor: {anomalyDetection.anomaly.anomalyScore.toFixed(2)}</p>
                        <p>Açıklama: {anomalyDetection.anomaly.explanation}</p>
                        <div style={{ marginTop: 8 }}>
                          <strong>Önerilen Aksiyonlar:</strong>
                          <ul>
                            {anomalyDetection.anomaly.suggestedActions.map((action, idx) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p>✅ Anomali tespit edilmedi.</p>
                    )}
                  </div>
                )}

                {/* Health Score */}
                {healthScore && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>🏥 Health Score</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Genel Skor</div>
                        <div style={{ fontSize: 32, fontWeight: "bold" }}>{healthScore.overallScore}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Trend: {healthScore.trend}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Security</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{healthScore.categoryScores.security}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Freshness</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{healthScore.categoryScores.freshness}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Compliance</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{healthScore.categoryScores.compliance}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Stability</div>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>{healthScore.categoryScores.stability}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Posture */}
                {securityPosture && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>🛡️ Security Posture</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Genel Skor</div>
                        <div style={{ fontSize: 32, fontWeight: "bold" }}>{securityPosture.overallScore}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Trend: {securityPosture.trend}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Vulnerability Mgmt</div>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{securityPosture.categoryScores.vulnerabilityManagement}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Access Control</div>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{securityPosture.categoryScores.accessControl}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Image Security</div>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{securityPosture.categoryScores.imageSecurity}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Runtime Security</div>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{securityPosture.categoryScores.runtimeSecurity}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>Compliance</div>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{securityPosture.categoryScores.compliance}</div>
                      </div>
                    </div>
                    {securityPosture.strengths.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <strong>Strengths:</strong>
                        <ul>
                          {securityPosture.strengths.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {securityPosture.weaknesses.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <strong>Weaknesses:</strong>
                        <ul>
                          {securityPosture.weaknesses.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Risk Forecast */}
                {riskForecast && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>📈 Risk Forecast</h4>
                    <p><strong>Trajectory:</strong> {riskForecast.riskTrajectory}</p>
                    {riskForecast.criticalDate && (
                      <p><strong>Kritik Tarih:</strong> {new Date(riskForecast.criticalDate).toLocaleDateString()}</p>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <strong>Forecast'ler:</strong>
                      {riskForecast.forecasts.map((forecast, idx) => (
                        <div key={idx} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 4, marginTop: 8 }}>
                          <p><strong>{new Date(forecast.date).toLocaleDateString()}:</strong> {forecast.predictedRiskScore} ({forecast.predictedRiskLevel})</p>
                          <p className="muted" style={{ fontSize: 12 }}>Güven: {(forecast.confidence * 100).toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intelligent Recommendations */}
                {intelligentRecommendations && (
                  <div className="card">
                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>💡 Intelligent Recommendations</h4>
                    <p><strong>Toplam:</strong> {intelligentRecommendations.summary.total} | <strong>Kritik:</strong> {intelligentRecommendations.summary.critical} | <strong>Yüksek:</strong> {intelligentRecommendations.summary.high}</p>
                    <div style={{ marginTop: 16 }}>
                      {intelligentRecommendations.recommendations.slice(0, 5).map((rec) => (
                        <div key={rec.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 4, marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div>
                              <strong>{rec.title}</strong>
                              <p style={{ fontSize: 12, marginTop: 4 }}>{rec.description}</p>
                              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>AI Skoru: {rec.aiScore.toFixed(2)} | Öncelik: {rec.priority} | Urgency: {rec.urgency}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const imageNameParam = ctx.params?.imageName;
  if (!imageNameParam || typeof imageNameParam !== "string") {
    return { props: { image: null, error: "Geçersiz image adı" } };
  }

  const decoded = decodeURIComponent(imageNameParam);

  try {
    const [image, history, breakdown, remediation, scorecard] = await Promise.all([
      fetchImage(decoded),
      fetchImageHistory(decoded, 10),
      fetchImageBreakdown(decoded).catch(() => []), // Breakdown optional
      fetchImageRemediation(decoded).catch(() => []), // Remediation optional
      fetchImageScorecard(decoded).catch(() => null), // Scorecard optional
    ]);
    return { props: { image, history, breakdown, remediation, scorecard } };
  } catch (e) {
    return {
      props: {
        image: null,
        history: [],
        breakdown: [],
        remediation: [],
        scorecard: null,
        error: "Backend'den image detayı alınamadı.",
      },
    };
  }
};


