import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  role: "admin" | "user" | "readonly";
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

export interface Props {
  tokens: ApiToken[] | null;
  error?: string;
}

export default function ApiTokensPage({ tokens, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = tokens?.filter(token =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>API Tokens - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>API Tokens</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              Manage API tokens for programmatic access
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
            + Create Token
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search tokens..."
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
            No API tokens found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((token) => (
              <div
                key={token.id}
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
                      <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{token.name}</h3>
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
                        {token.role}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Token</div>
                        <div style={{ color: "#CBD5E0", fontSize: "12px", fontFamily: "monospace", wordBreak: "break-all" }}>
                          {token.token.substring(0, 20)}...
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Created</div>
                        <div style={{ color: "#CBD5E0", fontSize: "12px" }}>{new Date(token.createdAt).toLocaleString()}</div>
                      </div>
                      {token.lastUsed && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Last Used</div>
                          <div style={{ color: "#CBD5E0", fontSize: "12px" }}>{new Date(token.lastUsed).toLocaleString()}</div>
                        </div>
                      )}
                      {token.expiresAt && (
                        <div>
                          <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Expires</div>
                          <div style={{ color: "#CBD5E0", fontSize: "12px" }}>{new Date(token.expiresAt).toLocaleString()}</div>
                        </div>
                      )}
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
    const { fetchApiTokens } = await import("../lib/api");
    const tokensData = await fetchApiTokens();
    const tokens = tokensData.map((t: any) => ({
      id: t._id || t.id,
      name: t.name,
      token: t.token ? `${t.token.substring(0, 8)}...` : "***",
      role: t.role || "user",
      createdAt: t.createdAt,
      lastUsed: t.lastUsedAt,
      expiresAt: t.expiresAt,
    }));
    return { props: { tokens } };
  } catch (error: any) {
    console.error("Error fetching API tokens:", error);
    return { props: { tokens: null, error: error.message || "Failed to fetch API tokens" } };
  }
};
