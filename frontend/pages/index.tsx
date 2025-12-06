import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GetServerSideProps } from "next";
import { fetchImages, fetchTopImages, fetchStats, fetchScanStatus, fetchStatsTrends, fetchClusters, checkAllRiskBudgets, fetchUnresolvedAnomalies, fetchReportHistoryStatistics, ImageRisk, Stats, ScanStatus, StatsTrendPoint, ClusterInfo, RiskBudgetStatus, Anomaly, ReportHistoryStatistics } from "../lib/api";
import { wsClient, ScanCompleteEvent, NewRiskDetectedEvent, ScanStatusEvent, NotificationEvent } from "../lib/websocket";
import { ThemeToggle } from "../components/ThemeToggle";

export interface Props {
  images: ImageRisk[] | null;
  topImages: ImageRisk[] | null;
  stats: Stats | null;
  scanStatus: ScanStatus | null;
  trends: StatsTrendPoint[] | null;
  error?: string;
}

type RiskFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const TOP_N =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_TOP_N
    ? Number(process.env.NEXT_PUBLIC_TOP_N)
    : 3;

const REFRESH_SECONDS =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_REFRESH_SECONDS
    ? Number(process.env.NEXT_PUBLIC_REFRESH_SECONDS)
    : 30;

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export function countProdPods(img: ImageRisk) {
  let prod = 0;
  let nonProd = 0;

  img.pods.forEach((p) => {
    const ns = p.namespace.toLowerCase();
    if (ns === "prod" || ns.startsWith("prod-")) {
      prod += 1;
    } else {
      nonProd += 1;
    }
  });

  return { prod, nonProd };
}

function cardClass(level: string) {
  const base = "card";
  switch (level) {
    case "LOW":
      return `${base} card-low`;
    case "MEDIUM":
      return `${base} card-medium`;
    case "HIGH":
      return `${base} card-high`;
    case "CRITICAL":
      return `${base} card-critical`;
    default:
      return base;
  }
}

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

