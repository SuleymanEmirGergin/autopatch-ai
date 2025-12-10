import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import MainLayout from "../../components/MainLayout";
import {
  fetchImage,
  fetchImageHistory,
  fetchImageBreakdown,
  fetchImageTags,
  ImageRisk,
  RiskBreakdownItem,
  ImageTagsResponse,
} from "../../lib/api";
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
  tags: ImageTagsResponse | null;
  error?: string;
}

type TabType = "overview" | "history" | "tags" | "breakdown";

function riskBadgeClass(level: string) {
  const colors: { [key: string]: string } = {
    LOW: "#10B981",
    MEDIUM: "#F59E0B",
    HIGH: "#EF4444",
    CRITICAL: "#DC2626",
  };
  return colors[level] || "#6B7280";
}

export default function ImageDetailPage({ image, history, breakdown, tags, error }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  if (error || !image) {
    return (
      <MainLayout>
        <Head>
          <title>Image Not Found - AutoPatch AI</title>
        </Head>
        <div style={{ color: "white", textAlign: "center", padding: "40px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>Image Not Found</h1>
          <p style={{ color: "#9CA3AF", marginBottom: "24px" }}>{error || "The requested image could not be found."}</p>
          <Link href="/images-risk">
            <button
              style={{
                backgroundColor: "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Back to Images
            </button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: "📊" },
    { id: "history" as TabType, label: "History", icon: "📈" },
    { id: "tags" as TabType, label: "Tags", icon: "🏷️" },
    { id: "breakdown" as TabType, label: "Risk Breakdown", icon: "🔍" },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{image.imageName} - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>{image.imageName}</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Last scanned: {new Date(image.lastScannedAt).toLocaleString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: riskBadgeClass(image.riskLevel),
                color: "white",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              {image.riskLevel}
            </div>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: "#1E293B",
                border: "1px solid #334155",
                color: "white",
                fontWeight: 600,
                fontSize: "18px",
              }}
            >
              {image.riskScore}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #334155" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                backgroundColor: activeTab === tab.id ? "#2563EB" : "transparent",
                color: activeTab === tab.id ? "white" : "#CBD5E0",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #60A5FA" : "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              <span style={{ marginRight: "8px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: "24px" }}>
            {/* Basic Info */}
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Basic Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Image Name</div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{image.imageName}</div>
                </div>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Risk Score</div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{image.riskScore}</div>
                </div>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Risk Level</div>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: riskBadgeClass(image.riskLevel),
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {image.riskLevel}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Pods</div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{image.pods.length}</div>
                </div>
              </div>
            </div>

            {/* Pods */}
            {image.pods.length > 0 && (
              <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Pods ({image.pods.length})</h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {image.pods.map((pod, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        backgroundColor: "#0F172A",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>{pod.name}</div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{pod.namespace}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {image.riskFactors.length > 0 && (
              <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Risk Factors</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {image.riskFactors.map((factor, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#0F172A",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#CBD5E0",
                      }}
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Scan History</h3>
            {history.length > 0 ? (
              <>
                <div style={{ height: "300px", marginBottom: "24px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...history].reverse().map((h) => ({
                      date: new Date(h.at).toLocaleDateString(),
                      score: h.riskScore,
                      level: h.riskLevel,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#9CA3AF" domain={[0, 100]} style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          color: "white",
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {history.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        backgroundColor: "#0F172A",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>
                          {new Date(h.at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: 600 }}>{h.riskScore}</div>
                        <div
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: riskBadgeClass(h.riskLevel),
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {h.riskLevel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "#9CA3AF" }}>No scan history available.</p>
            )}
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === "tags" && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
              Image Tags {tags && `(${tags.tags.length})`}
            </h3>
            {tags && tags.tags.length > 0 ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {tags.tags.map((tag, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      backgroundColor: "#0F172A",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>{tag.tag}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "4px" }}>
                        {tag.pods.length} pods • Last scanned: {new Date(tag.lastScannedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>{tag.riskScore}</div>
                      <div
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: riskBadgeClass(tag.riskLevel),
                          color: "white",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {tag.riskLevel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9CA3AF" }}>No tags available for this image.</p>
            )}
          </div>
        )}

        {/* Breakdown Tab */}
        {activeTab === "breakdown" && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Risk Breakdown</h3>
            {breakdown.length > 0 ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px",
                      backgroundColor: "#0F172A",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>{item.factor}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{item.description}</div>
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#DC2626",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      +{item.score}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#2563EB",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "white" }}>Total Risk Score</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>
                    {breakdown.reduce((sum, item) => sum + item.score, 0)}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#9CA3AF" }}>No risk breakdown available.</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const imageNameParam = ctx.params?.imageName;
  if (!imageNameParam || typeof imageNameParam !== "string") {
    return { props: { image: null, history: [], breakdown: [], tags: null, error: "Invalid image name" } };
  }

  const decoded = decodeURIComponent(imageNameParam);

  try {
    const [image, history, breakdown, tags] = await Promise.all([
      fetchImage(decoded),
      fetchImageHistory(decoded, 20).catch(() => []),
      fetchImageBreakdown(decoded).catch(() => []),
      fetchImageTags(decoded).catch(() => null),
    ]);
    return { props: { image, history, breakdown, tags } };
  } catch (e: any) {
    return {
      props: {
        image: null,
        history: [],
        breakdown: [],
        tags: null,
        error: e.message || "Failed to fetch image details",
      },
    };
  }
};
