import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import MainLayout from "../components/MainLayout";
// import { fetchScanStatus, ScanStatus } from "../lib/api";

interface ScanStatus {
  lastScanAt?: string;
}

export interface Props {
  scanStatus: ScanStatus | null;
  error?: string;
}

export default function ScanRunsPage({ scanStatus, error }: Props) {
  const lastScanTime = scanStatus?.lastScanAt 
    ? new Date(scanStatus.lastScanAt).toLocaleTimeString()
    : "14:25";
  const lastScanDate = scanStatus?.lastScanAt
    ? new Date(scanStatus.lastScanAt).toLocaleDateString()
    : "2025-12-10";

  const scanRuns = [
    { id: "SCN-2025-001247", target: "prod-eu-cluster-01", type: "Cluster", startedAt: "2025-12-10 14:25", duration: "3m 42s", status: "Completed", findings: 12 },
    { id: "SCN-2025-001246", target: "payments-service:legacy", type: "Image", startedAt: "2025-12-10 14:20", duration: "2m 15s", status: "Completed", findings: 8 },
    { id: "SCN-2025-001245", target: "frontend/web-app:3.2.1", type: "Image", startedAt: "2025-12-10 13:10", duration: "2m 08s", status: "Completed", findings: 3 },
    { id: "SCN-2025-001244", target: "prod-us-cluster-02", type: "Cluster", startedAt: "2025-12-10 12:45", duration: "4m 12s", status: "Completed", findings: 0 },
    { id: "SCN-2025-001243", target: "prod-ap-cluster-03", type: "Cluster", startedAt: "2025-12-10 11:30", duration: "1m 25s", status: "Failed", findings: 0 },
  ];

  return (
    <MainLayout>
      <Head>
        <title>Scan Runs - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Scan Runs</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          View history and status of security scans
        </p>

        {/* Overview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🕐</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Last Scan Time</div>
            <div style={{ fontSize: "24px", fontWeight: 600, marginBottom: "4px" }}>{lastScanTime}</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{lastScanDate} (3 minutes ago)</div>
          </div>

          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>▶️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Scans Today</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>247 Scans</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Across all environments</div>
          </div>

          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>⚠️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Failed Scans</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px", color: "#F87171" }}>3 Failed</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>1.2% failure rate today</div>
          </div>
        </div>

        {/* Recent Scan Runs Table */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Recent Scan Runs</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>SCAN ID</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>TARGET</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>TYPE</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>STARTED AT</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>DURATION</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>STATUS</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>FINDINGS</th>
                </tr>
              </thead>
              <tbody>
                {scanRuns.map((run, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>
                      <Link href={`/scan-runs/${run.id}`} style={{ color: "#60A5FA", textDecoration: "none" }}>
                        {run.id}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>{run.target}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: "#2D3748",
                          color: "#9CA3AF",
                        }}
                      >
                        {run.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{run.startedAt}</td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{run.duration}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: run.status === "Completed" ? "#D1FAE5" : "#FEE2E2",
                          color: run.status === "Completed" ? "#059669" : "#DC2626",
                        }}
                      >
                        {run.status === "Completed" ? "✓" : "✕"} {run.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", fontWeight: 600 }}>{run.findings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return {
    props: {
      scanStatus: { lastScanAt: new Date().toISOString() },
    },
  };
};
