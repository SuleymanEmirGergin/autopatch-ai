import Head from "next/head";
import { useState } from "react";
import MainLayout from "../components/MainLayout";

export default function SettingsPage() {
  const [defaultEnv, setDefaultEnv] = useState("Production");
  const [timezone, setTimezone] = useState("UTC (Coordinated Universal Time)");
  const [language, setLanguage] = useState("English");
  const [autoScan, setAutoScan] = useState("Every hour");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState("security@company.com");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://api.example.com/webhook");
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [slackChannel, setSlackChannel] = useState("#security-alerts");
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamsChannel, setTeamsChannel] = useState("Security Team");

  return (
    <MainLayout>
      <Head>
        <title>Settings - AutoPatch AI</title>
      </Head>

      <div style={{ color: "white" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "8px" }}>Settings</h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px" }}>
          Configure application preferences and integrations
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* General Settings */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>General</h3>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                Default Environment
              </label>
              <select
                value={defaultEnv}
                onChange={(e) => setDefaultEnv(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option>Production</option>
                <option>Staging</option>
                <option>Development</option>
              </select>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                Default environment to display on dashboard load
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                🕐 Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option>UTC (Coordinated Universal Time)</option>
                <option>Europe/Istanbul</option>
                <option>America/New_York</option>
              </select>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                All timestamps will be displayed in this timezone
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                A Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option>English</option>
                <option>Turkish</option>
              </select>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                Interface language preference
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                Auto-scan Frequency
              </label>
              <select
                value={autoScan}
                onChange={(e) => setAutoScan(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#2D3748",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option>Every hour</option>
                <option>Every 6 hours</option>
                <option>Every 12 hours</option>
                <option>Every 24 hours</option>
              </select>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                How often to automatically scan clusters and images
              </div>
            </div>
          </div>

          {/* Notifications & Integrations */}
          <div style={{ backgroundColor: "#1E293B", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Notifications & Integrations</h3>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                ✉️ Email Notifications
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  disabled={!emailEnabled}
                  style={{
                    flex: 1,
                    backgroundColor: emailEnabled ? "#2D3748" : "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: emailEnabled ? "white" : "#6B7280",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: emailEnabled ? "#2563eb" : "#6B7280",
                      borderRadius: "24px",
                      transition: "0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: emailEnabled ? "22px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Receive critical alerts and scan summaries via email
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                🔗 Webhook
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={!webhookEnabled}
                  style={{
                    flex: 1,
                    backgroundColor: webhookEnabled ? "#2D3748" : "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: webhookEnabled ? "white" : "#6B7280",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: webhookEnabled ? "#2563eb" : "#6B7280",
                      borderRadius: "24px",
                      transition: "0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: webhookEnabled ? "22px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                POST alerts to custom webhook endpoint
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                💬 Slack Integration
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  disabled={!slackEnabled}
                  style={{
                    flex: 1,
                    backgroundColor: slackEnabled ? "#2D3748" : "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: slackEnabled ? "white" : "#6B7280",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={slackEnabled}
                    onChange={(e) => setSlackEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: slackEnabled ? "#2563eb" : "#6B7280",
                      borderRadius: "24px",
                      transition: "0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: slackEnabled ? "22px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Send alerts to Slack workspace channel
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                💬 Microsoft Teams
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={teamsChannel}
                  onChange={(e) => setTeamsChannel(e.target.value)}
                  disabled={!teamsEnabled}
                  style={{
                    flex: 1,
                    backgroundColor: teamsEnabled ? "#2D3748" : "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: teamsEnabled ? "white" : "#6B7280",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "44px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={teamsEnabled}
                    onChange={(e) => setTeamsEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: teamsEnabled ? "#2563eb" : "#6B7280",
                      borderRadius: "24px",
                      transition: "0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: teamsEnabled ? "22px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Send alerts to Microsoft Teams channel
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <button
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
