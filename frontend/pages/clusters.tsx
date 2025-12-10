import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import { useRouter } from "next/router";
import MainLayout from "../components/MainLayout";
import { fetchClusters, ClusterInfo } from "../lib/api";
import Link from "next/link";

export interface Props {
  clusters: ClusterInfo[] | null;
  error?: string;
}

export default function ClustersPage({ clusters, error }: Props) {
  const router = useRouter();
  const [expandedNamespace, setExpandedNamespace] = useState<string | null>(null);
  const [hoveredNamespace, setHoveredNamespace] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [hoveredClusterRow, setHoveredClusterRow] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const totalClusters = clusters?.length || 0;
  const totalPods = clusters?.reduce((sum, c) => sum + (c.podCount || 0), 0) || 0;
  const highRiskClusters = clusters?.filter(c => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL").length || 0;

  const namespaces = [
    { name: "prod", pods: 124, riskLevel: "High", images: 15, criticalPods: 8 },
    { name: "payments", pods: 18, riskLevel: "Critical", images: 5, criticalPods: 12 },
    { name: "auth", pods: 32, riskLevel: "High", images: 8, criticalPods: 6 },
    { name: "data", pods: 24, riskLevel: "Medium", images: 12, criticalPods: 2 },
    { name: "frontend", pods: 28, riskLevel: "Medium", images: 10, criticalPods: 3 },
    { name: "monitoring", pods: 12, riskLevel: "Low", images: 4, criticalPods: 0 },
  ];

  const handleNamespaceClick = (namespace: string) => {
    if (expandedNamespace === namespace) {
      setExpandedNamespace(null);
    } else {
      setExpandedNamespace(namespace);
    }
  };

  const handleViewPods = (namespace: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/images-risk?namespace=${namespace}`);
  };

  const handleScanNamespace = async (namespace: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement namespace scan
    alert(`Scanning namespace: ${namespace}`);
  };

  const handleViewImages = (namespace: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/images-risk?namespace=${namespace}`);
  };

  const handleMetricClick = (type: string) => {
    switch (type) {
      case "clusters":
        // Scroll to clusters table
        document.getElementById("clusters-table")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "pods":
        router.push("/images-risk");
        break;
      case "high-risk":
        // Filter high-risk clusters
        const highRisk = clusters?.filter(c => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL");
        if (highRisk && highRisk.length > 0) {
          document.getElementById("clusters-table")?.scrollIntoView({ behavior: "smooth" });
        }
        break;
    }
  };

  const handleClusterRowClick = (clusterId: string) => {
    router.push(`/clusters/${clusterId}`);
  };

  const handleRiskLevelClick = (riskLevel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/images-risk?riskLevel=${riskLevel}`);
  };

  const handlePodCountClick = (clusterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/images-risk?clusterId=${clusterId}`);
  };

  const handleNodeCountClick = (clusterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/clusters/${clusterId}`);
  };

  const handleSort = (key: string) => {
    if (sortConfig?.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const sortedClusters = clusters ? [...clusters].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aVal: any = a[key as keyof ClusterInfo];
    let bVal: any = b[key as keyof ClusterInfo];
    
    if (key === "riskLevel") {
      const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      aVal = order[aVal as keyof typeof order] || 0;
      bVal = order[bVal as keyof typeof order] || 0;
    }
    
    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  }) : null;

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
          <div 
            onClick={() => handleMetricClick("clusters")}
            onMouseEnter={() => setHoveredMetric("clusters")}
            onMouseLeave={() => setHoveredMetric(null)}
            style={{ 
              backgroundColor: hoveredMetric === "clusters" ? "#1E3A5F" : "#1E293B", 
              borderRadius: "12px", 
              padding: "20px", 
              border: hoveredMetric === "clusters" ? "1px solid #2563EB" : "1px solid #334155", 
              position: "relative",
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredMetric === "clusters" ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoveredMetric === "clusters" ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "none",
            }}
          >
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖥️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Total Clusters</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px", color: hoveredMetric === "clusters" ? "#60A5FA" : "white", transition: "color 0.2s" }}>
              {totalClusters} Clusters
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Across all environments</div>
          </div>

          <div 
            onClick={() => handleMetricClick("pods")}
            onMouseEnter={() => setHoveredMetric("pods")}
            onMouseLeave={() => setHoveredMetric(null)}
            style={{ 
              backgroundColor: hoveredMetric === "pods" ? "#1E3A5F" : "#1E293B", 
              borderRadius: "12px", 
              padding: "20px", 
              border: hoveredMetric === "pods" ? "1px solid #2563EB" : "1px solid #334155", 
              position: "relative",
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredMetric === "pods" ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoveredMetric === "pods" ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "none",
            }}
          >
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>🖥️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>Total Pods</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px", color: hoveredMetric === "pods" ? "#60A5FA" : "white", transition: "color 0.2s" }}>
              {totalPods} Pods
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Active across all clusters</div>
          </div>

          <div 
            onClick={() => handleMetricClick("high-risk")}
            onMouseEnter={() => setHoveredMetric("high-risk")}
            onMouseLeave={() => setHoveredMetric(null)}
            style={{ 
              backgroundColor: hoveredMetric === "high-risk" ? "#1E3A5F" : "#1E293B", 
              borderRadius: "12px", 
              padding: "20px", 
              border: hoveredMetric === "high-risk" ? "1px solid #2563EB" : "1px solid #334155", 
              position: "relative",
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredMetric === "high-risk" ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoveredMetric === "high-risk" ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "none",
            }}
          >
            <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "20px" }}>⚠️</div>
            <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "8px" }}>High-Risk Clusters</div>
            <div style={{ fontSize: "32px", fontWeight: 600, marginBottom: "4px", color: hoveredMetric === "high-risk" ? "#EF4444" : "white", transition: "color 0.2s" }}>
              {highRiskClusters} Clusters
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Require immediate attention</div>
          </div>
        </div>

        {/* All Clusters Table */}
        <div id="clusters-table" style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>All Clusters</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th 
                    onClick={() => handleSort("clusterId")}
                    style={{ 
                      textAlign: "left", 
                      padding: "8px", 
                      fontSize: "12px", 
                      color: "#9CA3AF", 
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#60A5FA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    NAME {sortConfig?.key === "clusterId" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    onClick={() => handleSort("region")}
                    style={{ 
                      textAlign: "left", 
                      padding: "8px", 
                      fontSize: "12px", 
                      color: "#9CA3AF", 
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#60A5FA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    REGION {sortConfig?.key === "region" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    onClick={() => handleSort("riskLevel")}
                    style={{ 
                      textAlign: "left", 
                      padding: "8px", 
                      fontSize: "12px", 
                      color: "#9CA3AF", 
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#60A5FA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    RISK LEVEL {sortConfig?.key === "riskLevel" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    onClick={() => handleSort("nodeCount")}
                    style={{ 
                      textAlign: "left", 
                      padding: "8px", 
                      fontSize: "12px", 
                      color: "#9CA3AF", 
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#60A5FA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    NODES {sortConfig?.key === "nodeCount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    onClick={() => handleSort("podCount")}
                    style={{ 
                      textAlign: "left", 
                      padding: "8px", 
                      fontSize: "12px", 
                      color: "#9CA3AF", 
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#60A5FA";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    PODS {sortConfig?.key === "podCount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ textAlign: "right", padding: "8px", fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sortedClusters?.map((cluster, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => handleClusterRowClick(cluster.clusterId)}
                    onMouseEnter={() => setHoveredClusterRow(idx)}
                    onMouseLeave={() => setHoveredClusterRow(null)}
                    style={{ 
                      borderBottom: "1px solid #334155",
                      backgroundColor: hoveredClusterRow === idx ? "#1E3A5F" : "transparent",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <td style={{ padding: "12px 8px", fontSize: "13px" }}>
                      <Link 
                        href={`/clusters/${cluster.clusterId}`} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          color: hoveredClusterRow === idx ? "#93C5FD" : "#60A5FA", 
                          textDecoration: "none",
                          fontWeight: 500,
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {cluster.clusterId}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "13px", color: "#9CA3AF" }}>{cluster.region || "N/A"}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        onClick={(e) => handleRiskLevelClick(cluster.riskLevel || "LOW", e)}
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
                          cursor: "pointer",
                          display: "inline-block",
                          transition: "transform 0.2s, opacity 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {cluster.riskLevel || "LOW"}
                      </span>
                    </td>
                    <td 
                      onClick={(e) => handleNodeCountClick(cluster.clusterId, e)}
                      style={{ 
                        padding: "12px 8px", 
                        fontSize: "13px",
                        cursor: "pointer",
                        color: hoveredClusterRow === idx ? "#60A5FA" : "white",
                        transition: "color 0.2s",
                        fontWeight: hoveredClusterRow === idx ? 600 : 400,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {cluster.nodeCount || 0}
                    </td>
                    <td 
                      onClick={(e) => handlePodCountClick(cluster.clusterId, e)}
                      style={{ 
                        padding: "12px 8px", 
                        fontSize: "13px",
                        cursor: "pointer",
                        color: hoveredClusterRow === idx ? "#60A5FA" : "white",
                        transition: "color 0.2s",
                        fontWeight: hoveredClusterRow === idx ? 600 : 400,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {cluster.podCount || 0}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: "#D1FAE5",
                          color: "#059669",
                          display: "inline-block",
                          transition: "transform 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
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
            {namespaces.map((ns, idx) => {
              const isExpanded = expandedNamespace === ns.name;
              const isHovered = hoveredNamespace === ns.name;
              
              return (
                <div
                  key={idx}
                  onClick={() => handleNamespaceClick(ns.name)}
                  onMouseEnter={() => setHoveredNamespace(ns.name)}
                  onMouseLeave={() => setHoveredNamespace(null)}
                  style={{
                    backgroundColor: isHovered ? "#1E3A5F" : "#0F172A",
                    borderRadius: "8px",
                    padding: "16px",
                    border: isHovered ? "1px solid #2563EB" : "1px solid #334155",
                    position: "relative",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: isHovered ? "0 4px 12px rgba(37, 99, 235, 0.2)" : "none",
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
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Link 
                      href={`/images-risk?namespace=${ns.name}`} 
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        color: "#60A5FA", 
                        textDecoration: "none", 
                        fontSize: "14px", 
                        fontWeight: 500,
                        flex: 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {ns.name}
                    </Link>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </div>
                  
                  <div 
                    style={{ 
                      fontSize: "24px", 
                      fontWeight: 600, 
                      marginTop: "8px",
                      cursor: "pointer",
                      color: isHovered ? "#60A5FA" : "white",
                      transition: "color 0.2s",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPods(ns.name, e);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    {ns.pods}
                  </div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "12px" }}>
                    pods running
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: "12px", 
                        paddingTop: "12px", 
                        borderTop: "1px solid #334155",
                        animation: "fadeIn 0.2s ease",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>Images</div>
                          <div style={{ fontSize: "16px", fontWeight: 600 }}>{ns.images}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "4px" }}>Critical Pods</div>
                          <div style={{ fontSize: "16px", fontWeight: 600, color: ns.criticalPods > 0 ? "#EF4444" : "#10B981" }}>
                            {ns.criticalPods}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={(e) => handleViewPods(ns.name, e)}
                          style={{
                            backgroundColor: "#2563EB",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: 500,
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#1D4ED8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2563EB";
                          }}
                        >
                          View Pods
                        </button>
                        <button
                          onClick={(e) => handleViewImages(ns.name, e)}
                          style={{
                            backgroundColor: "#6366F1",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: 500,
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#4F46E5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#6366F1";
                          }}
                        >
                          View Images
                        </button>
                        <button
                          onClick={(e) => handleScanNamespace(ns.name, e)}
                          style={{
                            backgroundColor: "#10B981",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: 500,
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#059669";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#10B981";
                          }}
                        >
                          Scan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
