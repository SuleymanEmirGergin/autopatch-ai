import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { fetchRepositories, RepositoryInfo } from "../../lib/api";

interface Props {
  repositories: RepositoryInfo[] | null;
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

export default function RepositoriesPage({ repositories, error }: Props) {
  return (
    <div className="layout">
      <Head>
        <title>Image Repositories - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Image Repositories</div>
        <Link href="/">
          <button className="button button-secondary">Ana Sayfa</button>
        </Link>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>
            Backend hatası: {error}
          </p>
        )}

        {!repositories && !error && <p>Yükleniyor...</p>}

        {repositories && repositories.length === 0 && (
          <p>Henüz repository yok. Önce bir scan çalıştırın.</p>
        )}

        {repositories && repositories.length > 0 && (
          <>
            <div className="muted" style={{ marginBottom: 16 }}>
              Toplam {repositories.length} repository bulundu. Her repository
              farklı tag'leriyle gruplandırılmıştır.
            </div>

            <div className="grid">
              {repositories.map((repo) => (
                <Link
                  key={repo.baseName}
                  href={`/repositories/${encodeURIComponent(repo.baseName)}`}
                >
                  <div className="card">
                    <div className="muted" style={{ fontSize: 12 }}>
                      Repository
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                      {repo.baseName}
                    </div>

                    {repo.registry && (
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        Registry: {repo.registry}
                      </div>
                    )}

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
                          Max Risk Score
                        </div>
                        <div className="risk-score">{repo.maxRiskScore}</div>
                      </div>
                      <span className={riskBadgeClass(repo.maxRiskLevel)}>
                        {repo.maxRiskLevel}
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
                        <span className="muted">Tag Sayısı:</span>{" "}
                        <strong>{repo.tagCount}</strong>
                      </div>
                      <div>
                        <span className="muted">Prod Pod:</span>{" "}
                        <strong style={{ color: "#fbbf24" }}>
                          {repo.prodPodCount}
                        </strong>
                      </div>
                    </div>

                    {repo.lastScannedAt && (
                      <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                        Son tarama:{" "}
                        {new Date(repo.lastScannedAt).toLocaleString()}
                      </div>
                    )}
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

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const repositories = await fetchRepositories();
    return { props: { repositories } };
  } catch (e: any) {
    console.error("Error in getServerSideProps:", e);
    return {
      props: {
        repositories: null,
        error:
          e.message || "Backend'e bağlanılamadı. Scanner Service çalışıyor mu?",
      },
    };
  }
};

