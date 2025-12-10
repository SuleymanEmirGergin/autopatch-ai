import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface AutoActionPolicy {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  enabled: boolean;
  lastExecuted?: string;
  executionCount: number;
}

export interface Props {
  policies: AutoActionPolicy[] | null;
  error?: string;
}

export default function AutoActionsPage({ policies, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = policies?.filter(policy =>
    policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Auto Actions - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Auto Actions</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Automated actions based on risk scores and conditions
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
            + Create Policy
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search policies..."
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
            No auto action policies found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((policy) => (
              <div
                key={policy.id}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{policy.name}</h3>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: policy.enabled ? "#10B981" : "#6B7280",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {policy.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "8px" }}>{policy.description}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Condition</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{policy.condition}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Action</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{policy.action}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Executions</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{policy.executionCount}</div>
                      </div>
                      {policy.lastExecuted && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Executed</div>
                          <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(policy.lastExecuted).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
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
                      Execute
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
    const { fetchAutoActionPolicies } = await import("../lib/api");
    const policiesData = await fetchAutoActionPolicies();
    const policies = policiesData.map((p: any) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      condition: `${p.riskLevel || "ANY"} risk >= ${p.minRiskScore || 0}`,
      action: p.actionType,
      enabled: p.enabled !== false,
      lastExecuted: p.lastExecutedAt,
      executionCount: p.executionCount || 0,
    }));
    return { props: { policies } };
  } catch (error: any) {
    console.error("Error fetching auto actions:", error);
    return { props: { policies: null, error: error.message || "Failed to fetch auto actions" } };
  }
};
