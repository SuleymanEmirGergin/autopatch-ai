import Head from "next/head";
import { GetServerSideProps } from "next";
import MainLayout from "../components/MainLayout";

export default function ComputerVisionPage() {
  return (
    <MainLayout>
      <Head>
        <title>Computer Vision - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Computer Vision</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Analyze container images using computer vision
        </p>

        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
          Computer vision features coming soon
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
