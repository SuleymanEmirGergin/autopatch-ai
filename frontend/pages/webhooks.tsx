import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

export interface Props {
  webhooks: Webhook[] | null;
  error?: string;
}

export default function WebhooksPage({ webhooks, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = webhooks?.filter(webhook =>
    webhook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webhook.url.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Webhooks - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Webhooks</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Configure webhooks to receive real-time notifications
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
            + Create Webhook
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search webhooks..."
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
            No webhooks found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((webhook) => (
              <div
                key={webhook.id}
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
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{webhook.name}</h3>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: webhook.enabled ? "#10B981" : "#6B7280",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {webhook.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "8px", wordBreak: "break-all" }}>
                      {webhook.url}
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Success</div>
                        <div style={{ color: "#10B981", fontSize: "14px", fontWeight: 600 }}>{webhook.successCount}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Failures</div>
                        <div style={{ color: "#EF4444", fontSize: "14px", fontWeight: 600 }}>{webhook.failureCount}</div>
                      </div>
                      {webhook.lastTriggered && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Triggered</div>
                          <div style={{ color: "#CBD5E0", fontSize: "12px" }}>{new Date(webhook.lastTriggered).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    {webhook.events.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Events</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {webhook.events.map((event, idx) => (
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
                              {event}
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
                      Test
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
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:5000"}/api/webhooks`, {
      headers: process.env.BACKEND_ADMIN_API_KEY ? { "X-API-Key": process.env.BACKEND_ADMIN_API_KEY } : {},
    });
    if (!res.ok) throw new Error("Failed to fetch webhooks");
    const webhooksData = await res.json();
    const webhooks = webhooksData.map((w: any) => ({
      id: w._id || w.id,
      name: w.name,
      url: w.url,
      events: w.events || [],
      enabled: w.enabled !== false,
      lastTriggered: w.lastTriggeredAt,
      successCount: w.successCount || 0,
      failureCount: w.failureCount || 0,
    }));
    return { props: { webhooks } };
  } catch (error: any) {
    console.error("Error fetching webhooks:", error);
    return { props: { webhooks: null, error: error.message || "Failed to fetch webhooks" } };
  }
};
