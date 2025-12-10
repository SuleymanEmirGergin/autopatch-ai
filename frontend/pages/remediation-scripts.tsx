import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface RemediationScript {
  id: string;
  imageName: string;
  riskFactor: string;
  script: string;
  language: "bash" | "python" | "yaml";
  status: "pending" | "executed" | "failed";
  executedAt?: string;
}

export interface Props {
  scripts: RemediationScript[] | null;
  error?: string;
}

export default function RemediationScriptsPage({ scripts, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = scripts?.filter(script =>
    script.imageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.riskFactor.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Remediation Scripts - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Remediation Scripts</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Automated remediation scripts for security issues
        </p>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search scripts..."
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
            No remediation scripts found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((script) => (
              <div
                key={script.id}
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
                      <Link href={`/images/${encodeURIComponent(script.imageName)}`}>
                        <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px" }}>
                          {script.imageName}
                        </a>
                      </Link>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#374151",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {script.language}
                      </span>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: script.status === "executed" ? "#10B981" : script.status === "failed" ? "#EF4444" : "#6B7280",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {script.status}
                      </span>
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: "14px" }}>
                      <strong>Risk Factor:</strong> {script.riskFactor}
                    </div>
                    {script.executedAt && (
                      <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "4px" }}>
                        Executed: {new Date(script.executedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    style={{
                      backgroundColor: "#2563EB",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                    disabled={script.status === "executed"}
                  >
                    {script.status === "executed" ? "Executed" : "Execute"}
                  </button>
                </div>
                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#0F172A", borderRadius: "6px" }}>
                  <pre style={{ margin: 0, color: "#CBD5E0", fontSize: "12px", overflowX: "auto" }}>
                    {script.script}
                  </pre>
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
    const { fetchImages } = await import("../lib/api");
    const images = await fetchImages();
    const scripts: RemediationScript[] = [];
    
    // Her image için remediation script'lerini topla (ilk 10 image)
    for (const image of images.slice(0, 10)) {
      try {
        const { fetchImageRemediationScripts } = await import("../lib/api");
        const scriptsData = await fetchImageRemediationScripts(image.imageName);
        scriptsData.scripts.forEach((s: any) => {
          scripts.push({
            id: s.id || s._id,
            imageName: image.imageName,
            riskFactor: s.riskFactor,
            script: s.script,
            language: s.language || "bash",
            status: s.status || "pending",
            executedAt: s.executedAt,
          });
        });
      } catch (err) {
        // Script yoksa devam et
        console.warn(`No remediation scripts for ${image.imageName}`);
      }
    }
    
    return { props: { scripts } };
  } catch (error: any) {
    console.error("Error fetching remediation scripts:", error);
    return { props: { scripts: null, error: error.message || "Failed to fetch remediation scripts" } };
  }
};
