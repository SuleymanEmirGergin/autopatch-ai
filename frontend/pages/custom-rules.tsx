import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface CustomRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  riskScore: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface Props {
  rules: CustomRule[] | null;
  error?: string;
}

export default function CustomRulesPage({ rules, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = rules?.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Custom Rules - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Custom Rules</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Define custom risk rules for your container images
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
            + Create Rule
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search rules..."
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
            No custom rules found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((rule) => (
              <div
                key={rule.id}
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
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{rule.name}</h3>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: rule.enabled ? "#10B981" : "#6B7280",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "12px" }}>{rule.description}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Condition</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px", fontFamily: "monospace" }}>{rule.condition}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Risk Score</div>
                        <div style={{ color: "#EF4444", fontSize: "14px", fontWeight: 600 }}>+{rule.riskScore}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Triggered</div>
                        <div style={{ color: "#CBD5E0", fontSize: "14px" }}>{rule.triggerCount} times</div>
                      </div>
                      {rule.lastTriggered && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Triggered</div>
                          <div style={{ color: "#CBD5E0", fontSize: "12px" }}>{new Date(rule.lastTriggered).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{
                        backgroundColor: rule.enabled ? "#6B7280" : "#10B981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {rule.enabled ? "Disable" : "Enable"}
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
    const { fetchCustomRules } = await import("../lib/api");
    const rulesData = await fetchCustomRules(true);
    const rules = rulesData.map((r: any) => ({
      id: r._id,
      name: r.name,
      description: r.description,
      condition: JSON.stringify(r.conditions),
      riskScore: r.riskScoreAdjustment,
      enabled: r.enabled,
      createdAt: r.createdAt,
      lastTriggered: r.lastTriggeredAt,
      triggerCount: r.triggerCount || 0,
    }));
    return { props: { rules } };
  } catch (error: any) {
    console.error("Error fetching custom rules:", error);
    return { props: { rules: null, error: error.message || "Failed to fetch custom rules" } };
  }
};
