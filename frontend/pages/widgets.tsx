import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface Widget {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  enabled: boolean;
  config: any;
}

export interface Props {
  widgets: Widget[] | null;
  error?: string;
}

export default function WidgetsPage({ widgets, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = widgets?.filter(widget =>
    widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    widget.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Widgets - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Widgets</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Customize dashboard widgets for your needs
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
            + Create Widget
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search widgets..."
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
            No widgets found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {filtered.map((widget) => (
              <div
                key={widget.id}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, marginBottom: "4px" }}>{widget.name}</h3>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Type: {widget.type}</div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "11px", marginBottom: "2px" }}>Position</div>
                        <div style={{ color: "#CBD5E0", fontSize: "12px" }}>
                          {widget.position.x}, {widget.position.y}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "11px", marginBottom: "2px" }}>Size</div>
                        <div style={{ color: "#CBD5E0", fontSize: "12px" }}>
                          {widget.size.width} × {widget.size.height}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: widget.enabled ? "#10B981" : "#6B7280",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {widget.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    style={{
                      flex: 1,
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
                  <button
                    style={{
                      flex: 1,
                      backgroundColor: "#DC2626",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Delete
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
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:5000"}/api/widgets`, {
      headers: process.env.BACKEND_ADMIN_API_KEY ? { "X-API-Key": process.env.BACKEND_ADMIN_API_KEY } : {},
    });
    if (!res.ok) throw new Error("Failed to fetch widgets");
    const widgetsData = await res.json();
    const widgets = widgetsData.map((w: any) => ({
      id: w._id || w.id,
      name: w.name,
      type: w.type,
      position: w.position || { x: 0, y: 0 },
      size: w.size || { width: 300, height: 200 },
      enabled: w.enabled !== false,
      config: w.config || {},
    }));
    return { props: { widgets } };
  } catch (error: any) {
    console.error("Error fetching widgets:", error);
    return { props: { widgets: null, error: error.message || "Failed to fetch widgets" } };
  }
};
