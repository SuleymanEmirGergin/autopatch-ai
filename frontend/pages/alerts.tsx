import Head from "next/head";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState("All Severities");
  const [clusterFilter, setClusterFilter] = useState("All Clusters");
  const [timeFilter, setTimeFilter] = useState("Last 24 hours");
  const [searchQuery, setSearchQuery] = useState("");

  const alerts = [
    { severity: "Critical", message: "Root user detected in prod-eu-cluster-01", cluster: "autopatch/api-service:1.4.3", createdAt: "2025-12-10 14:25", status: "Open" },
    { severity: "High", message: "payments-service:legacy running in Production", cluster: "prod-us-cluster-02 payments-service:legacy", createdAt: "2025-12-10 14:13", status: "Open" },
    { severity: "High", message: "Deprecated base image in use", cluster: "prod-eu-cluster-01 auth/oauth-proxy:2.1.0", createdAt: "2025-12-10 14:07", status: "Acknowledged" },
    { severity: "Medium", message: "7 images not scanned in last 24 hours", cluster: "Multiple clusters various", createdAt: "2025-12-10 13:25", status: "Open" },
    { severity: "Critical", message: "Unpatched CVE-2024-12345 in production", cluster: "prod-ap-cluster-03 database/postgres:14.2", createdAt: "2025-12-10 12:45", status: "Open" },
    { severity: "High", message: "Excessive container privileges detected", cluster: "prod-us-cluster-02 worker/batch-processor:2.1", createdAt: "2025-12-10 11:20", status: "Acknowledged" },
    { severity: "Medium", message: 'Image tag uses "latest" in production', cluster: "prod-eu-cluster-01 cache/redis:latest", createdAt: "2025-12-10 10:15", status: "Closed" },
    { severity: "Low", message: "Scan completed successfully", cluster: "staging-cluster-01 frontend/web-app:3.2.1", createdAt: "2025-12-10 09:30", status: "Closed" },
  ];

  const channels = [
    { name: "Email", icon: "✉️", description: "Send alerts to security@company.com", enabled: true },
    { name: "Webhook", icon: "🔗", description: "POST to custom webhook endpoint", enabled: false },
    { name: "Slack", icon: "💬", description: "Send to #security-alerts channel", enabled: true },
    { name: "Teams", icon: "💬", description: "Send to Security Team channel", enabled: false },
  ];

  return (
    <MainLayout>
      <Head>
        <title>Alerts & Notifications - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Alerts & Notifications</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor and manage security alerts across all clusters
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          {/* Alerts List */}
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
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
                <option>All Severities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value)}
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
                <option>All Clusters</option>
              </select>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
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
                <option>Last 24 hours</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: "200px",
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

            {/* Alerts Table */}
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>All Alerts ({alerts.length})</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>SEVERITY</th>
                      <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>MESSAGE</th>
                      <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>CLUSTER / IMAGE</th>
                      <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>CREATED AT</th>
                      <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor:
                                  alert.severity === "Critical"
                                    ? "#DC2626"
                                    : alert.severity === "High"
                                    ? "#EA580C"
                                    : alert.severity === "Medium"
                                    ? "#D97706"
                                    : "#059669",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "12px",
                              }}
                            >
                              {alert.severity === "Critical" ? "✕" : alert.severity === "High" ? "!" : alert.severity === "Medium" ? "!" : "✓"}
                            </div>
                            <span style={{ fontSize: "13px" }}>{alert.severity}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", fontSize: "13px" }}>{alert.message}</td>
                        <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{alert.cluster}</td>
                        <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{alert.createdAt}</td>
                        <td style={{ padding: "12px 8px" }}>
                          <button
                            style={{
                              padding: "4px 12px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 500,
                              border: "none",
                              cursor: "pointer",
                              backgroundColor:
                                alert.status === "Open"
                                  ? "#2563eb"
                                  : alert.status === "Acknowledged"
                                  ? "#8B5CF6"
                                  : "#6B7280",
                              color: "white",
                            }}
                          >
                            {alert.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", height: "fit-content" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Notification Channels</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {channels.map((channel, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    backgroundColor: "#0F172A",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <span style={{ fontSize: "20px" }}>{channel.icon}</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>{channel.name}</div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{channel.description}</div>
                    </div>
                  </div>
                  <label
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: "44px",
                      height: "24px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={() => {}}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: channel.enabled ? "#2563eb" : "#6B7280",
                        borderRadius: "24px",
                        transition: "0.3s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: channel.enabled ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.3s",
                        }}
                      />
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
              Active channels: {channels.filter(c => c.enabled).length} of {channels.length} enabled
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
