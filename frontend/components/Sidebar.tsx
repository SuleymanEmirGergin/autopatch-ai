import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import Logo from "./Logo";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  section?: string;
}

const navItems: NavItem[] = [
  // Main
  { label: "Overview", href: "/overview", icon: "📊", section: "main" },
  { label: "Clusters & Pods", href: "/clusters", icon: "🖥️", section: "main" },
  { label: "Images & Risk", href: "/images-risk", icon: "🖼️", section: "main" },
  { label: "Repositories", href: "/repositories", icon: "📦", section: "main" },
  { label: "Scan Runs", href: "/scan-runs", icon: "▶️", section: "main" },
  { label: "Compliance", href: "/compliance-new", icon: "🛡️", section: "main" },
  
  // Reports
  { label: "Reports", href: "/reports", icon: "📄", section: "reports" },
  { label: "Scheduled Reports", href: "/scheduled-reports", icon: "📅", section: "reports" },
  { label: "Report Templates", href: "/report-templates", icon: "📋", section: "reports" },
  { label: "Report History", href: "/report-history", icon: "📚", section: "reports" },
  
  // AI & Analytics
  { label: "AI Dashboard", href: "/ai-dashboard", icon: "🤖", section: "ai" },
  { label: "Recommendations", href: "/recommendations", icon: "💡", section: "ai" },
  { label: "Anomalies", href: "/anomalies", icon: "🔍", section: "ai" },
  { label: "Dependency Graph", href: "/dependency-graph", icon: "🕸️", section: "ai" },
  { label: "Image Comparison", href: "/image-comparison", icon: "⚖️", section: "ai" },
  
  // Remediation
  { label: "Remediation Scripts", href: "/remediation-scripts", icon: "🔧", section: "remediation" },
  { label: "Auto Actions", href: "/auto-actions", icon: "⚡", section: "remediation" },
  { label: "Risk Budgets", href: "/risk-budgets", icon: "💰", section: "remediation" },
  
  // Security
  { label: "SBOM", href: "/sbom", icon: "📋", section: "security" },
  { label: "Scorecard", href: "/scorecard", icon: "⭐", section: "security" },
  { label: "Custom Rules", href: "/custom-rules", icon: "📐", section: "security" },
  { label: "Allowlist", href: "/allowlist", icon: "✅", section: "security" },
  { label: "Alert Rules", href: "/alert-rules", icon: "🚨", section: "security" },
  
  // Integrations
  { label: "Alerts & Notifications", href: "/alerts", icon: "🔔", section: "integrations" },
  { label: "Webhooks", href: "/webhooks", icon: "🔗", section: "integrations" },
  { label: "Jira Integration", href: "/jira", icon: "🎫", section: "integrations" },
  { label: "Widgets", href: "/widgets", icon: "🎨", section: "integrations" },
  { label: "Runbooks", href: "/runbooks", icon: "📖", section: "integrations" },
  
  // Admin
  { label: "API Tokens", href: "/api-tokens", icon: "🔑", section: "admin" },
  { label: "Audit Logs", href: "/audit-logs", icon: "📝", section: "admin" },
  { label: "Bulk Operations", href: "/bulk-operations", icon: "📦", section: "admin" },
  { label: "Image Creation", href: "/image-creation", icon: "➕", section: "admin" },
  
  // Advanced
  { label: "IoT Features", href: "/iot", icon: "🌐", section: "advanced" },
  { label: "Computer Vision", href: "/computer-vision", icon: "👁️", section: "advanced" },
  
  // Settings
  { label: "Settings", href: "/settings-new", icon: "⚙️", section: "settings" },
  
  // Demo
  { label: "Demo Rehberi", href: "/demo-guide", icon: "🎬", section: "settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        width: isCollapsed ? "80px" : "240px",
        height: "100vh",
        backgroundColor: "#1A202C",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1000,
        transition: "width 0.3s ease",
        borderRight: "1px solid #2D3748",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          borderBottom: "1px solid #2D3748",
        }}
      >
        <Logo collapsed={isCollapsed} size="medium" />
      </div>

      {/* Navigation Items */}
      <nav
        style={{
          flex: 1,
          padding: "16px 0",
          overflowY: "auto",
        }}
      >
        {(() => {
          const sections: { [key: string]: NavItem[] } = {};
          navItems.forEach(item => {
            const section = item.section || "main";
            if (!sections[section]) sections[section] = [];
            sections[section].push(item);
          });

          const sectionLabels: { [key: string]: string } = {
            main: "",
            reports: "Reports",
            ai: "AI & Analytics",
            remediation: "Remediation",
            security: "Security",
            integrations: "Integrations",
            admin: "Admin",
            advanced: "Advanced",
            settings: "Settings",
          };

          return Object.entries(sections).map(([sectionKey, items]) => (
            <div key={sectionKey}>
              {!isCollapsed && sectionLabels[sectionKey] && (
                <div
                  style={{
                    padding: "8px 20px",
                    marginTop: sectionKey !== "main" ? "16px" : "0",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#718096",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {sectionLabels[sectionKey]}
                </div>
              )}
              {items.map((item) => {
                const isActive = router.pathname === item.href || 
                  (item.href !== "/overview" && router.pathname.startsWith(item.href));
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      style={{
                        padding: "12px 20px",
                        margin: "4px 12px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        backgroundColor: isActive ? "#2563eb" : "transparent",
                        color: isActive ? "white" : "#CBD5E0",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#2D3748";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "4px",
                            height: "60%",
                            backgroundColor: "#60A5FA",
                            borderRadius: "0 4px 4px 0",
                          }}
                        />
                      )}
                      <span style={{ fontSize: "20px", flexShrink: 0 }}>{item.icon}</span>
                      {!isCollapsed && (
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ));
        })()}
      </nav>
    </div>
  );
}
