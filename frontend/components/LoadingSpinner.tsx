import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  text,
  fullScreen = false,
}) => {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];

  const spinner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: fullScreen ? 48 : 24,
        ...(fullScreen && {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--bg-primary)",
          zIndex: 9999,
        }),
      }}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid var(--border-color)`,
          borderTop: `3px solid var(--accent)`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {text && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {text}
        </p>
      )}
    </div>
  );

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      {spinner}
    </>
  );
};

