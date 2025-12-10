import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface ComparisonResult {
  image1: string;
  image2: string;
  differences: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }[];
  similarityScore: number;
}

export interface Props {
  comparison: ComparisonResult | null;
  error?: string;
}

export default function ImageComparisonPage({ comparison, error }: Props) {
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");

  return (
    <MainLayout>
      <Head>
        <title>Image Comparison - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Image Comparison</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Compare two container images to identify differences
        </p>

        {/* Comparison Form */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Image 1</label>
              <input
                type="text"
                value={image1}
                onChange={(e) => setImage1(e.target.value)}
                placeholder="e.g., nginx:latest"
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Image 2</label>
              <input
                type="text"
                value={image2}
                onChange={(e) => setImage2(e.target.value)}
                placeholder="e.g., nginx:1.21"
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <button
            style={{
              backgroundColor: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
            disabled={!image1 || !image2}
          >
            Compare Images
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {comparison && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Comparison Results</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Image 1</div>
                  <div style={{ color: "#CBD5E0", fontSize: "14px" }}>{comparison.image1}</div>
                </div>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Image 2</div>
                  <div style={{ color: "#CBD5E0", fontSize: "14px" }}>{comparison.image2}</div>
                </div>
                <div>
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Similarity</div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>{(comparison.similarityScore * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {comparison.differences.length > 0 && (
              <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Differences ({comparison.differences.length})</h3>
                <div style={{ display: "grid", gap: "12px" }}>
                  {comparison.differences.map((diff, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        backgroundColor: "#0F172A",
                        borderRadius: "6px",
                        borderLeft: `4px solid ${
                          diff.severity === "critical" ? "#DC2626" :
                          diff.severity === "high" ? "#EF4444" :
                          diff.severity === "medium" ? "#F59E0B" : "#10B981"
                        }`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>{diff.type}</div>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: diff.severity === "critical" ? "#DC2626" : diff.severity === "high" ? "#EF4444" : diff.severity === "medium" ? "#F59E0B" : "#10B981",
                            color: "white",
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {diff.severity}
                        </span>
                      </div>
                      <div style={{ color: "#9CA3AF", fontSize: "13px" }}>{diff.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  // Image comparison sayfası kullanıcı input bekliyor, initial data yok
  return { props: { comparison: null } };
};
