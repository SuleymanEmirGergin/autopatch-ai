import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { GetServerSideProps } from "next";
import { fetchImage, ImageRisk } from "../lib/api";

interface Props {
  image1Name?: string;
  image2Name?: string;
  image1?: ImageRisk | null;
  image2?: ImageRisk | null;
  comparison?: ImageComparisonResult | null;
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

function countProdPods(image: ImageRisk) {
  let prod = 0;
  let nonProd = 0;

  image.pods.forEach((p) => {
    const ns = p.namespace.toLowerCase();
    if (ns === "prod" || ns.startsWith("prod-")) {
      prod += 1;
    } else {
      nonProd += 1;
    }
  });

  return { prod, nonProd };
}

export default function ComparePage({
  image1Name,
  image2Name,
  image1,
  image2,
  comparison: initialComparison,
  error,
}: Props) {
  const [search1, setSearch1] = useState(image1Name || "");
  const [search2, setSearch2] = useState(image2Name || "");
  const [comparison, setComparison] = useState<ImageComparisonResult | null>(initialComparison || null);
  const [loading, setLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  useEffect(() => {
    if (image1Name && image2Name && !initialComparison) {
      loadComparison();
    }
  }, [image1Name, image2Name]);

  const loadComparison = async () => {
    if (!image1Name || !image2Name) return;
    setLoading(true);
    setComparisonError(null);
    try {
      const result = await compareImages(image1Name, image2Name);
      setComparison(result);
    } catch (e: any) {
      setComparisonError(e.message || "Karşılaştırma yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Image Karşılaştırma - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Image Karşılaştırma</div>
        <Link href="/">
          <button className="button button-secondary">Ana Sayfa</button>
        </Link>
      </header>

      <main className="container">
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>
            Karşılaştırılacak Image'leri Seçin
          </h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                Image 1:
              </label>
              <input
                className="input"
                type="text"
                value={search1}
                onChange={(e) => setSearch1(e.target.value)}
                placeholder="registry.example.com/app:latest"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                Image 2:
              </label>
              <input
                className="input"
                type="text"
                value={search2}
                onChange={(e) => setSearch2(e.target.value)}
                placeholder="registry.example.com/app:v2.0.0"
              />
            </div>
          </div>
          <Link
            href={`/compare?image1=${encodeURIComponent(search1)}&image2=${encodeURIComponent(search2)}`}
          >
            <button className="button">Karşılaştır</button>
          </Link>
        </div>

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {image1 && image2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Image 1 */}
            <div className="card">
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Image 1
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                {image1.imageName}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>Risk Score</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color:
                      image1.riskLevel === "CRITICAL"
                        ? "#ef4444"
                        : image1.riskLevel === "HIGH"
                        ? "#f87171"
                        : image1.riskLevel === "MEDIUM"
                        ? "#fbbf24"
                        : "#10b981",
                  }}
                >
                  {image1.riskScore}
                </div>
                <span className={riskBadgeClass(image1.riskLevel)}>
                  {image1.riskLevel}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Pod Sayısı
                </div>
                <div style={{ fontSize: 16 }}>
                  {image1.pods.length}
                  {(() => {
                    const { prod } = countProdPods(image1);
                    if (prod > 0) {
                      return (
                        <span style={{ color: "#fbbf24", marginLeft: 4 }}>
                          ({prod} prod)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Risk Faktörleri
                </div>
                <div className="chips" style={{ marginTop: 4 }}>
                  {image1.riskFactors.map((f, idx) => (
                    <span key={idx} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Son Tarama
                </div>
                <div style={{ fontSize: 13 }}>
                  {new Date(image1.lastScannedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Image 2 */}
            <div className="card">
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Image 2
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                {image2.imageName}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>Risk Score</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color:
                      image2.riskLevel === "CRITICAL"
                        ? "#ef4444"
                        : image2.riskLevel === "HIGH"
                        ? "#f87171"
                        : image2.riskLevel === "MEDIUM"
                        ? "#fbbf24"
                        : "#10b981",
                  }}
                >
                  {image2.riskScore}
                </div>
                <span className={riskBadgeClass(image2.riskLevel)}>
                  {image2.riskLevel}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Pod Sayısı
                </div>
                <div style={{ fontSize: 16 }}>
                  {image2.pods.length}
                  {(() => {
                    const { prod } = countProdPods(image2);
                    if (prod > 0) {
                      return (
                        <span style={{ color: "#fbbf24", marginLeft: 4 }}>
                          ({prod} prod)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Risk Faktörleri
                </div>
                <div className="chips" style={{ marginTop: 4 }}>
                  {image2.riskFactors.map((f, idx) => (
                    <span key={idx} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Son Tarama
                </div>
                <div style={{ fontSize: 13 }}>
                  {new Date(image2.lastScannedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && <p>Karşılaştırma yapılıyor...</p>}
        {comparisonError && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{comparisonError}</p>
        )}

        {comparison && (
          <>
            {/* Gelişmiş Karşılaştırma Özeti */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>
                Karşılaştırma Özeti
                <span
                  className={`badge ${
                    comparison.summary.overallChange === "improved"
                      ? "badge-low"
                      : comparison.summary.overallChange === "degraded"
                      ? "badge-critical"
                      : "badge-medium"
                  }`}
                  style={{ marginLeft: 12, fontSize: 11 }}
                >
                  {comparison.summary.overallChange === "improved"
                    ? "✅ İyileşti"
                    : comparison.summary.overallChange === "degraded"
                    ? "⚠️ Kötüleşti"
                    : "➡️ Değişmedi"}
                </span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    Risk Skoru Değişimi
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color:
                        comparison.differences.riskScoreDiff < 0
                          ? "#10b981"
                          : comparison.differences.riskScoreDiff > 0
                          ? "#f87171"
                          : "#9ca3af",
                    }}
                  >
                    {comparison.differences.riskScoreDiff > 0 ? "+" : ""}
                    {comparison.differences.riskScoreDiff.toFixed(1)}
                  </div>
                  <div className="muted" style={{ fontSize: 10 }}>
                    ({comparison.summary.riskScoreChangePercent.toFixed(1)}%)
                  </div>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    Risk Seviyesi
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {comparison.differences.riskLevelChanged ? (
                      <>
                        <span className={riskBadgeClass(comparison.image1.riskLevel)}>
                          {comparison.image1.riskLevel}
                        </span>
                        {" → "}
                        <span className={riskBadgeClass(comparison.image2.riskLevel)}>
                          {comparison.image2.riskLevel}
                        </span>
                      </>
                    ) : (
                      <span className={riskBadgeClass(comparison.image1.riskLevel)}>
                        {comparison.image1.riskLevel} (Değişmedi)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    Toplam Değişiklik
                  </div>
                  <div style={{ fontSize: 20, fontWeight: "bold" }}>
                    {comparison.summary.totalChanges}
                  </div>
                  <div className="muted" style={{ fontSize: 10 }}>
                    değişiklik tespit edildi
                  </div>
                </div>
              </div>

              {/* Risk Faktörleri Karşılaştırması */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>Risk Faktörleri Değişiklikleri</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {comparison.differences.addedRiskFactors.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        ➕ Eklenen ({comparison.differences.addedRiskFactors.length})
                      </div>
                      <div className="chips">
                        {comparison.differences.addedRiskFactors.map((f, idx) => (
                          <span key={idx} className="chip" style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.differences.removedRiskFactors.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        ➖ Kaldırılan ({comparison.differences.removedRiskFactors.length})
                      </div>
                      <div className="chips">
                        {comparison.differences.removedRiskFactors.map((f, idx) => (
                          <span key={idx} className="chip" style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac", color: "#166534" }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {comparison.differences.commonRiskFactors.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        🔄 Ortak ({comparison.differences.commonRiskFactors.length})
                      </div>
                      <div className="chips">
                        {comparison.differences.commonRiskFactors.map((f, idx) => (
                          <span key={idx} className="chip">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pod Karşılaştırması */}
              <div>
                <h4 style={{ fontSize: 13, marginBottom: 8 }}>Pod Değişiklikleri</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      Pod Sayısı Değişimi
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                      {comparison.differences.podCountDiff > 0 ? "+" : ""}
                      {comparison.differences.podCountDiff}
                    </div>
                    {comparison.differences.prodPodCountDiff !== 0 && (
                      <div className="muted" style={{ fontSize: 10 }}>
                        Prod: {comparison.differences.prodPodCountDiff > 0 ? "+" : ""}
                        {comparison.differences.prodPodCountDiff}
                      </div>
                    )}
                  </div>

                  {comparison.differences.newPods.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        ➕ Yeni Pod'lar ({comparison.differences.newPods.length})
                      </div>
                      <div style={{ fontSize: 11, maxHeight: 100, overflowY: "auto" }}>
                        {comparison.differences.newPods.slice(0, 5).map((p, idx) => (
                          <div key={idx} style={{ marginBottom: 2 }}>
                            {p.namespace}/{p.name}
                          </div>
                        ))}
                        {comparison.differences.newPods.length > 5 && (
                          <div className="muted">+{comparison.differences.newPods.length - 5} daha</div>
                        )}
                      </div>
                    </div>
                  )}

                  {comparison.differences.removedPods.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                        ➖ Kaldırılan Pod'lar ({comparison.differences.removedPods.length})
                      </div>
                      <div style={{ fontSize: 11, maxHeight: 100, overflowY: "auto" }}>
                        {comparison.differences.removedPods.slice(0, 5).map((p, idx) => (
                          <div key={idx} style={{ marginBottom: 2 }}>
                            {p.namespace}/{p.name}
                          </div>
                        ))}
                        {comparison.differences.removedPods.length > 5 && (
                          <div className="muted">+{comparison.differences.removedPods.length - 5} daha</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const image1Param = ctx.query.image1 as string | undefined;
  const image2Param = ctx.query.image2 as string | undefined;

  if (!image1Param || !image2Param) {
    return {
      props: {},
    };
  }

  try {
    const [image1, image2, comparison] = await Promise.all([
      fetchImage(decodeURIComponent(image1Param)).catch(() => null),
      fetchImage(decodeURIComponent(image2Param)).catch(() => null),
      compareImages(
        decodeURIComponent(image1Param),
        decodeURIComponent(image2Param)
      ).catch(() => null),
    ]);

    if (!image1 || !image2) {
      return {
        props: {
          image1Name: image1Param,
          image2Name: image2Param,
          error: "Bir veya her iki image bulunamadı.",
        },
      };
    }

    return {
      props: {
        image1Name: image1Param,
        image2Name: image2Param,
        image1,
        image2,
        comparison,
      },
    };
  } catch (e: any) {
    return {
      props: {
        image1Name: image1Param,
        image2Name: image2Param,
        error: e.message || "Karşılaştırma yapılamadı.",
      },
    };
  }
};

