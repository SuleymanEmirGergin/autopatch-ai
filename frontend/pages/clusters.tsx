import Head from "next/head";
import { GetServerSideProps } from "next";
import MainLayout from "../components/MainLayout";
import { fetchClusters, ClusterInfo } from "../lib/api";
import Link from "next/link";

export interface Props {
  clusters: ClusterInfo[] | null;
  error?: string;
}

export default function ClustersPage({ clusters, error }: Props) {
  const totalClusters = clusters?.length || 0;
  const totalPods = clusters?.reduce((sum, c) => sum + (c.podCount || 0), 0) || 0;
  const highRiskClusters = clusters?.filter(c => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL").length || 0;

  const namespaces = [
    { name: "prod", pods: 124, riskLevel: "High" },
    { name: "payments", pods: 18, riskLevel: "Critical" },
    { name: "auth", pods: 32, riskLevel: "High" },
    { name: "data", pods: 24, riskLevel: "Medium" },
    { name: "frontend", pods: 28, riskLevel: "Medium" },
    { name: "monitoring", pods: 12, riskLevel: "Low" },
  ];

  return (
    <MainLayout>
      <Head>
        <title>Clusters & Pods - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Clusters & Pods</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Manage and monitor CCE clusters and pod deployments
        </p>

        {/* Metrics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖥️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Total Clusters</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>{totalClusters} Clusters</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Across all environments</div>
          </div>

          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖥️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Total Pods</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>{totalPods} Pods</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Active across all clusters</div>
          </div>

          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>⚠️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>High-Risk Clusters</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px" }}>{highRiskClusters} Clusters</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Require immediate attention</div>
          </div>
        </div>

        {/* All Clusters Table */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>All Clusters</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>NAME</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>REGION</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>RISK LEVEL</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>NODES</th>
                  <th style={{ textAlign: "left", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>PODS</th>
                  <th style={{ textAlign: "right", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {clusters?.map((cluster, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>
                      <Link href={`/clusters/${cluster.clusterId}`} style={{ color: "#60A5FA", textDecoration: "none" }}>
                        {cluster.clusterId}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{cluster.region || "N/A"}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor:
                            cluster.riskLevel === "CRITICAL" || cluster.riskLevel === "HIGH"
                              ? "#FED7AA"
                              : cluster.riskLevel === "MEDIUM"
                              ? "#FEF3C7"
                              : "#D1FAE5",
                          color:
                            cluster.riskLevel === "CRITICAL" || cluster.riskLevel === "HIGH"
                              ? "#EA580C"
                              : cluster.riskLevel === "MEDIUM"
                              ? "#D97706"
                              : "#059669",
                        }}
                      >
                        {cluster.riskLevel || "LOW"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>{cluster.nodeCount || 0}</td>
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>{cluster.podCount || 0}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: "#D1FAE5",
                          color: "#059669",
                        }}
                      >
                        Running
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pods by Namespace */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Pods by Namespace</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {namespaces.map((ns, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#0F172A",
                  borderRadius: "8px",
                  padding: "16px",
                  border: "1px solid #334155",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 500,
                    backgroundColor:
                      ns.riskLevel === "Critical"
                        ? "#FEE2E2"
                        : ns.riskLevel === "High"
                        ? "#FED7AA"
                        : ns.riskLevel === "Medium"
                        ? "#FEF3C7"
                        : "#D1FAE5",
                    color:
                      ns.riskLevel === "Critical"
                        ? "#DC2626"
                        : ns.riskLevel === "High"
                        ? "#EA580C"
                        : ns.riskLevel === "Medium"
                        ? "#D97706"
                        : "#059669",
                  }}
                >
                  {ns.riskLevel}
                </span>
                <Link href={`/namespaces/${ns.name}`} style={{ color: "#60A5FA", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                  {ns.name}
                </Link>
                <div style={{ fontSize: "24px", fontWeight: 600, marginTop: "8px" }}>{ns.pods}</div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>pods running</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const clusters = await fetchClusters().catch(() => null);
    return {
      props: {
        clusters: clusters || null,
      },
    };
  } catch (e) {
    return {
      props: {
        clusters: null,
        error: "Backend'e bağlanılamadı",
      },
    };
  }
};
