import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface AllowlistEntry {
  imageName: string;
  ignoredRiskFactors: string[];
  note?: string;
  createdAt: string;
}

export interface Props {
  entries: AllowlistEntry[] | null;
  error?: string;
}

export default function AllowlistPage({ entries, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = entries?.filter(entry =>
    entry.imageName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Allowlist - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Allowlist</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Manage images and risk factors that are excluded from risk scoring
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
            + Add Entry
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search allowlist..."
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
            No allowlist entries found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/images/${encodeURIComponent(entry.imageName)}`}>
                      <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px", marginBottom: "8px", display: "block" }}>
                        {entry.imageName}
                      </a>
                    </Link>
                    {entry.note && (
                      <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "12px" }}>{entry.note}</div>
                    )}
                    {entry.ignoredRiskFactors.length > 0 && (
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Ignored Risk Factors</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {entry.ignoredRiskFactors.map((factor, fIdx) => (
                            <span
                              key={fIdx}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#0F172A",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "#CBD5E0",
                              }}
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "12px" }}>
                      Created: {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    style={{
                      backgroundColor: "#DC2626",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Remove
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
    const { fetchAllowlist } = await import("../lib/api");
    const entriesData = await fetchAllowlist();
    const entries = entriesData.map((e: any) => ({
      imageName: e.imageName,
      ignoredRiskFactors: e.ignoredRiskFactors || [],
      note: e.note,
      createdAt: e.createdAt || new Date().toISOString(),
    }));
    return { props: { entries } };
  } catch (error: any) {
    console.error("Error fetching allowlist:", error);
    return { props: { entries: null, error: error.message || "Failed to fetch allowlist" } };
  }
};
