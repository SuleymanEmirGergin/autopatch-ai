import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  recipients: string[];
}

export interface Props {
  scheduledReports: ScheduledReport[] | null;
  error?: string;
}

export default function ScheduledReportsPage({ scheduledReports, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = scheduledReports?.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Scheduled Reports - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Scheduled Reports</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Automatically generated reports on a schedule
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
            + Create Schedule
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search scheduled reports..."
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
            No scheduled reports found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((report) => (
              <div
                key={report.id}
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
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{report.name}</h3>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: report.enabled ? "#10B981" : "#6B7280",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {report.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Report Type</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{report.reportType}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Schedule</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{report.schedule}</div>
                      </div>
                      {report.lastRun && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Run</div>
                          <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(report.lastRun).toLocaleString()}</div>
                        </div>
                      )}
                      {report.nextRun && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Next Run</div>
                          <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(report.nextRun).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    {report.recipients.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Recipients</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {report.recipients.map((email, idx) => (
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
                              {email}
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
                      Run Now
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
    const { fetchScheduledReports } = await import("../lib/api");
    const scheduledReports = await fetchScheduledReports();
    return { props: { scheduledReports } };
  } catch (error: any) {
    console.error("Error fetching scheduled reports:", error);
    return { props: { scheduledReports: null, error: error.message || "Failed to fetch scheduled reports" } };
  }
};
