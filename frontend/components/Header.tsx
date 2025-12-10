import { useState } from "react";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      style={{
        height: "64px",
        backgroundColor: "#1A202C",
        borderBottom: "1px solid #2D3748",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "fixed",
        top: 0,
        left: "240px",
        right: 0,
        zIndex: 999,
      }}
    >
      {/* Left: Environment Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <select
          style={{
            backgroundColor: "#2D3748",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "8px 32px 8px 12px",
            color: "white",
            fontSize: "14px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="dev">Development</option>
        </select>
      </div>

      {/* Center: Search Bar */}
      <div
        style={{
          flex: 1,
          maxWidth: "500px",
          margin: "0 24px",
          position: "relative",
        }}
      >
        <input
          type="text"
          placeholder="Search clusters, images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "#2D3748",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "8px 12px 8px 36px",
            color: "white",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
          }}
        >
          🔍
        </span>
      </div>

      {/* Right: Notifications & User */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Notifications */}
        <div
          style={{
            position: "relative",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#2D3748";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ fontSize: "20px" }}>🔔</span>
          <div
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              backgroundColor: "#EF4444",
              borderRadius: "50%",
            }}
          />
        </div>

        {/* User Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: "6px",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#2D3748";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#8B5CF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            SE
          </div>
          <span style={{ color: "white", fontSize: "14px" }}>
            Security Engineer
          </span>
        </div>
      </div>
    </div>
  );
}
