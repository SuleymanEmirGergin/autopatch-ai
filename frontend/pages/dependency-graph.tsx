import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface DependencyNode {
  imageName: string;
  dependencies: string[];
  dependents: string[];
}

export interface Props {
  graph: DependencyNode[] | null;
  error?: string;
}

export default function DependencyGraphPage({ graph, error }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const selectedNode = graph?.find(node => node.imageName === selectedImage);

  return (
    <MainLayout>
      <Head>
        <title>Dependency Graph - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Dependency Graph</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Visualize dependencies between container images
        </p>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && graph && graph.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px" }}>
            {/* Graph Visualization Area */}
            <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", minHeight: "600px" }}>
              <div style={{ color: "#9CA3AF", fontSize: "14px", textAlign: "center", padding: "40px" }}>
                Graph visualization will be rendered here
                <br />
                <span style={{ fontSize: "12px" }}>(Interactive graph component to be implemented)</span>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Images ({graph.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
                  {graph.map((node, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(node.imageName)}
                      style={{
                        padding: "10px",
                        backgroundColor: selectedImage === node.imageName ? "#2563EB" : "#0F172A",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {node.imageName}
                    </button>
                  ))}
                </div>
              </div>

              {selectedNode && (
                <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Selected: {selectedNode.imageName}</h3>
                  <Link href={`/images/${encodeURIComponent(selectedNode.imageName)}`}>
                    <a style={{ color: "#60A5FA", textDecoration: "none", fontSize: "13px", marginBottom: "16px", display: "block" }}>
                      View Details →
                    </a>
                  </Link>
                  {selectedNode.dependencies.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Depends On ({selectedNode.dependencies.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {selectedNode.dependencies.map((dep, idx) => (
                          <div key={idx} style={{ padding: "6px", backgroundColor: "#0F172A", borderRadius: "4px", fontSize: "12px" }}>
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedNode.dependents.length > 0 && (
                    <div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Dependents ({selectedNode.dependents.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {selectedNode.dependents.map((dep, idx) => (
                          <div key={idx} style={{ padding: "6px", backgroundColor: "#0F172A", borderRadius: "4px", fontSize: "12px" }}>
                            {dep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!error && (!graph || graph.length === 0) && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No dependency data available
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { fetchDependencyGraph } = await import("../lib/api");
    const graphData = await fetchDependencyGraph();
    const graph = graphData.nodes.map((node: any) => ({
      imageName: node.imageName,
      dependencies: graphData.edges
        .filter((e: any) => e.to === node.id)
        .map((e: any) => {
          const depNode = graphData.nodes.find((n: any) => n.id === e.from);
          return depNode?.imageName || "";
        })
        .filter(Boolean),
      dependents: graphData.edges
        .filter((e: any) => e.from === node.id)
        .map((e: any) => {
          const depNode = graphData.nodes.find((n: any) => n.id === e.to);
          return depNode?.imageName || "";
        })
        .filter(Boolean),
    }));
    return { props: { graph } };
  } catch (error: any) {
    console.error("Error fetching dependency graph:", error);
    return { props: { graph: null, error: error.message || "Failed to fetch dependency graph" } };
  }
};
