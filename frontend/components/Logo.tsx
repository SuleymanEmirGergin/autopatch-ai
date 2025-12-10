import React from "react";

interface LogoProps {
  size?: "small" | "medium" | "large";
  collapsed?: boolean;
}

export default function Logo({ size = "medium", collapsed = false }: LogoProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "100%",
      }}
    >
      {collapsed ? (
        // Collapsed: Sadece ikon
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Daha temiz ağ yapısı ikonu */}
          <circle cx="16" cy="16" r="6" stroke="#A78BFA" strokeWidth="2" fill="none" />
          <circle cx="16" cy="16" r="10" stroke="#A78BFA" strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* Merkez noktalar - daha az ve daha büyük */}
          <circle cx="16" cy="10" r="1.5" fill="#A78BFA" />
          <circle cx="16" cy="22" r="1.5" fill="#A78BFA" />
          <circle cx="10" cy="16" r="1.5" fill="#A78BFA" />
          <circle cx="22" cy="16" r="1.5" fill="#A78BFA" />
          <circle cx="12.5" cy="12.5" r="1.5" fill="#A78BFA" />
          <circle cx="19.5" cy="12.5" r="1.5" fill="#A78BFA" />
          <circle cx="12.5" cy="19.5" r="1.5" fill="#A78BFA" />
          <circle cx="19.5" cy="19.5" r="1.5" fill="#A78BFA" />
        </svg>
      ) : (
        // Expanded: Logo + Text - daha temiz ve profesyonel
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          {/* Text - tek bir satır, daha iyi hizalama */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            {/* "Aut" kısmı */}
            <span
              style={{
                color: "#A78BFA",
                fontWeight: 700,
                fontSize: "20px",
                letterSpacing: "-0.3px",
                lineHeight: "1.2",
                position: "relative",
                display: "inline-block",
              }}
            >
              Aut
              {/* 'A' harfinin sol alt köşesindeki girinti - daha belirgin */}
              <span
                style={{
                  position: "absolute",
                  left: "-1px",
                  bottom: "1px",
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#1A202C",
                  clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
                }}
              />
            </span>
            
            {/* 'o' harfi yerine ikon - daha büyük ve daha iyi hizalı */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: "-2px",
                marginRight: "-2px",
                verticalAlign: "baseline",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginTop: "-2px",
                }}
              >
                {/* Daha temiz ve minimal ağ ikonu */}
                <circle cx="10" cy="10" r="4" stroke="#A78BFA" strokeWidth="1.8" fill="none" />
                <circle cx="10" cy="10" r="6.5" stroke="#A78BFA" strokeWidth="1.2" fill="none" opacity="0.5" />
                {/* Merkez noktalar - daha az ve daha büyük */}
                <circle cx="10" cy="5" r="1.2" fill="#A78BFA" />
                <circle cx="10" cy="15" r="1.2" fill="#A78BFA" />
                <circle cx="5" cy="10" r="1.2" fill="#A78BFA" />
                <circle cx="15" cy="10" r="1.2" fill="#A78BFA" />
                <circle cx="7" cy="7" r="1.2" fill="#A78BFA" />
                <circle cx="13" cy="7" r="1.2" fill="#A78BFA" />
                <circle cx="7" cy="13" r="1.2" fill="#A78BFA" />
                <circle cx="13" cy="13" r="1.2" fill="#A78BFA" />
              </svg>
            </span>
            
            {/* "patch" kısmı */}
            <span
              style={{
                color: "#6366F1",
                fontWeight: 700,
                fontSize: "20px",
                letterSpacing: "-0.3px",
                lineHeight: "1.2",
              }}
            >
              patch
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
