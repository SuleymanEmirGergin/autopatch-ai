import Head from "next/head";
import MainLayout from "../components/MainLayout";

export default function CompliancePage() {
  const frameworks = [
    {
      name: "PCI-DSS",
      status: "At Risk",
      percentage: 70,
      color: "#FB923C",
      controls: [
        { name: "Secure Configuration", id: "2.2.2", status: "High Failing", severity: "Critical" },
        { name: "Patch Management", id: "6.2", status: "Critical Failing", severity: "Critical" },
        { name: "Security Parameters", id: "2.2.4", status: "Medium Partial", severity: "Medium" },
        { name: "Audit Logs", id: "10.2.3", status: "Low Passing", severity: "Low" },
        { name: "Multi-factor Authentication", id: "8.2.5", status: "Low Passing", severity: "Low" },
      ],
    },
    {
      name: "SOC2",
      status: "Partial",
      percentage: 55,
      color: "#DC2626",
      controls: [
        { name: "Logical Access Controls", id: "CC6.1", status: "High Failing", severity: "High" },
        { name: "Authentication", id: "CC6.1", status: "Medium Partial", severity: "Medium" },
        { name: "System Monitoring", id: "CC7.2", status: "Low Passing", severity: "Low" },
        { name: "Access Removal", id: "CC6.7", status: "High Failing", severity: "High" },
        { name: "Control Activities", id: "CC4.1", status: "Medium Partial", severity: "Medium" },
      ],
    },
    {
      name: "ISO27001",
      status: "Compliant",
      percentage: 85,
      color: "#059669",
      controls: [
        { name: "Technical Vulnerabilities", id: "A.12.6.1", status: "Medium Partial", severity: "Medium" },
        { name: "Privileged Access", id: "A.9.2.3", status: "Low Passing", severity: "Low" },
        { name: "Event Logging", id: "A.12.4.1", status: "Low Passing", severity: "Low" },
        { name: "Information Access", id: "A.9.4.1", status: "Low Passing", severity: "Low" },
        { name: "Software Installation", id: "A.12.6.2", status: "Low Passing", severity: "Low" },
      ],
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>Compliance - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Compliance</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Monitor compliance status across security frameworks
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {frameworks.map((framework, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#1E293B",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "2px solid #2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#2563eb",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 600 }}>{framework.name}</div>
                  <div style={{ fontSize: "12px", color: framework.color }}>{framework.status}</div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "24px", fontWeight: 600 }}>{framework.percentage}%</span>
                  <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Compliant</span>
                </div>
                <div
                  style={{
                    height: "8px",
                    backgroundColor: "#1F2937",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${framework.percentage}%`,
                      height: "100%",
                      backgroundColor: framework.color,
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Control Status</div>
                {framework.controls.map((control, cIdx) => (
                  <div
                    key={cIdx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 0",
                      borderBottom: cIdx < framework.controls.length - 1 ? "1px solid #334155" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor:
                          control.severity === "Critical" || control.severity === "High"
                            ? "#DC2626"
                            : control.severity === "Medium"
                            ? "#FB923C"
                            : "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "10px",
                        flexShrink: 0,
                      }}
                    >
                      {control.severity === "Critical" || control.severity === "High" ? "✕" : control.severity === "Medium" ? "!" : "✓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px" }}>{control.name}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{control.id}</div>
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 500,
                        backgroundColor:
                          control.status.includes("Failing")
                            ? "#FEE2E2"
                            : control.status.includes("Partial")
                            ? "#FEF3C7"
                            : "#D1FAE5",
                        color:
                          control.status.includes("Failing")
                            ? "#DC2626"
                            : control.status.includes("Partial")
                            ? "#D97706"
                            : "#059669",
                      }}
                    >
                      {control.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
