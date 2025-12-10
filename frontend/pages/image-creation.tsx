import Head from "next/head";
import { GetServerSideProps } from "next";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

export default function ImageCreationPage() {
  const [imageName, setImageName] = useState("");
  const [isBulk, setIsBulk] = useState(false);
  const [bulkImages, setBulkImages] = useState("");

  return (
    <MainLayout>
      <Head>
        <title>Image Creation - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Image Creation</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Create new container images or add existing ones to the system
        </p>

        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", maxWidth: "600px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isBulk}
                onChange={(e) => setIsBulk(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ color: "#CBD5E0", fontSize: "14px" }}>Bulk creation (one image per line)</span>
            </label>
          </div>

          {!isBulk ? (
            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Image Name</label>
              <input
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="e.g., nginx:latest"
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  marginBottom: "16px",
                }}
              />
            </div>
          ) : (
            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "12px", marginBottom: "8px" }}>Image Names (one per line)</label>
              <textarea
                value={bulkImages}
                onChange={(e) => setBulkImages(e.target.value)}
                placeholder="nginx:latest&#10;redis:7&#10;postgres:14"
                rows={10}
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  marginBottom: "16px",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </div>
          )}

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
              width: "100%",
            }}
            disabled={!isBulk && !imageName || isBulk && !bulkImages}
          >
            {isBulk ? "Create Images" : "Create Image"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
