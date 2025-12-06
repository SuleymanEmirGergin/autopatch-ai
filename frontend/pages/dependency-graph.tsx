import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { fetchDependencyGraph, DependencyGraph } from "../lib/api";

interface Props {
  graph: DependencyGraph | null;
  error?: string;
}

function riskLevelToColor(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "#ef4444";
    case "HIGH":
      return "#f87171";
    case "MEDIUM":
      return "#fbbf24";
    case "LOW":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

export default function DependencyGraphPage({ graph, error }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Graph'i ReactFlow formatına dönüştür
  useEffect(() => {
    if (graph) {
      const flowNodes: Node[] = graph.nodes.map((node, idx) => ({
        id: node.id,
        data: {
          label: (
            <div style={{ textAlign: "center", padding: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{node.label}</div>
              {node.type === "derived" && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      color: riskLevelToColor(node.riskLevel),
                      marginTop: 2,
                    }}
                  >
                    {node.riskScore} ({node.riskLevel})
                  </div>
                </>
              )}
            </div>
          ),
        },
        position: { 
          x: (idx % 5) * 200 + Math.random() * 50, 
          y: Math.floor(idx / 5) * 150 + Math.random() * 50 
        },
        style: {
          backgroundColor:
            node.type === "base" ? "#1f2937" : riskLevelToColor(node.riskLevel),
          color: "white",
          border: `2px solid ${riskLevelToColor(node.riskLevel)}`,
          borderRadius: 8,
          padding: 8,
          minWidth: 120,
        },
      }));

      const flowEdges: Edge[] = graph.edges.map((edge) => ({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        animated: edge.type === "namespace",
        style: {
          stroke:
            edge.type === "base" ? "#3b82f6" : "#10b981",
          strokeWidth: 2,
        },
        label: edge.type === "base" ? "base" : "namespace",
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [graph]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="layout">
      <Head>
        <title>Image Bağımlılık Grafiği - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Image Bağımlılık Grafiği</div>
        <Link href="/">
          <button className="button button-secondary">Ana Sayfa</button>
        </Link>
      </header>

      <main className="container" style={{ height: "calc(100vh - 80px)" }}>
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {!graph && !error && <p>Yükleniyor...</p>}

        {graph && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Toplam {graph.nodes.length} node, {graph.edges.length} bağlantı
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#3b82f6" }}>●</span> Base image bağımlılıkları
                </div>
                <div>
                  <span style={{ color: "#10b981" }}>●</span> Namespace bağlantıları
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: "calc(100vh - 200px)", border: "1px solid #374151", borderRadius: 4 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
              >
                <Controls />
                <Background />
                <MiniMap
                  nodeColor={(node) => {
                    const data = node.data as any;
                    return data?.style?.backgroundColor || "#1f2937";
                  }}
                />
              </ReactFlow>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const graph = await fetchDependencyGraph();
    return { props: { graph } };
  } catch (e: any) {
    console.error("Error in getServerSideProps:", e);
    return {
      props: {
        graph: null,
        error: e.message || "Backend'den grafik alınamadı.",
      },
    };
  }
};

