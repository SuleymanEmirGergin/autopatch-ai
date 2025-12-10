import Head from "next/head";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

interface JiraTicket {
  imageName: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  pods: { namespace: string; name: string }[];
  summary?: string;
  description?: string;
}

export default function JiraPage() {
  const [formData, setFormData] = useState<JiraTicket>({
    imageName: "",
    riskScore: 0,
    riskLevel: "Medium",
    riskFactors: [],
    pods: [],
    summary: "",
    description: "",
  });
  const [newRiskFactor, setNewRiskFactor] = useState("");
  const [newPodNamespace, setNewPodNamespace] = useState("");
  const [newPodName, setNewPodName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCreatedTicket(null);

    try {
      const response = await fetch("/api/jira/ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create Jira ticket");
      }

      const data = await response.json();
      setCreatedTicket(data);
      if (data.success) {
        setSuccess(`Jira ticket created successfully!`);
        setFormData({
          imageName: "",
          riskScore: 0,
          riskLevel: "Medium",
          riskFactors: [],
          pods: [],
          summary: "",
          description: "",
        });
        setNewRiskFactor("");
        setNewPodNamespace("");
        setNewPodName("");
      } else {
        throw new Error(data.error || "Failed to create ticket");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>Jira Integration - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Jira Integration</h1>
            <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
            Create Jira tickets for security issues and vulnerabilities. Required fields: Image Name, Risk Score, and Risk Level.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#1E293B",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #EF4444",
              color: "#EF4444",
              marginBottom: "24px",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

            {success && (
          <div
            style={{
              backgroundColor: "#1E293B",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #10B981",
              color: "#10B981",
              marginBottom: "24px",
            }}
          >
            <strong>Success:</strong> {success}
            {createdTicket?.ticketKey && (
              <div style={{ marginTop: "8px", fontSize: "14px" }}>
                Ticket Key: <strong>{createdTicket.ticketKey}</strong>
                {createdTicket.ticketUrl && (
                  <div style={{ marginTop: "4px" }}>
                    <a
                      href={createdTicket.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#60A5FA", textDecoration: "underline" }}
                    >
                      Open in Jira
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            backgroundColor: "#1E293B",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid #334155",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "20px" }}>
              {/* Image Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#CBD5E0",
                  }}
                >
                  Image Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.imageName}
                  onChange={(e) => setFormData({ ...formData, imageName: e.target.value })}
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
                  }}
                />
              </div>

              {/* Risk Score & Risk Level */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#CBD5E0",
                    }}
                  >
                    Risk Score <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={formData.riskScore}
                    onChange={(e) => setFormData({ ...formData, riskScore: parseFloat(e.target.value) || 0 })}
                    placeholder="0-100"
                    style={{
                      width: "100%",
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

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#CBD5E0",
                    }}
                  >
                    Risk Level <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    required
                    value={formData.riskLevel}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#2D3748",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "white",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Risk Factors */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#CBD5E0",
                  }}
                >
                  Risk Factors
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    value={newRiskFactor}
                    onChange={(e) => setNewRiskFactor(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newRiskFactor.trim()) {
                          setFormData({
                            ...formData,
                            riskFactors: [...formData.riskFactors, newRiskFactor.trim()],
                          });
                          setNewRiskFactor("");
                        }
                      }
                    }}
                    placeholder="Add risk factor and press Enter"
                    style={{
                      flex: 1,
                      backgroundColor: "#2D3748",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "white",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRiskFactor.trim()) {
                        setFormData({
                          ...formData,
                          riskFactors: [...formData.riskFactors, newRiskFactor.trim()],
                        });
                        setNewRiskFactor("");
                      }
                    }}
                    style={{
                      backgroundColor: "#2563EB",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Add
                  </button>
                </div>
                {formData.riskFactors.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {formData.riskFactors.map((factor, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#0F172A",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#CBD5E0",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {factor}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              riskFactors: formData.riskFactors.filter((_, i) => i !== idx),
                            });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pods */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#CBD5E0",
                  }}
                >
                  Pods
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    value={newPodNamespace}
                    onChange={(e) => setNewPodNamespace(e.target.value)}
                    placeholder="Namespace"
                    style={{
                      backgroundColor: "#2D3748",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "white",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={newPodName}
                    onChange={(e) => setNewPodName(e.target.value)}
                    placeholder="Pod Name"
                    style={{
                      backgroundColor: "#2D3748",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "white",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPodNamespace.trim() && newPodName.trim()) {
                        setFormData({
                          ...formData,
                          pods: [
                            ...formData.pods,
                            { namespace: newPodNamespace.trim(), name: newPodName.trim() },
                          ],
                        });
                        setNewPodNamespace("");
                        setNewPodName("");
                      }
                    }}
                    style={{
                      backgroundColor: "#2563EB",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Add
                  </button>
                </div>
                {formData.pods.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {formData.pods.map((pod, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#0F172A",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#CBD5E0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          {pod.namespace}/{pod.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              pods: formData.pods.filter((_, i) => i !== idx),
                            });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: 0,
                            width: "20px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary (Optional) */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#CBD5E0",
                  }}
                >
                  Summary (Optional)
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Custom ticket summary (auto-generated if empty)"
                  style={{
                    width: "100%",
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

              {/* Description (Optional) */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#CBD5E0",
                  }}
                >
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Custom ticket description (auto-generated if empty)"
                  rows={4}
                  style={{
                    width: "100%",
                    backgroundColor: "#2D3748",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? "#4B5563" : "#2563EB",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "12px 24px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "Creating..." : "Create Jira Ticket"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div
          style={{
            backgroundColor: "#1E293B",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #334155",
            marginTop: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>About Jira Integration</h3>
          <div style={{ color: "#9CA3AF", fontSize: "14px", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "8px" }}>
              Create Jira tickets directly from AutoPatch AI to track security issues and vulnerabilities.
            </p>
            <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
              <li>Automatically link tickets to container images</li>
              <li>Include risk scores and risk factors</li>
              <li>Track affected pods and namespaces</li>
              <li>Auto-generate summaries and descriptions</li>
              <li>Configure Jira integration in Settings</li>
            </ul>
            <p style={{ marginTop: "12px", fontSize: "12px", color: "#6B7280" }}>
              Note: Jira integration must be configured in Settings before creating tickets.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
