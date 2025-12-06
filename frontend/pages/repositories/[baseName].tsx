import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { fetchImageTags, ImageTagsResponse } from "../../lib/api";

interface Props {
  tagsData: ImageTagsResponse | null;
  error?: string;
}

function riskBadgeClass(level: string) {
  switch (level) {
    case "LOW":
      return "badge badge-low";
    case "MEDIUM":
      return "badge badge-medium";
    case "HIGH":
      return "badge badge-high";
    case "CRITICAL":
      return "badge badge-critical";
    default:
      return "badge";
  }
}

export default function RepositoryTagsPage({ tagsData, error }: Props) {
  return (
    <div className="layout">
      <Head>
        <title>
          {tagsData?.baseName || "Repository"} Tags - AutoPatch AI
        </title>
      </Head>

      <header className="header">
        <div className="header-title">
          Repository Tags: {tagsData?.baseName || "Loading..."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/repositories">
            <button className="button button-secondary">Repositories</button>
          </Link>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {!tagsData && !error && <p>Yükleniyor...</p>}

        {tagsData && tagsData.tags.length === 0 && (
          <p>Bu repository için tag bulunamadı.</p>
        )}

        {tagsData && tagsData.tags.length > 0 && (
          <>
            <div className="muted" style={{ marginBottom: 16 }}>
              {tagsData.tags.length} tag bulundu. Tag'ler versiyon sırasına göre
              listelenmiştir.
            </div>

            <div className="grid">
              {tagsData.tags.map((tagInfo) => (
                <Link
                  key={tagInfo.imageName}
                  href={`/images/${encodeURIComponent(tagInfo.imageName)}`}
                >
                  <div className="card">
                    <div className="muted" style={{ fontSize: 12 }}>
                      Tag
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                      {tagInfo.tag}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    >
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Risk Score
                        </div>
                        <div className="risk-score">{tagInfo.riskScore}</div>
                      </div>
                      <span className={riskBadgeClass(tagInfo.riskLevel)}>
                        {tagInfo.riskLevel}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        marginTop: 12,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span className="muted">Pods:</span>{" "}
                        <strong>{tagInfo.pods.length}</strong>
                      </div>
                      {tagInfo.pods.some(
                        (p) =>
                          p.namespace.toLowerCase() === "prod" ||
                          p.namespace.toLowerCase().startsWith("prod-")
                      ) && (
                        <div>
                          <span className="muted">Prod:</span>{" "}
                          <strong style={{ color: "#fbbf24" }}>
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

                    <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                      Son tarama:{" "}
                      {new Date(tagInfo.lastScannedAt).toLocaleString()}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        Pods:
                      </div>
                      <div style={{ fontSize: 11 }}>
                        {tagInfo.pods.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="muted">
                            {p.namespace}/{p.name}
                          </div>
                        ))}
                        {tagInfo.pods.length > 3 && (
                          <div className="muted">
                            +{tagInfo.pods.length - 3} daha...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const baseNameParam = ctx.params?.baseName;
  if (!baseNameParam || typeof baseNameParam !== "string") {
    return {
      props: {
        tagsData: null,
        error: "Geçersiz repository adı",
      },
    };
  }

  const decoded = decodeURIComponent(baseNameParam);

  try {
    // Base name'den bir örnek image name oluştur (tag olmadan)
    // Eğer base name'de tag varsa kaldır
    const imageName = decoded.includes(":") ? decoded : `${decoded}:latest`;
    const tagsData = await fetchImageTags(imageName);
    return { props: { tagsData } };
  } catch (e: any) {
    console.error("Error in getServerSideProps:", e);
    return {
      props: {
        tagsData: null,
        error: e.message || "Backend'den tag bilgisi alınamadı.",
      },
    };
  }
};

