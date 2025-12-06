import Head from "next/head";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { fetchImages, ImageRisk } from "../../lib/api";
import { countProdPods } from "../index";

interface Props {
  images: ImageRisk[];
}

export default function ProdReport({ images }: Props) {
  const prodCritical = images.filter((img) => {
    const { prod } = countProdPods(img);
    return prod > 0 && (img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL");
  });

  return (
    <div className="layout">
      <Head>
        <title>Prod Risk Raporu - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Prod Risk Raporu</div>
        <Link href="/">
          <button className="button button-secondary">Dashboard&apos;a dön</button>
        </Link>
      </header>

      <main className="container">
        {prodCritical.length === 0 && (
          <p className="muted">
            Prod ortamında HIGH/CRITICAL seviyede riskli image bulunmuyor.
          </p>
        )}

        {prodCritical.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                <th style={{ textAlign: "left", padding: "8px 4px" }}>
                  Image
                </th>
                <th style={{ textAlign: "left", padding: "8px 4px" }}>
                  Risk
                </th>
                <th style={{ textAlign: "left", padding: "8px 4px" }}>
                  Prod Pods
                </th>
                <th style={{ textAlign: "left", padding: "8px 4px" }}>
                  Son Tarama
                </th>
              </tr>
            </thead>
            <tbody>
              {prodCritical.map((img) => {
                const { prod } = countProdPods(img);
                return (
                  <tr
                    key={img._id}
                    style={{ borderBottom: "1px solid #111827" }}
                  >
                    <td style={{ padding: "8px 4px" }}>
                      <Link
                        href={`/images/${encodeURIComponent(img.imageName)}`}
                      >
                        {img.imageName}
                      </Link>
                    </td>
                    <td style={{ padding: "8px 4px" }}>
                      {img.riskScore} ({img.riskLevel})
                    </td>
                    <td style={{ padding: "8px 4px" }}>{prod}</td>
                    <td style={{ padding: "8px 4px" }}>
                      {new Date(img.lastScannedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const images = await fetchImages();
  // riskScore'a göre sıralayıp gönderelim
  const sorted = [...images].sort((a, b) => b.riskScore - a.riskScore);
  return { props: { images: sorted } };
};


