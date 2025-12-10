import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface Anomaly {
  id: string;
  imageName: string;
  anomalyType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface Props {
  anomalies: Anomaly[] | null;
  error?: string;
}

function severityColor(severity: string) {
  const colors: { [key: string]: string } = {
    critical: "#DC2626",
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#10B981",
  };
  return colors[severity] || "#6B7280";
}

export default function AnomaliesPage({ anomalies, error }: Props) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = anomalies?.filter(anomaly => {
    if (filter === "resolved" && !anomaly.resolved) return false;
    if (filter === "unresolved" && anomaly.resolved) return false;
    if (searchQuery && !anomaly.imageName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !anomaly.anomalyType.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const stats = {
    total: anomalies?.length || 0,
    unresolved: anomalies?.filter(a => !a.resolved).length || 0,
    critical: anomalies?.filter(a => a.severity === "critical" && !a.resolved).length || 0,
    high: anomalies?.filter(a => a.severity === "high" && !a.resolved).length || 0,
  };

  return (
    <MainLayout>
      <Head>
        <title>Anomalies - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Anomalies</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          AI-detected anomalies in container images and workloads
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Total</div>
            <div style={{ fontSize: "24px", fontWeight: 600 }}>{stats.total}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Unresolved</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{stats.unresolved}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Critical</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#DC2626" }}>{stats.critical}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>High</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{stats.high}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              backgroundColor: "#2D3748",
              border: "1px solid #374151",
              borderRadius: "6px",
              padding: "8px 32px 8px 12px",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Anomalies</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
          <input
            type="text"
            placeholder="Search anomalies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              maxWidth: "400px",
              backgroundColor: "#2D3748",
              border: "1px solid #374151",
              borderRadius: "6px",
              padding: "8px 12px",
              color: "white",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && filtered.length === 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No anomalies found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((anomaly) => (
              <div
                key={anomaly.id}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                  borderLeft: `4px solid ${severityColor(anomaly.severity)}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Link href={`/images/${encodeURIComponent(anomaly.imageName)}`}>
                        <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px" }}>
                          {anomaly.imageName}
                        </a>
                      </Link>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: severityColor(anomaly.severity),
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {anomaly.severity}
                      </span>
                      {anomaly.resolved && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#10B981",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          Resolved
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "4px" }}>
                      <strong>Type:</strong> {anomaly.anomalyType}
                    </div>
                    <div style={{ color: "#CBD5E0", fontSize: "14px", marginBottom: "8px" }}>{anomaly.description}</div>
                    <div style={{ color: "#9CA3AF", fontSize: "12px" }}>
                      Detected: {new Date(anomaly.detectedAt).toLocaleString()}
                      {anomaly.resolvedAt && ` • Resolved: ${new Date(anomaly.resolvedAt).toLocaleString()}`}
                    </div>
                  </div>
                  {!anomaly.resolved && (
                    <button
                      style={{
                        backgroundColor: "#2563EB",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { fetchUnresolvedAnomalies } = await import("../lib/api");
    const anomalies = await fetchUnresolvedAnomalies();
    // Backend'den gelen formatı frontend formatına dönüştür
    const formattedAnomalies = anomalies.map((a: any) => ({
      id: a._id,
      imageName: a.imageName,
      anomalyType: a.anomalyType,
      severity: a.severity.toLowerCase(),
      description: a.description,
      detectedAt: a.detectedAt,
      resolved: !!a.resolvedAt,
      resolvedAt: a.resolvedAt,
    }));
    return { props: { anomalies: formattedAnomalies } };
  } catch (error: any) {
    console.error("Error fetching anomalies:", error);
    return { props: { anomalies: null, error: error.message || "Failed to fetch anomalies" } };
  }
};
