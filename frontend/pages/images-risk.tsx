import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import { fetchImages, ImageRisk } from "../lib/api";
import Link from "next/link";

export interface Props {
  images: ImageRisk[] | null;
  error?: string;
}

export default function ImagesRiskPage({ images, error }: Props) {
  const [riskFilter, setRiskFilter] = useState("All Risk Levels");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredImages = images?.filter(img => {
    if (riskFilter !== "All Risk Levels" && img.riskLevel !== riskFilter.toUpperCase()) return false;
    if (searchQuery && !img.imageName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const riskDistribution = {
    Critical: images?.filter(i => i.riskLevel === "CRITICAL").length || 0,
    High: images?.filter(i => i.riskLevel === "HIGH").length || 0,
    Medium: images?.filter(i => i.riskLevel === "MEDIUM").length || 0,
    Low: images?.filter(i => i.riskLevel === "LOW").length || 0,
  };

  const maxCount = Math.max(...Object.values(riskDistribution));

  return (
    <MainLayout>
      <Head>
        <title>Images & Risk - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Images & Risk</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor container images and their security risk levels
        </p>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
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
            <option>All Risk Levels</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              maxWidth: "400px",
              backgroundColor: "#2D3748",
              border: "1px solid #374151",
              borderRadius: "6px",
              padding: "8px 12px 8px 36px",
              color: "white",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        {/* Images by Risk Level Chart */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Images by Risk Level</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "200px" }}>
            {Object.entries(riskDistribution).map(([level, count]) => (
              <div key={level} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${(count / maxCount) * 100}%`,
                    backgroundColor:
                      level === "Critical"
                        ? "#DC2626"
                        : level === "High"
                        ? "#EA580C"
                        : level === "Medium"
                        ? "#D97706"
                        : "#059669",
                    borderRadius: "4px 4px 0 0",
                    minHeight: "20px",
                  }}
                />
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{level}</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* All Images Table */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
            All Images ({filteredImages.length})
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>IMAGE</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>TAG</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>CLUSTER / NAMESPACE</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>RISK LEVEL</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>RISK SCORE</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>LAST SCAN</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredImages.slice(0, 10).map((img, idx) => {
                  const parts = img.imageName.split(":");
                  const imageName = parts[0];
                  const tag = parts[1] || "latest";
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "12px 8px", fontSize: "13px" }}>
                        <Link href={`/images/${encodeURIComponent(img.imageName)}`} style={{ color: "#60A5FA", textDecoration: "none" }}>
                          {imageName}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{tag}</td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>
                        {img.pods[0]?.clusterId || "N/A"} / {img.pods[0]?.namespace || "N/A"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const images = await fetchImages().catch(() => null);
    return {
      props: {
        images: images || null,
      },
    };
  } catch (e) {
    return {
      props: {
        images: null,
        error: "Backend'e bağlanılamadı",
      },
    };
  }
};
