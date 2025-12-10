import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface Report {
  id: string;
  type: "risk-summary" | "executive-summary" | "compliance" | "detailed";
  name: string;
  generatedAt: string;
  format: "pdf" | "html" | "markdown" | "excel";
  size: string;
}

export interface Props {
  reports: Report[] | null;
  error?: string;
}

export default function ReportsPage({ reports, error }: Props) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = reports?.filter(report => {
    if (typeFilter !== "all" && report.type !== typeFilter) return false;
    if (searchQuery && !report.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <MainLayout>
      <Head>
        <title>Reports - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Reports</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Generate and download security reports
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
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
              Generate Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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
            <option value="all">All Types</option>
            <option value="risk-summary">Risk Summary</option>
            <option value="executive-summary">Executive Summary</option>
            <option value="compliance">Compliance</option>
            <option value="detailed">Detailed</option>
          </select>
          <input
            type="text"
            placeholder="Search reports..."
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
            No reports found
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, marginBottom: "8px" }}>{report.name}</h3>
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Type</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px", textTransform: "capitalize" }}>{report.type.replace("-", " ")}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Format</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px", textTransform: "uppercase" }}>{report.format}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Size</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{report.size}</div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Generated</div>
                        <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(report.generatedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
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
                    Download
                  </button>
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
    const { fetchReportHistory } = await import("../lib/api");
    const historyData = await fetchReportHistory(1, 50);
    const reports = historyData.reports.map((r: any) => ({
      id: r._id,
      type: r.reportType?.toLowerCase().replace("_", "-") || "risk-summary",
      name: r.fileName || `${r.reportType} Report`,
      generatedAt: r.createdAt,
      format: (r.format || "pdf").toLowerCase(),
      size: r.fileSize ? `${(r.fileSize / 1024).toFixed(2)} KB` : "N/A",
    }));
    return { props: { reports } };
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return { props: { reports: null, error: error.message || "Failed to fetch reports" } };
  }
};
