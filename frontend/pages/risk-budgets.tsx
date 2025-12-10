import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface RiskBudget {
  id: string;
  name: string;
  description: string;
  maxRiskScore: number;
  currentRiskScore: number;
  scope: string[];
  status: "within" | "exceeded" | "warning";
  lastChecked?: string;
}

export interface Props {
  budgets: RiskBudget[] | null;
  error?: string;
}

function statusColor(status: string) {
  const colors: { [key: string]: string } = {
    within: "#10B981",
    warning: "#F59E0B",
    exceeded: "#EF4444",
  };
  return colors[status] || "#6B7280";
}

export default function RiskBudgetsPage({ budgets, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = budgets?.filter(budget =>
    budget.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Risk Budgets - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Risk Budgets</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Monitor and enforce risk score limits across your infrastructure
            </p>
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
          >
            + Create Budget
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search budgets..."
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
            No risk budgets found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((budget) => {
              const percentage = (budget.currentRiskScore / budget.maxRiskScore) * 100;
              return (
                <div
                  key={budget.id}
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{budget.name}</h3>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: statusColor(budget.status),
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {budget.status}
                        </span>
                      </div>
                      <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "12px" }}>{budget.description}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Current Risk</div>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>{budget.currentRiskScore}</div>
                        </div>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Max Risk</div>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>{budget.maxRiskScore}</div>
                        </div>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Usage</div>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>{percentage.toFixed(1)}%</div>
                        </div>
                        {budget.lastChecked && (
                          <div>
                            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Checked</div>
                            <div style={{ fontSize: "13px", color: "#CBD5E0" }}>{new Date(budget.lastChecked).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                      {budget.scope.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Scope</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {budget.scope.map((item, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: "#0F172A",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  color: "#CBD5E0",
                                }}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
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
                        Check
                      </button>
                      <button
                        style={{
                          backgroundColor: "#374151",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Risk Score Progress</span>
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                        {budget.currentRiskScore} / {budget.maxRiskScore}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#0F172A",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          height: "100%",
                          backgroundColor: statusColor(budget.status),
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { fetchRiskBudgets } = await import("../lib/api");
    const budgetsData = await fetchRiskBudgets();
    const budgets = budgetsData.map((b: any) => ({
      id: b._id,
      name: b.name,
      description: b.description,
      maxRiskScore: b.maxRiskScore,
      currentRiskScore: b.currentRiskScore || 0,
      scope: b.scope || [],
      status: b.status || "within",
      lastChecked: b.lastCheckedAt,
    }));
    return { props: { budgets } };
  } catch (error: any) {
    console.error("Error fetching risk budgets:", error);
    return { props: { budgets: null, error: error.message || "Failed to fetch risk budgets" } };
  }
};
