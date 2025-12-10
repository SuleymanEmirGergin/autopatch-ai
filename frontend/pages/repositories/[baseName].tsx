import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import MainLayout from "../../components/MainLayout";
import { fetchImageTags, ImageTagsResponse } from "../../lib/api";

interface Props {
  tagsData: ImageTagsResponse | null;
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

export default function RepositoryTagsPage({ tagsData, error }: Props) {
  return (
    <MainLayout>
      <Head>
        <title>{tagsData?.baseName || "Repository"} Tags - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>
              Repository: {tagsData?.baseName || "Loading..."}
            </h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
              {tagsData ? `${tagsData.tags.length} tags found` : "Loading tags..."}
            </p>
          </div>
          <Link href="/repositories">
            <button
              style={{
                backgroundColor: "#374151",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Back to Repositories
            </button>
          </Link>
        </div>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!tagsData && !error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            Loading tags...
          </div>
        )}

        {tagsData && tagsData.tags.length === 0 && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No tags found for this repository
          </div>
        )}

        {tagsData && tagsData.tags.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {tagsData.tags.map((tagInfo) => (
              <Link key={tagInfo.imageName} href={`/images/${encodeURIComponent(tagInfo.imageName)}`}>
                <div
                  style={{
                    backgroundColor: "#1E293B",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid #334155",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#2563EB";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#334155";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Tag</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#CBD5E0" }}>
                    {tagInfo.tag}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Risk Score</div>
                      <div style={{ fontSize: "20px", fontWeight: 600 }}>{tagInfo.riskScore}</div>
                    </div>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        backgroundColor: riskBadgeClass(tagInfo.riskLevel),
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {tagInfo.riskLevel}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "12px", color: "#9CA3AF" }}>
                    <div>
                      <span>Pods:</span> <strong style={{ color: "#CBD5E0" }}>{tagInfo.pods.length}</strong>
                    </div>
                    {tagInfo.pods.some(
                      (p) =>
                        p.namespace.toLowerCase() === "prod" ||
                        p.namespace.toLowerCase().startsWith("prod-")
                    ) && (
                      <div>
                        <span>Prod:</span>{" "}
                        <strong style={{ color: "#F59E0B" }}>
                          {
                            tagInfo.pods.filter(
                              (p) =>
                                p.namespace.toLowerCase() === "prod" ||
                                p.namespace.toLowerCase().startsWith("prod-")
                            ).length
                          }
                        </strong>
                      </div>
                    )}
                  </div>

                  <div style={{ color: "#9CA3AF", fontSize: "11px", marginBottom: "8px" }}>
                    Last scanned: {new Date(tagInfo.lastScannedAt).toLocaleString()}
                  </div>

                  {tagInfo.pods.length > 0 && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #334155" }}>
                      <div style={{ color: "#9CA3AF", fontSize: "11px", marginBottom: "4px" }}>Pods:</div>
                      <div style={{ fontSize: "11px", color: "#CBD5E0" }}>
                        {tagInfo.pods.slice(0, 3).map((p, idx) => (
                          <div key={idx} style={{ marginBottom: "2px" }}>
                            {p.namespace}/{p.name}
                          </div>
                        ))}
                        {tagInfo.pods.length > 3 && (
                          <div style={{ color: "#9CA3AF" }}>+{tagInfo.pods.length - 3} more...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const baseNameParam = ctx.params?.baseName;
  if (!baseNameParam || typeof baseNameParam !== "string") {
    return {
      props: {
        tagsData: null,
        error: "Invalid repository name",
      },
    };
  }

  const decoded = decodeURIComponent(baseNameParam);

  try {
    const imageName = decoded.includes(":") ? decoded : `${decoded}:latest`;
    const tagsData = await fetchImageTags(imageName);
    return { props: { tagsData } };
  } catch (e: any) {
    return {
      props: {
        tagsData: null,
        error: e.message || "Failed to fetch tags",
      },
    };
  }
};
