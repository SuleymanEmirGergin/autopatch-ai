import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Props {
  templates: ReportTemplate[] | null;
  error?: string;
}

export default function ReportTemplatesPage({ templates, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = templates?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Report Templates - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Report Templates</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Customize report templates for your organization
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
            + Create Template
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search templates..."
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
            No report templates found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((template) => (
              <div
                key={template.id}
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
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{template.name}</h3>
                      {template.isDefault && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#2563EB",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          Default
                        </span>
                      )}
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#374151",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {template.category}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "12px" }}>{template.description}</div>
                    <div style={{ color: "#9CA3AF", fontSize: "12px" }}>
                      Created: {new Date(template.createdAt).toLocaleString()} • Updated: {new Date(template.updatedAt).toLocaleString()}
                    </div>
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
                      Preview
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
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:5000"}/api/report-templates`, {
      headers: process.env.BACKEND_ADMIN_API_KEY ? { "X-API-Key": process.env.BACKEND_ADMIN_API_KEY } : {},
    });
    if (!res.ok) throw new Error("Failed to fetch report templates");
    const templatesData = await res.json();
    const templates = templatesData.map((t: any) => ({
      id: t._id || t.id,
      name: t.name,
      description: t.description || "",
      category: t.category || "General",
      isDefault: t.isDefault || false,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
    }));
    return { props: { templates } };
  } catch (error: any) {
    console.error("Error fetching report templates:", error);
    return { props: { templates: null, error: error.message || "Failed to fetch report templates" } };
  }
};
