import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface Scorecard {
  imageName: string;
  overallScore: number;
  categoryScores: {
    versioning: number;
    security: number;
    compliance: number;
    operations: number;
  };
  strengths: string[];
  weaknesses: string[];
}

export interface Props {
  scorecards: Scorecard[] | null;
  error?: string;
}

export default function ScorecardPage({ scorecards, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = scorecards?.filter(scorecard =>
    scorecard.imageName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  function getScoreColor(score: number) {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  }

  return (
    <MainLayout>
      <Head>
        <title>Scorecard - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Security Scorecard</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          View security scorecards for container images
        </p>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search scorecards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
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

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && filtered.length === 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No scorecards found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((scorecard, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/images/${encodeURIComponent(scorecard.imageName)}`}>
                      <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px", marginBottom: "8px", display: "block" }}>
                        {scorecard.imageName}
                      </a>
                    </Link>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginTop: "16px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Overall Score</div>
                        <div style={{ fontSize: "32px", fontWeight: 700, color: getScoreColor(scorecard.overallScore) }}>
                          {scorecard.overallScore}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Versioning</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: getScoreColor(scorecard.categoryScores.versioning) }}>
                          {scorecard.categoryScores.versioning}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Security</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: getScoreColor(scorecard.categoryScores.security) }}>
                          {scorecard.categoryScores.security}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Compliance</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: getScoreColor(scorecard.categoryScores.compliance) }}>
                          {scorecard.categoryScores.compliance}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Operations</div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: getScoreColor(scorecard.categoryScores.operations) }}>
                          {scorecard.categoryScores.operations}
                        </div>
                      </div>
                    </div>
                    {scorecard.strengths.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Strengths</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {scorecard.strengths.map((strength, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#10B981",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "white",
                              }}
                            >
                              ✅ {strength}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {scorecard.weaknesses.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Weaknesses</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {scorecard.weaknesses.map((weakness, wIdx) => (
                            <span
                              key={wIdx}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#EF4444",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "white",
                              }}
                            >
                              ⚠️ {weakness}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
    const { fetchAllScorecards } = await import("../lib/api");
    const scorecards = await fetchAllScorecards();
    return { props: { scorecards } };
  } catch (error: any) {
    console.error("Error fetching scorecards:", error);
    return { props: { scorecards: null, error: error.message || "Failed to fetch scorecards" } };
  }
};
