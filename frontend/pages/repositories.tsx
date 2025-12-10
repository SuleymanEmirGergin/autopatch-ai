import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import { fetchRepositories, RepositoryInfo } from "../lib/api";
import Link from "next/link";

export interface Props {
  repositories: RepositoryInfo[] | null;
  error?: string;
}

function riskBadgeClass(level: string) {
  const colors: { [key: string]: string } = {
    LOW: "#10B981",
    MEDIUM: "#F59E0B",
    HIGH: "#EF4444",
    CRITICAL: "#DC2626",
  };
  return colors[level] || "#6B7280";
}

export default function RepositoriesPage({ repositories, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRepos = repositories?.filter(repo =>
    repo.baseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.repository.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>Repositories - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Repositories</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          View all container image repositories grouped by base name
        </p>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search repositories..."
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

        {/* Repositories Table */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#0F172A", borderBottom: "1px solid #334155" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Repository</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Registry</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Tags</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Prod Pods</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Max Risk</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Last Scanned</th>
                </tr>
              </thead>
              <tbody>
                {error && (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#EF4444" }}>
                      Error: {error}
                    </td>
                  </tr>
                )}
                {!error && filteredRepos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#9CA3AF" }}>
                      No repositories found
                    </td>
                  </tr>
                )}
                {!error && filteredRepos.map((repo, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < filteredRepos.length - 1 ? "1px solid #334155" : "none",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0F172A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/repositories/${encodeURIComponent(repo.baseName)}`}>
                        <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 500 }}>
                          {repo.baseName}
                        </a>
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#CBD5E0", fontSize: "14px" }}>
                      {repo.registry || "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#CBD5E0", fontSize: "14px" }}>
                      {repo.tagCount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#CBD5E0", fontSize: "14px" }}>
                      {repo.prodPodCount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600 }}>{repo.maxRiskScore}</div>
                        <div
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: riskBadgeClass(repo.maxRiskLevel),
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {repo.maxRiskLevel}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: "12px" }}>
                      {repo.lastScannedAt ? new Date(repo.lastScannedAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const repositories = await fetchRepositories();
    return { props: { repositories } };
  } catch (e: any) {
    return { props: { repositories: null, error: e.message || "Failed to fetch repositories" } };
  }
};
