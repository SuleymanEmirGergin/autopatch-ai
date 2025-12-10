import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import MainLayout from "../components/MainLayout";
import { fetchImages, fetchStats, fetchClusters, ImageRisk, Stats, ClusterInfo } from "../lib/api";
import Link from "next/link";

export interface Props {
  images: ImageRisk[] | null;
  stats: Stats | null;
  clusters: ClusterInfo[] | null;
  error?: string;
}

export default function OverviewPage({ images, stats, clusters, error }: Props) {
  const [overallRiskScore, setOverallRiskScore] = useState(73);
  const [riskTrend, setRiskTrend] = useState<Array<{ day: number; prod: number; staging: number }>>([]);

  useEffect(() => {
    // Risk trend data simulation
    const trend = [];
    for (let i = 1; i <= 30; i++) {
      trend.push({
        day: i,
        prod: 60 + Math.random() * 15,
        staging: 45 + Math.random() * 15,
      });
    }
    setRiskTrend(trend);
  }, []);

  const activeClusters = clusters?.length || 0;
  const highRiskClusters = clusters?.filter(c => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL").length || 0;
  const mediumRiskClusters = clusters?.filter(c => c.riskLevel === "MEDIUM").length || 0;
  const lowRiskClusters = clusters?.filter(c => c.riskLevel === "LOW").length || 0;

  const scannedImages = images?.length || 0;
  const criticalImages = images?.filter(i => i.riskLevel === "CRITICAL").length || 0;
  const highImages = images?.filter(i => i.riskLevel === "HIGH").length || 0;
  const mediumImages = images?.filter(i => i.riskLevel === "MEDIUM").length || 0;

  const topAlerts = [
    { severity: "Critical", message: "Root user detected in prod-eu-cluster-01", details: "prod-eu-cluster-01 - autopatch/api-service:1.4.3", time: "5 min ago" },
    { severity: "High", message: "payments-service:legacy running in Production", details: "prod-us-cluster-02 - payments-service:legacy", time: "12 min ago" },
    { severity: "High", message: "Deprecated base image in use", details: "prod-eu-cluster-01 - auth/oauth-proxy:2.1.0", time: "18 min ago" },
    { severity: "Medium", message: "7 images not scanned in last 24 hours", details: "Multiple clusters - Various", time: "1 hour ago" },
  ];

  const topImages = images?.slice(0, 5) || [];

  return (
    <MainLayout>
      <Head>
        <title>Overview - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Overview</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor security posture across all clusters and images
        </p>

        {/* Top Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {/* Overall Risk Score */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🛡️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Overall Risk Score</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>73 / 100</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Environment: Production (CCE)</div>
          </div>

          {/* Active Clusters */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖥️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Active Clusters</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>{activeClusters} Clusters</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
              <span style={{ color: "#F87171" }}>{highRiskClusters} High</span>{" "}
              <span style={{ color: "#FB923C" }}>{mediumRiskClusters} Medium</span>{" "}
              <span style={{ color: "#4ADE80" }}>{lowRiskClusters} Low</span>
            </div>
          </div>

          {/* Scanned Images */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖼️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Scanned Images</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>{scannedImages} Images</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
              <span style={{ color: "#F87171" }}>{criticalImages} Critical</span>{" "}
              <span style={{ color: "#FB923C" }}>{highImages} High</span>{" "}
              <span style={{ color: "#FACC15" }}>{mediumImages} Medium</span>
            </div>
          </div>

          {/* Compliance Status */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>✅</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Compliance Status</div>
            <div style={{ fontSize: "12px", marginBottom: "4px" }}>
              <span>PCI-DSS </span>
              <span style={{ color: "#FB923C" }}>At risk</span>
            </div>
            <div style={{ fontSize: "12px", marginBottom: "4px" }}>
              <span>SOC2 </span>
              <span style={{ color: "#FB923C" }}>Partial</span>
            </div>
            <div style={{ fontSize: "12px" }}>
              <span>ISO27001 </span>
              <span style={{ color: "#4ADE80" }}>Pass</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Chart and Compliance */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {/* Risk Trend Chart */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Risk Trend (last 30 days)</h3>
            <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "4px", justifyContent: "space-between" }}>
              {riskTrend.slice(0, 6).map((point, idx) => (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "150px", width: "100%" }}>
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#14B8A6",
                        height: `${(point.prod / 100) * 100}%`,
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#8B5CF6",
                        height: `${(point.staging / 100) * 100}%`,
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Day {point.day}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#14B8A6", borderRadius: "2px" }} />
                <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Prod</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#8B5CF6", borderRadius: "2px" }} />
                <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Staging</span>
              </div>
            </div>
          </div>

          {/* Compliance Overview */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Compliance Overview</h3>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px" }}>PCI-DSS</span>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>70%</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#1F2937", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: "70%", height: "100%", backgroundColor: "#4ADE80" }} />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px" }}>SOC2</span>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>55%</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#1F2937", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: "55%", height: "100%", backgroundColor: "#4ADE80" }} />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px" }}>ISO27001</span>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>85%</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#1F2937", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: "85%", height: "100%", backgroundColor: "#4ADE80" }} />
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "16px" }}>
              Top failing controls:
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
              Image hardening, root usage, access logs
            </div>
          </div>
        </div>

        {/* Bottom Row: Table and Alerts */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          {/* Active Images Table */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Active Images by Risk</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>IMAGE</th>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>CLUSTER / NAMESPACE</th>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>RISK LEVEL</th>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>RISK SCORE</th>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>LAST SCAN</th>
                    <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {topImages.map((img, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "12px 8px", fontSize: "13px" }}>
                        <Link href={`/images/${encodeURIComponent(img.imageName)}`} style={{ color: "#60A5FA", textDecoration: "none" }}>
                          {img.imageName}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>
                        {img.pods[0]?.clusterId || "N/A"} {img.pods[0]?.namespace || ""}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                            backgroundColor:
                              img.riskLevel === "CRITICAL"
                                ? "#FEE2E2"
                                : img.riskLevel === "HIGH"
                                ? "#FED7AA"
                                : img.riskLevel === "MEDIUM"
                                ? "#FEF3C7"
                                : "#D1FAE5",
                            color:
                              img.riskLevel === "CRITICAL"
                                ? "#DC2626"
                                : img.riskLevel === "HIGH"
                                ? "#EA580C"
                                : img.riskLevel === "MEDIUM"
                                ? "#D97706"
                                : "#059669",
                          }}
                        >
                          {img.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 600 }}>{img.riskScore}</td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>
                        {img.lastScanAt ? new Date(img.lastScanAt).toLocaleString() : "N/A"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <Link href={`/images/${encodeURIComponent(img.imageName)}`} style={{ color: "#60A5FA", textDecoration: "none", fontSize: "12px" }}>
                          View details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Alerts */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Top Alerts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px",
                    backgroundColor: "#0F172A",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "start" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor:
                          alert.severity === "Critical"
                            ? "#DC2626"
                            : alert.severity === "High"
                            ? "#EA580C"
                            : alert.severity === "Medium"
                            ? "#D97706"
                            : "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {alert.severity === "Critical" ? "✕" : alert.severity === "High" ? "!" : "i"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>
                        {alert.severity}: {alert.message}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>{alert.details}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280" }}>{alert.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const [images, stats, clusters] = await Promise.all([
      fetchImages().catch(() => null),
      fetchStats().catch(() => null),
      fetchClusters().catch(() => null),
    ]);

    return {
      props: {
        images: images || null,
        stats: stats || null,
        clusters: clusters || null,
      },
    };
  } catch (e) {
    return {
      props: {
        images: null,
        stats: null,
        clusters: null,
        error: "Backend'e bağlanılamadı",
      },
    };
  }
};
