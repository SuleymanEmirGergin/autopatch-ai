import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface Recommendation {
  id: string;
  imageName: string;
  riskFactor: string;
  recommendation: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedImpact: string;
  steps: string[];
}

export interface Props {
  recommendations: Recommendation[] | null;
  error?: string;
}

function priorityColor(priority: string) {
  const colors: { [key: string]: string } = {
    critical: "#DC2626",
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#10B981",
  };
  return colors[priority] || "#6B7280";
}

export default function RecommendationsPage({ recommendations, error }: Props) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = recommendations?.filter(rec => {
    if (priorityFilter !== "all" && rec.priority !== priorityFilter) return false;
    if (searchQuery && !rec.imageName.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !rec.riskFactor.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const stats = {
    total: recommendations?.length || 0,
    critical: recommendations?.filter(r => r.priority === "critical").length || 0,
    high: recommendations?.filter(r => r.priority === "high").length || 0,
    medium: recommendations?.filter(r => r.priority === "medium").length || 0,
    low: recommendations?.filter(r => r.priority === "low").length || 0,
  };

  return (
    <MainLayout>
      <Head>
        <title>Recommendations - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Recommendations</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          AI-powered risk reduction recommendations for your container images
        </p>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Total</div>
            <div style={{ fontSize: "24px", fontWeight: 600 }}>{stats.total}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Critical</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#DC2626" }}>{stats.critical}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>High</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{stats.high}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Medium</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#F59E0B" }}>{stats.medium}</div>
          </div>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Low</div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "#10B981" }}>{stats.low}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="text"
            placeholder="Search recommendations..."
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

        {/* Recommendations List */}
        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && filtered.length === 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No recommendations found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((rec) => (
              <div
                key={rec.id}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                  borderLeft: `4px solid ${priorityColor(rec.priority)}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Link href={`/images/${encodeURIComponent(rec.imageName)}`}>
                        <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px" }}>
                          {rec.imageName}
                        </a>
                      </Link>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: priorityColor(rec.priority),
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "8px" }}>
                      <strong>Risk Factor:</strong> {rec.riskFactor}
                    </div>
                    <div style={{ color: "#CBD5E0", fontSize: "14px" }}>{rec.recommendation}</div>
                  </div>
                </div>
                {rec.steps.length > 0 && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px", fontWeight: 600 }}>Steps:</div>
                    <ol style={{ margin: 0, paddingLeft: "20px", color: "#CBD5E0", fontSize: "13px" }}>
                      {rec.steps.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {rec.estimatedImpact && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155", color: "#9CA3AF", fontSize: "12px" }}>
                    <strong>Estimated Impact:</strong> {rec.estimatedImpact}
                  </div>
                )}
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
    const { fetchPriorityRecommendations } = await import("../lib/api");
    const recommendationsData = await fetchPriorityRecommendations({ limit: 50 });
    const recommendations = recommendationsData.recommendations.map((r: any) => ({
      id: r.id || r._id,
      imageName: r.imageName,
      riskFactor: r.riskFactor,
      recommendation: r.recommendation || r.description,
      priority: (r.priority || r.type || "medium").toLowerCase(),
      estimatedImpact: r.impact || "Medium",
      steps: r.steps || [],
    }));
    return { props: { recommendations } };
  } catch (error: any) {
    console.error("Error fetching recommendations:", error);
    return { props: { recommendations: null, error: error.message || "Failed to fetch recommendations" } };
  }
};
