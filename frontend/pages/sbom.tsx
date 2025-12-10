import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";
import Link from "next/link";

interface SBOMEntry {
  imageName: string;
  totalPackages: number;
  vulnerablePackages: number;
  criticalCVEs: number;
  highCVEs: number;
  mediumCVEs: number;
  lowCVEs: number;
  lastScanned?: string;
}

export interface Props {
  sboms: SBOMEntry[] | null;
  error?: string;
}

export default function SBOMPage({ sboms, error }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = sboms?.filter(sbom =>
    sbom.imageName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <MainLayout>
      <Head>
        <title>SBOM - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>SBOM (Software Bill of Materials)</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          View software components and vulnerabilities for container images
        </p>

        {/* Search */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search images..."
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
            No SBOM data found
          </div>
        )}

        {!error && filtered.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {filtered.map((sbom, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/images/${encodeURIComponent(sbom.imageName)}`}>
                      <a style={{ color: "#60A5FA", textDecoration: "none", fontWeight: 600, fontSize: "16px", marginBottom: "8px", display: "block" }}>
                        {sbom.imageName}
                      </a>
                    </Link>
                    {sbom.lastScanned && (
                      <div style={{ color: "#9CA3AF", fontSize: "12px" }}>
                        Last scanned: {new Date(sbom.lastScanned).toLocaleString()}
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
                      fontSize: "13px",
                    }}
                  >
                    View Details
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Total Packages</div>
                    <div style={{ fontSize: "24px", fontWeight: 600 }}>{sbom.totalPackages}</div>
                  </div>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Vulnerable</div>
                    <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{sbom.vulnerablePackages}</div>
                  </div>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Critical CVEs</div>
                    <div style={{ fontSize: "24px", fontWeight: 600, color: "#DC2626" }}>{sbom.criticalCVEs}</div>
                  </div>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>High CVEs</div>
                    <div style={{ fontSize: "24px", fontWeight: 600, color: "#EF4444" }}>{sbom.highCVEs}</div>
                  </div>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Medium CVEs</div>
                    <div style={{ fontSize: "24px", fontWeight: 600, color: "#F59E0B" }}>{sbom.mediumCVEs}</div>
                  </div>
                  <div style={{ backgroundColor: "#0F172A", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px" }}>Low CVEs</div>
                    <div style={{ fontSize: "24px", fontWeight: 600, color: "#10B981" }}>{sbom.lowCVEs}</div>
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
    const { fetchImages } = await import("../lib/api");
    const images = await fetchImages();
    const sboms: SBOMEntry[] = [];
    
    // Her image için SBOM bilgilerini topla (ilk 20 image)
    for (const image of images.slice(0, 20)) {
      try {
        const { fetchSBOM } = await import("../lib/api");
        const sbom = await fetchSBOM(image.imageName);
        sboms.push({
          imageName: image.imageName,
          totalPackages: sbom.packages?.length || 0,
          vulnerablePackages: sbom.vulnerabilities?.length || 0,
          criticalCVEs: sbom.vulnerabilities?.filter((v: any) => v.severity === "CRITICAL").length || 0,
          highCVEs: sbom.vulnerabilities?.filter((v: any) => v.severity === "HIGH").length || 0,
          mediumCVEs: sbom.vulnerabilities?.filter((v: any) => v.severity === "MEDIUM").length || 0,
          lowCVEs: sbom.vulnerabilities?.filter((v: any) => v.severity === "LOW").length || 0,
          lastScanned: sbom.lastScannedAt,
        });
      } catch (err) {
        // SBOM yoksa devam et
        console.warn(`No SBOM for ${image.imageName}`);
      }
    }
    
    return { props: { sboms } };
  } catch (error: any) {
    console.error("Error fetching SBOMs:", error);
    return { props: { sboms: null, error: error.message || "Failed to fetch SBOMs" } };
  }
};
