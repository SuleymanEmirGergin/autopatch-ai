import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface BulkOperation {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  itemsProcessed: number;
  totalItems: number;
  startedAt: string;
  completedAt?: string;
}

export interface Props {
  operations: BulkOperation[] | null;
  error?: string;
}

export default function BulkOperationsPage({ operations, error }: Props) {
  return (
    <MainLayout>
      <Head>
        <title>Bulk Operations - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Bulk Operations</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor and manage bulk operations
        </p>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && operations && operations.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {operations.map((op) => {
              const percentage = (op.itemsProcessed / op.totalItems) * 100;
              return (
                <div
                  key={op.id}
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
                        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{op.type}</h3>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              op.status === "completed" ? "#10B981" :
                              op.status === "running" ? "#2563EB" :
                              op.status === "failed" ? "#EF4444" : "#6B7280",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {op.status}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginTop: "12px" }}>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Progress</div>
                          <div style={{ color: "#CBD5E0", fontSize: "14px" }}>
                            {op.itemsProcessed} / {op.totalItems}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Started</div>
                          <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(op.startedAt).toLocaleString()}</div>
                        </div>
                        {op.completedAt && (
                          <div>
                            <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Completed</div>
                            <div style={{ color: "#CBD5E0", fontSize: "13px" }}>{new Date(op.completedAt).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {op.status === "running" && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Progress</span>
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{percentage.toFixed(1)}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          backgroundColor: "#0F172A",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: "100%",
                            backgroundColor: "#2563EB",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!error && (!operations || operations.length === 0) && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No bulk operations found
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    // Bulk operations için backend'de özel endpoint yok, boş döndür
    // Gerçek implementasyonda scan runs veya başka bir kaynaktan alınabilir
    const operations: BulkOperation[] = [];
    return { props: { operations } };
  } catch (error: any) {
    console.error("Error fetching bulk operations:", error);
    return { props: { operations: null, error: error.message || "Failed to fetch bulk operations" } };
  }
};
