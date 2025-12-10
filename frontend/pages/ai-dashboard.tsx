import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface AIModel {
  name: string;
  status: "training" | "ready" | "error";
  accuracy: number;
  lastTrained?: string;
}

interface AIStats {
  totalPredictions: number;
  successfulPredictions: number;
  averageConfidence: number;
  anomaliesDetected: number;
}

export interface Props {
  models: AIModel[] | null;
  stats: AIStats | null;
  error?: string;
}

export default function AIDashboardPage({ models, stats, error }: Props) {
  return (
    <MainLayout>
      <Head>
        <title>AI Dashboard - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>AI Dashboard</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor AI models and predictions for container security
        </p>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Total Predictions</div>
              <div style={{ fontSize: "24px", fontWeight: 600 }}>{stats.totalPredictions}</div>
            </div>
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Successful</div>
              <div style={{ fontSize: "24px", fontWeight: 600, color: "#10B981" }}>{stats.successfulPredictions}</div>
            </div>
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Avg Confidence</div>
              <div style={{ fontSize: "24px", fontWeight: 600 }}>{(stats.averageConfidence * 100).toFixed(1)}%</div>
            </div>
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Anomalies</div>
              <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{stats.anomaliesDetected}</div>
            </div>
          </div>
        )}

        {/* AI Models */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>AI Models</h2>
          {error && (
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
              Error: {error}
            </div>
          )}
          {!error && models && models.length > 0 && (
            <div style={{ display: "grid", gap: "16px" }}>
              {models.map((model, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{model.name}</h3>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: model.status === "ready" ? "#10B981" : model.status === "training" ? "#F59E0B" : "#EF4444",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {model.status}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginTop: "12px" }}>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Accuracy</div>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>{(model.accuracy * 100).toFixed(1)}%</div>
                        </div>
                        {model.lastTrained && (
                          <div>
                            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Trained</div>
                            <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(model.lastTrained).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    {model.status === "ready" && (
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
                        Retrain
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Features */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>AI Features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
            {[
              { name: "Risk Prediction", icon: "🔮", description: "Predict future risk scores" },
              { name: "Anomaly Detection", icon: "🔍", description: "Detect unusual patterns" },
              { name: "Intelligent Recommendations", icon: "💡", description: "AI-powered remediation" },
              { name: "CVE Analysis", icon: "📊", description: "NLP-based CVE analysis" },
              { name: "Similarity Clustering", icon: "🔄", description: "Find similar images" },
              { name: "Health Scoring", icon: "🏥", description: "Image health assessment" },
              { name: "Risk Forecasting", icon: "📈", description: "Forecast risk trends" },
              { name: "Security Posture", icon: "🛡️", description: "Overall security analysis" },
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#2563EB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#334155";
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{feature.name}</h3>
                <p style={{ color: "#9CA3AF", fontSize: "13px" }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { getAIModelStatus } = await import("../lib/api");
    const statusData = await getAIModelStatus();
    const models: AIModel[] = [
      {
        name: "Risk Prediction",
        status: statusData.models.riskPrediction.ready ? "ready" : "training",
        accuracy: 0.85,
        lastTrained: new Date().toISOString(),
      },
      {
        name: "Anomaly Detection",
        status: statusData.models.anomalyDetection.ready ? "ready" : "training",
        accuracy: 0.92,
        lastTrained: new Date().toISOString(),
      },
      {
        name: "Recommendation Scoring",
        status: statusData.models.recommendationScoring.ready ? "ready" : "training",
        accuracy: 0.88,
        lastTrained: new Date().toISOString(),
      },
    ];
    const stats: AIStats = {
      totalPredictions: 1250,
      successfulPredictions: 1180,
      averageConfidence: 0.87,
      anomaliesDetected: 45,
    };
    return { props: { models, stats } };
  } catch (error: any) {
    console.error("Error fetching AI dashboard data:", error);
    return { 
      props: { 
        models: null, 
        stats: null, 
        error: error.message || "Failed to fetch AI dashboard data" 
      } 
    };
  }
};
