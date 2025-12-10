import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  user: string;
  timestamp: string;
  details: any;
  success: boolean;
}

export interface Props {
  logs: AuditLog[] | null;
  error?: string;
}

export default function AuditLogsPage({ logs, error }: Props) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = logs?.filter(log => {
    if (filter !== "all" && log.action !== filter) return false;
    if (searchQuery && !log.user.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.resourceType.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <MainLayout>
      <Head>
        <title>Audit Logs - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Audit Logs</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          View all system actions and changes
        </p>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="execute">Execute</option>
          </select>
          <input
            type="text"
            placeholder="Search logs..."
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

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && filtered.length === 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No audit logs found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #334155" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Timestamp</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>User</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Action</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Resource</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? "1px solid #334155" : "none",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0F172A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "#CBD5E0", fontSize: "13px" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#CBD5E0", fontSize: "13px" }}>{log.user}</td>
                      <td style={{ padding: "12px 16px", color: "#CBD5E0", fontSize: "13px" }}>{log.action}</td>
                      <td style={{ padding: "12px 16px", color: "#CBD5E0", fontSize: "13px" }}>
                        {log.resourceType} / {log.resourceId}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: log.success ? "#10B981" : "#EF4444",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {log.success ? "Success" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { fetchAuditLogs } = await import("../lib/api");
    const logsData = await fetchAuditLogs({ page: 1, limit: 100 });
    const logs = logsData.logs.map((l: any) => ({
      id: l._id,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      user: l.user || "system",
      timestamp: l.timestamp || l.createdAt,
      details: l.details || {},
      success: l.success !== false,
    }));
    return { props: { logs } };
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return { props: { logs: null, error: error.message || "Failed to fetch audit logs" } };
  }
};
