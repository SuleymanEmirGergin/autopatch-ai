import Head from "next/head";
import { GetServerSideProps } from "next";
import MainLayout from "../components/MainLayout";

export default function IoTPage() {
  return (
    <MainLayout>
      <Head>
        <title>IoT Features - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>IoT Features</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Scan and manage IoT device container images
        </p>

        <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
          IoT features coming soon
        </div>
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