export default function Home({ images, topImages, stats, scanStatus, trends, error }: Props) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [namespaceFilter, setNamespaceFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ImageRisk[] | null>(images);
  const [top, setTop] = useState<ImageRisk[] | null>(topImages);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [minRiskScore, setMinRiskScore] = useState<number | null>(null);
  const [maxRiskScore, setMaxRiskScore] = useState<number | null>(null);
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: any }>>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [currentScanStatus, setCurrentScanStatus] = useState<ScanStatusEvent | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [trendData, setTrendData] = useState<StatsTrendPoint[] | null>(trends);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [riskBudgetStatuses, setRiskBudgetStatuses] = useState<RiskBudgetStatus[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    setData(images);
    setTop(topImages);
    setTrendData(trends);
  }, [images, topImages]);

  // WebSocket bağlantısı
  useEffect(() => {
    wsClient.connect();

    wsClient.onConnected(() => {
      setWsConnected(true);
    });

    wsClient.onScanComplete((event: ScanCompleteEvent) => {
      setNotifications((prev) => [
        {
          message: `Scan tamamlandı! ${event.imagesScanned} image tarandı, ${event.highOrCriticalCount} HIGH/CRITICAL risk tespit edildi.`,
          type: "success",
          timestamp: event.completedAt,
        },
        ...prev.slice(0, 4), // Son 5 bildirimi tut
      ]);
      // Veriyi yenile
      fetchImages().then((latest) => {
        const sorted = [...latest].sort((a, b) => b.riskScore - a.riskScore);
        setData(sorted);
      });
      fetchTopImages(TOP_N, false).then(setTop);
      fetchStats().then((s) => {
        // Stats güncellemesi için state'e eklenebilir
      });
    });

    wsClient.onNewRisk((event: NewRiskDetectedEvent) => {
      setNotifications((prev) => [
        {
          message: `Yeni risk tespit edildi: ${event.image.imageName} (${event.image.riskLevel})`,
          type: "warning",
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 4),
      ]);
    });

    wsClient.onScanStatus((event: ScanStatusEvent) => {
      setCurrentScanStatus(event);
    });

    wsClient.onNotification((event: NotificationEvent) => {
      setNotifications((prev) => [event, ...prev.slice(0, 4)]);
    });

    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Otomatik yenileme (30 sn)
  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(async () => {
      try {
        setIsRefreshing(true);
        const [imagesRes, topRes] = await Promise.all([
          fetch("/api/images"),
          fetch(`/api/top-images?limit=${TOP_N}`),
        ]);

        if (imagesRes.ok) {
          const latest: ImageRisk[] = await imagesRes.json();
          const sorted = [...latest].sort(
            (a, b) => b.riskScore - a.riskScore
          );
          setData(sorted);
        }

        if (topRes.ok) {
          const latestTop: ImageRisk[] = await topRes.json();
          setTop(latestTop);
        }
      } finally {
        setIsRefreshing(false);
      }
    }, REFRESH_SECONDS * 1000);

    return () => clearInterval(id);
  }, [autoRefresh]);

  const current = data ?? [];

  const namespaces = useMemo(() => {
    const set = new Set<string>();
    current.forEach((img) =>
      img.pods.forEach((p) => set.add(p.namespace))
    );
    return Array.from(set).sort();
  }, [current]);

  const filtered = useMemo(() => {
    return current
      .filter((img) =>
        riskFilter === "ALL" ? true : img.riskLevel === riskFilter
      )
      .filter((img) => {
        if (namespaceFilter === "ALL") return true;
        return img.pods.some(
          (p) => p.namespace === namespaceFilter
        );
      })
      .filter((img) => {
        if (!search.trim()) return true;
        const q = search.trim();
        if (useRegex) {
          try {
            const regex = new RegExp(q, "i");
            return regex.test(img.imageName);
          } catch {
            // Geçersiz regex, normal arama yap
            return img.imageName.toLowerCase().includes(q.toLowerCase());
          }
        }
        return img.imageName.toLowerCase().includes(q.toLowerCase());
      })
      .filter((img) => {
        if (minRiskScore !== null && img.riskScore < minRiskScore) return false;
        if (maxRiskScore !== null && img.riskScore > maxRiskScore) return false;
        return true;
      });
  }, [current, riskFilter, namespaceFilter, search]);

  // Search suggestions için image name'leri hazırla
  useEffect(() => {
    if (search.trim().length >= 2) {
      const matches = current
        .map((img) => img.imageName)
        .filter((name) =>
          name.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 5);
      setSearchSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [search, current]);

  // Rapor istatistiklerini yükle
  useEffect(() => {
    fetchReportHistoryStatistics()
      .then(setReportStats)
      .catch((err) => {
        console.error("Rapor istatistikleri yüklenemedi:", err);
      });
  }, []);

  const topN = top ?? [];

  return (
    <div className="layout">
      <Head>
        <title>AutoPatch AI - Images</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div className="header-title">AutoPatch AI – Scanner Dashboard</div>
            {scanStatus && scanStatus.status && (
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                Son scan:{" "}
                <span
                  style={{
                    color:
                      scanStatus.status === "COMPLETED"
                        ? "#10b981"
                        : scanStatus.status === "FAILED"
                        ? "#f87171"
                        : "#fbbf24",
                  }}
                >
                  {scanStatus.status === "COMPLETED"
                    ? "Başarılı"
                    : scanStatus.status === "FAILED"
                    ? "Başarısız"
                    : "Çalışıyor"}
                </span>
                {scanStatus.finishedAt && (
                  <>
                    {" "}
                    (
                    {(() => {
                      const finished = new Date(scanStatus.finishedAt);
                      const now = new Date();
                      const diffMs = now.getTime() - finished.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      if (diffMins < 1) return "az önce";
                      if (diffMins < 60) return `${diffMins} dakika önce`;
                      const diffHours = Math.floor(diffMins / 60);
                      if (diffHours < 24) return `${diffHours} saat önce`;
                      const diffDays = Math.floor(diffHours / 24);
                      return `${diffDays} gün önce`;
                    })()}
                    )
                  </>
                )}
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="role-badge">
            <span
              className={`role-badge-dot ${IS_READONLY ? "readonly" : ""}`}
            />
            <span style={{ fontWeight: 500 }}>
              Rol: {IS_READONLY ? "Read-only" : "Admin"}
            </span>
          </div>
          {!IS_READONLY && (
            <>
              <Link href="/admin/allowlist">
                <button className="button button-secondary">
                  Allowlist Yönetimi
                </button>
              </Link>
              <Link href="/admin/custom-rules">
                <button className="button button-secondary">
                  Özel Risk Kuralları
                </button>
              </Link>
              <Link href="/admin/tokens">
                <button className="button button-secondary">
                  API Tokenları
                </button>
              </Link>
              <Link href="/admin/audit-logs">
                <button className="button button-secondary">
                  Audit Loglar
                </button>
              </Link>
              <Link href="/admin/risk-budgets">
                <button className="button button-secondary">
                  Risk Budget
                </button>
              </Link>
              <Link href="/admin/anomalies">
                <button className="button button-secondary">
                  Anomaliler
                </button>
              </Link>
              <Link href="/admin/notifications">
                <button className="button button-secondary">
                  Bildirimler
                </button>
              </Link>
              <Link href="/admin/webhooks">
                <button className="button button-secondary">
                  Webhooks
                </button>
              </Link>
              <Link href="/admin/settings">
                <button className="button button-secondary">
                  Ayarlar
                </button>
              </Link>
              <Link href="/admin/widgets">
                <button className="button button-secondary">
                  Widget'lar
                </button>
              </Link>
              <Link href="/admin/compliance">
                <button className="button button-secondary">
                  Compliance
                </button>
              </Link>
              <Link href="/admin/reports">
                <button className="button button-secondary">
                  Raporlar
                </button>
              </Link>
              <Link href="/admin/report-history">
                <button className="button button-secondary">
                  Rapor Geçmişi
                </button>
              </Link>
              <Link href="/admin/report-comparison">
                <button className="button button-secondary">
                  Rapor Karşılaştır
                </button>
              </Link>
              <Link href="/admin/scheduled-reports">
                <button className="button button-secondary">
                  Scheduled Reports
                </button>
              </Link>
              <Link href="/admin/report-templates">
                <button className="button button-secondary">
                  Rapor Şablonları
                </button>
              </Link>
              <Link href="/admin/ai-dashboard">
                <button className="button" style={{ backgroundColor: "#8b5cf6", color: "white" }}>
                  🤖 AI Dashboard
                </button>
              </Link>
              <Link href="/admin/recommendations">
                <button className="button button-secondary">
                  Risk Önerileri
                </button>
              </Link>
              <Link href="/admin/remediation-scripts">
                <button className="button button-secondary">
                  Remediation Script'leri
                </button>
              </Link>
              <Link href="/admin/auto-actions">
                <button className="button button-secondary">
                  Otomatik Aksiyonlar
                </button>
              </Link>
              <Link href="/admin/bulk-operations">
                <button className="button button-secondary">
                  Bulk Operations
                </button>
              </Link>
            </>
          )}
          <Link href="/compare">
            <button className="button button-secondary">
              Image Karşılaştır
            </button>
          </Link>
          <Link href="/repositories">
            <button className="button button-secondary">
              Repositories
            </button>
          </Link>
          <Link href="/dependency-graph">
            <button className="button button-secondary">
              Bağımlılık Grafiği
            </button>
          </Link>
          <Link href="/reports/prod">
            <button className="button button-secondary">
              Prod Risk Raporu
            </button>
          </Link>
          <Link href="/compliance">
            <button className="button button-secondary">
              Compliance Raporları
            </button>
          </Link>
          <button
            className="button button-secondary"
            onClick={() => {
              const fileName = `autopatch-images-${new Date()
                .toISOString()
                .slice(0, 10)}.json`;
              const blob = new Blob(
                [
                  JSON.stringify(
                    filtered.map((img) => {
                      const { prod, nonProd } = countProdPods(img);
                      return {
                        imageName: img.imageName,
                        riskScore: img.riskScore,
                        riskLevel: img.riskLevel,
                        lastScannedAt: img.lastScannedAt,
                        podsCount: img.pods.length,
                        prodPodsCount: prod,
                        nonProdPodsCount: nonProd,
                        riskFactors: img.riskFactors,
                      };
                    }),
                    null,
                    2
                  ),
                ],
                { type: "application/json" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              const rows = [
                [
                  "imageName",
                  "riskScore",
                  "riskLevel",
                  "lastScannedAt",
                  "podsCount",
                  "prodPodsCount",
                  "nonProdPodsCount",
                  "riskFactors",
                ],
                ...filtered.map((img) => {
                  const { prod, nonProd } = countProdPods(img);
                  const rf = img.riskFactors.join(" | ");
                  const escape = (v: string | number) =>
                    `"${String(v).replace(/"/g, '""')}"`;
                  return [
                    escape(img.imageName),
                    img.riskScore,
                    img.riskLevel,
                    escape(new Date(img.lastScannedAt).toISOString()),
                    img.pods.length,
                    prod,
                    nonProd,
                    escape(rf),
                  ];
                }),
              ]
                .map((row) => row.join(","))
                .join("\n");

              const fileName = `autopatch-images-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              const blob = new Blob([rows], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              const params = new URLSearchParams();
              if (riskFilter !== "ALL") {
                params.set("riskLevel", riskFilter);
              }
              if (namespaceFilter !== "ALL") {
                params.set("namespace", namespaceFilter);
              }
              window.location.href = `/api/images/export/pdf?${params.toString()}`;
            }}
          >
            Export PDF
          </button>
          {!IS_READONLY && (
            <button
              className="button button-secondary"
              onClick={async () => {
                try {
                  await fetch("/api/scan", { method: "POST" });
                  alert("Scan tetiklendi. Birkaç saniye sonra sayfayı yenileyin.");
                } catch {
                  alert("Scan tetiklenemedi.");
                }
              }}
            >
              Scan Çalıştır
            </button>
          )}
        </div>
      </header>

      <main className="container" id="main-content">
        {/* WebSocket Bağlantı Durumu */}
        {wsConnected && (
          <div
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              backgroundColor: "#10b981",
              color: "white",
              padding: "8px 12px",
              borderRadius: 4,
              fontSize: 12,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>●</span> Real-time bağlantı aktif
          </div>
        )}

        {/* Bildirimler */}
        {notifications.length > 0 && (
          <div
            style={{
              position: "fixed",
              top: wsConnected ? 56 : 16,
              right: 16,
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 400,
            }}
          >
            {notifications.slice(0, 3).map((notif, idx) => (
              <div
                key={idx}
                className={`notification notification-${notif.type}`}
                style={{
                  backgroundColor:
                    notif.type === "success"
                      ? "#10b981"
                      : notif.type === "warning"
                      ? "#f59e0b"
                      : notif.type === "error"
                      ? "#ef4444"
                      : "#3b82f6",
                  color: "white",
                  padding: "12px 16px",
                  borderRadius: 4,
                  fontSize: 13,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                  animation: "slideIn 0.3s ease-out",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setNotifications((prev) => prev.filter((_, i) => i !== idx));
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  {notif.type === "success"
                    ? "✅"
                    : notif.type === "warning"
                    ? "⚠️"
                    : notif.type === "error"
                    ? "❌"
                    : "ℹ️"}{" "}
                  {notif.message}
                </div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {stats && (
          <div
            style={{
              padding: 12,
              backgroundColor: "#1f2937",
              borderRadius: 4,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                fontSize: 13,
              }}
            >
              <div>
                <span className="muted">Toplam Image:</span>{" "}
                <strong>{stats.totalImages}</strong>
              </div>
              <div>
                <span className="muted">HIGH/CRITICAL:</span>{" "}
                <strong style={{ color: "#f87171" }}>
                  {stats.highOrCritical}
                </strong>
              </div>
              <div>
                <span className="muted">Prod Pod Etkisi:</span>{" "}
                <strong style={{ color: "#fbbf24" }}>
                  {stats.prodImpactedPods}
                </strong>
              </div>
              {stats.lastScanAt && (
                <div>
                  <span className="muted">Son Scan:</span>{" "}
                  <strong>
                    {new Date(stats.lastScanAt).toLocaleString("tr-TR")}
                  </strong>
                </div>
              )}
            </div>

            {/* Rapor İstatistikleri Widget */}
            {reportStats && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📊 Rapor İstatistikleri</div>
                  <Link href="/admin/report-history">
                    <a style={{ fontSize: 11, color: "#3b82f6" }}>Tümünü Gör →</a>
                  </Link>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                  <div>
                    <span className="muted">Toplam Rapor:</span>{" "}
                    <strong style={{ color: "#3b82f6" }}>{reportStats.totalReports}</strong>
                  </div>
                  {Object.entries(reportStats.reportsByType).slice(0, 4).map(([type, count]) => (
                    <div key={type}>
                      <span className="muted">{type.replace(/_/g, " ")}:</span>{" "}
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                {reportStats.recentReports.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
                    Son rapor: {new Date(reportStats.recentReports[0].createdAt).toLocaleString("tr-TR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Risk Budget Widget */}
            {riskBudgetStatuses.length > 0 && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Risk Budget Durumu</div>
                  <Link href="/admin/risk-budgets">
                    <a style={{ fontSize: 11, color: "#3b82f6" }}>Yönet →</a>
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {riskBudgetStatuses.slice(0, 2).map((status) => {
                    const budget = status.budget;
                    const isExceeded = status.isExceeded;
                    const utilization = status.utilization;

                    return (
                      <div
                        key={budget._id}
                        style={{
                          padding: 6,
                          backgroundColor: isExceeded ? "#1f1f1f" : "#111827",
                          borderRadius: 4,
                          borderLeft: `3px solid ${isExceeded ? "#ef4444" : "#10b981"}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 500 }}>{budget.name}</div>
                          <span
                            className={`badge ${isExceeded ? "badge-critical" : "badge-low"}`}
                            style={{ fontSize: 9 }}
                          >
                            {isExceeded ? "AŞILDI" : "OK"}
                          </span>
                        </div>
                        {budget.maxCritical !== null && (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                              <span className="muted">CRITICAL:</span>
                              <span>
                                {budget.currentCritical} / {budget.maxCritical}
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: 4,
                                backgroundColor: "#1f2937",
                                borderRadius: 2,
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Anomalies Widget */}
            {anomalies.length > 0 && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Son Anomaliler</div>
                  <Link href="/admin/anomalies">
                    <a style={{ fontSize: 11, color: "#3b82f6" }}>Tümünü Gör →</a>
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {anomalies.slice(0, 3).map((anomaly) => (
                    <div
                      key={anomaly._id}
                      style={{
                        padding: 6,
                        backgroundColor: "#111827",
                        borderRadius: 4,
                        borderLeft: `3px solid ${
                          anomaly.severity === "CRITICAL"
                            ? "#ef4444"
                            : anomaly.severity === "HIGH"
                            ? "#f87171"
                            : anomaly.severity === "MEDIUM"
                            ? "#fbbf24"
                            : "#10b981"
                        }`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>
                            <Link href={`/images/${encodeURIComponent(anomaly.imageName)}`}>
                              <a style={{ color: "#3b82f6", textDecoration: "none" }}>
                                {anomaly.imageName.length > 40
                                  ? `${anomaly.imageName.substring(0, 40)}...`
                                  : anomaly.imageName}
                              </a>
                            </Link>
                          </div>
                          <div className="muted" style={{ fontSize: 10 }}>
                            {anomaly.description.length > 60
                              ? `${anomaly.description.substring(0, 60)}...`
                              : anomaly.description}
                          </div>
                        </div>
                        <span
                          className={`badge badge-${anomaly.severity.toLowerCase()}`}
                          style={{ fontSize: 9 }}
                        >
                          {anomaly.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trendData && trendData.length > 1 && (
              <div>
                <div
                  className="muted"
                  style={{ fontSize: 11, marginBottom: 4 }}
                >
                  Trendler (son {trendData.length} scan)
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                  }}
                >
                  {/* Basit sparkline benzeri çubuk grafikleri */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div
                      className="muted"
                      style={{ fontSize: 11, marginBottom: 4 }}
                    >
                      Ortalama Risk Skoru
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2,
                        height: 60,
                      }}
                    >
                      {trendData.map((p, idx) => {
                        const h = Math.max(
                          4,
                          Math.min(56, (p.avgRiskScore / 100) * 56)
                        );
                        return (
                          <div
                            key={idx}
                            title={`${p.avgRiskScore.toFixed(1)}`}
                            style={{
                              width: 6,
                              height: h,
                              borderRadius: 3,
                              background:
                                p.avgRiskScore >= 70
                                  ? "#ef4444"
                                  : p.avgRiskScore >= 40
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div
                      className="muted"
                      style={{ fontSize: 11, marginBottom: 4 }}
                    >
                      HIGH/CRITICAL Image Sayısı
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2,
                        height: 60,
                      }}
                    >
                      {(() => {
                        const max = Math.max(
                          ...trendData.map((p) => p.highOrCritical || 0),
                          1
                        );
                        return trendData.map((p, idx) => {
                          const h = Math.max(
                            4,
                            Math.min(56, (p.highOrCritical / max) * 56)
                          );
                          return (
                            <div
                              key={idx}
                              title={`${p.highOrCritical}`}
                              style={{
                                width: 6,
                                height: h,
                                borderRadius: 3,
                                background: "#f97316",
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!images && !error && <p>Yükleniyor...</p>}

        {images && images.length === 0 && (
          <p>Henüz kayıtlı image yok. Önce bir scan çalıştırın.</p>
        )}

        {current.length > 0 && (
          <>
            <div className="toolbar">
              <div className="toolbar-group" style={{ position: "relative" }}>
                <input
                  className="input"
                  placeholder="Image adına göre filtrele..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 4,
                      marginTop: 4,
                      zIndex: 1000,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          borderBottom: "1px solid #374151",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearch(suggestion);
                          setShowSuggestions(false);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#374151";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="toolbar-group">
                <span className="muted">Risk:</span>
                {(["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskFilter[]).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      className="button button-secondary"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        opacity: riskFilter === lvl ? 1 : 0.6,
                        borderColor:
                          riskFilter === lvl ? "#4b5563" : "#374151",
                      }}
                      onClick={() => setRiskFilter(lvl)}
                    >
                      {lvl === "ALL" ? "Hepsi" : lvl}
                    </button>
                  )
                )}
              </div>
              <div className="toolbar-group">
                <span className="muted">Namespace:</span>
                <select
                  className="select"
                  value={namespaceFilter}
                  onChange={(e) => setNamespaceFilter(e.target.value)}
                >
                  <option value="ALL">Tümü</option>
                  {namespaces.map((ns) => (
                    <option key={ns} value={ns}>
                      {ns}
                    </option>
                  ))}
                </select>
              </div>
              {clusters.length > 1 && (
                <div className="toolbar-group">
                  <span className="muted">Cluster:</span>
                  <select
                    className="select"
                    value={selectedClusterId}
                    onChange={(e) => setSelectedClusterId(e.target.value)}
                  >
                    <option value="ALL">Tüm Cluster'lar</option>
                    {clusters.map((c) => (
                      <option key={c.clusterId} value={c.clusterId}>
                        {c.name} ({c.clusterId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
                  <div className="toolbar-group">
                    <label className="pill-toggle">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                      />
                      Otomatik yenile ({REFRESH_SECONDS} sn)
                      {isRefreshing && (
                        <span className="muted">• Yenileniyor...</span>
                      )}
                    </label>
                  </div>
                  <div className="toolbar-group">
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                      {showAdvancedFilters ? "Gelişmiş Filtreleri Gizle" : "Gelişmiş Filtreler"}
                    </button>
                  </div>
                </div>

                {showAdvancedFilters && (
                  <div
                    style={{
                      backgroundColor: "#1f2937",
                      borderRadius: 4,
                      padding: 12,
                      marginBottom: 16,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <label className="muted" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                        Min Risk Skoru
                      </label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        style={{ width: 80 }}
                        value={minRiskScore ?? ""}
                        onChange={(e) =>
                          setMinRiskScore(e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="muted" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                        Max Risk Skoru
                      </label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        style={{ width: 80 }}
                        value={maxRiskScore ?? ""}
                        onChange={(e) =>
                          setMaxRiskScore(e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder="100"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                        onClick={() => {
                          setMinRiskScore(null);
                          setMaxRiskScore(null);
                          setSearch("");
                          setUseRegex(false);
                        }}
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  </div>
                )}

            <div className="muted" style={{ marginBottom: 12 }}>
              Toplam {filtered.length} image, en riskli {topN.length} aşağıda
              (backend /images/top ile hesaplanıyor).
            </div>

            {topN.length > 0 && (
              <>
                <h3
                  className="muted"
                  style={{ marginTop: 0, marginBottom: 8, fontSize: 13 }}
                >
                  En riskli imajlar
                </h3>
                <div className="grid" style={{ marginBottom: 24 }}>
                  {topN.map((img) => (
                    <Link
                      key={img._id}
                      href={`/images/${encodeURIComponent(img.imageName)}`}
                    >
                      <div className={cardClass(img.riskLevel)}>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Image
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {img.imageName}
                        </div>
                        {(() => {
                          const { prod, nonProd } = countProdPods(img);
                          if (prod === 0) return null;
                          return (
                            <div style={{ marginTop: 4 }}>
                              <span className="prod-pill">
                                Prod pods: {prod}
                                {nonProd > 0 ? ` • Diğer: ${nonProd}` : ""}
                              </span>
                            </div>
                          );
                        })()}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 8,
                          }}
                        >
                          <div>
                            <div className="muted">Risk Score</div>
                            <div className="risk-score">
                              {img.riskScore}
                            </div>
                          </div>
                          <span className={riskBadgeClass(img.riskLevel)}>
                            {img.riskLevel}
                          </span>
                        </div>
                        <div className="muted" style={{ marginTop: 8 }}>
                          Pods: {img.pods.length} • Son tarama:{" "}
                          {new Date(img.lastScannedAt).toLocaleString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {filtered.length > 0 && (
          <div className="grid">
            {filtered.map((img) => (
              <Link
                key={img._id}
                href={`/images/${encodeURIComponent(img.imageName)}`}
              >
                <div className={cardClass(img.riskLevel)}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Image
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {img.imageName}
                  </div>
                  {(() => {
                    const { prod, nonProd } = countProdPods(img);
                    if (prod === 0) return null;
                    return (
                      <div style={{ marginTop: 4 }}>
                        <span className="prod-pill">
                          Prod pods: {prod}
                          {nonProd > 0 ? ` • Diğer: ${nonProd}` : ""}
                        </span>
                      </div>
                    );
                  })()}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <div>
                      <div className="muted">Risk Score</div>
                      <div className="risk-score">{img.riskScore}</div>
                    </div>
                    <span className={riskBadgeClass(img.riskLevel)}>
                      {img.riskLevel}
                    </span>
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    Pods: {img.pods.length} • Son tarama:{" "}
                    {new Date(img.lastScannedAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const clusterId = ctx.query.clusterId as string | undefined;
    const projectId = ctx.query.projectId as string | undefined;
    
    const [images, topImages, stats, scanStatus, trends] = await Promise.all([
      fetchImages(clusterId, projectId),
      fetchTopImages(TOP_N, false, clusterId, projectId),
      fetchStats(clusterId, projectId).catch(() => null), // Stats optional, don't fail if unavailable
      fetchScanStatus().catch(() => null), // Scan status optional
      fetchStatsTrends(20).catch(() => null), // Trends optional
    ]);

    const sorted = [...images].sort((a, b) => b.riskScore - a.riskScore);

    return { props: { images: sorted, topImages, stats, scanStatus, trends } };
  } catch (e) {
    return {
      props: {
        images: null,
        topImages: null,
        stats: null,
        scanStatus: null,
        trends: null,
        error: "Backend'e bağlanılamadı. Scanner Service çalışıyor mu?",
      },
    };
  }
};


