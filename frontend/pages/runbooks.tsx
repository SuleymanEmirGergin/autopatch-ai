import Head from "next/head";
import { GetServerSideProps } from "next";
import MainLayout from "../components/MainLayout";

interface RunbookMapping {
  riskFactor: string;
  url: string;
  description?: string;
}

export interface Props {
  runbooks: RunbookMapping[] | null;
  error?: string;
}

export default function RunbooksPage({ runbooks, error }: Props) {
  return (
    <MainLayout>
      <Head>
        <title>Runbooks - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Runbooks</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Runbook URLs mapped to risk factors
        </p>

        {error && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155", color: "#EF4444" }}>
            Error: {error}
          </div>
        )}

        {!error && runbooks && runbooks.length > 0 && (
          <div style={{ display: "grid", gap: "16px" }}>
            {runbooks.map((runbook, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#1E293B",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, marginBottom: "8px" }}>{runbook.riskFactor}</h3>
                    {runbook.description && (
                      <div style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "12px" }}>{runbook.description}</div>
                    )}
                    <a
                      href={runbook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#60A5FA",
                        textDecoration: "none",
                        fontSize: "13px",
                        wordBreak: "break-all",
                      }}
                    >
                      {runbook.url} →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!error && (!runbooks || runbooks.length === 0) && (
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "40px", border: "1px solid #334155", textAlign: "center", color: "#9CA3AF" }}>
            No runbook mappings found
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const { fetchRunbookMappings } = await import("../lib/api");
    const runbooks = await fetchRunbookMappings();
    return { props: { runbooks } };
  } catch (error: any) {
    console.error("Error fetching runbooks:", error);
    return { props: { runbooks: null, error: error.message || "Failed to fetch runbooks" } };
  }
};
