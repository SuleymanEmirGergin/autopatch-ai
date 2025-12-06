import React from "react";

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  className,
}) => {
  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .skeleton {
          background: linear-gradient(
            90deg,
            var(--bg-tertiary) 0%,
            var(--bg-secondary) 50%,
            var(--bg-tertiary) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
          border-radius: ${typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius};
        }
      `}</style>
      <div
        className={`skeleton ${className || ""}`}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      />
    </>
  );
};

// Pre-built skeleton components
export const SkeletonCard: React.FC = () => (
  <div className="card">
    <SkeletonLoader width="60%" height={20} />
    <SkeletonLoader width="40%" height={16} />
    <SkeletonLoader width="80%" height={16} />
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <SkeletonLoader width={60} height={24} borderRadius={12} />
      <SkeletonLoader width={60} height={24} borderRadius={12} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 16,
          padding: "12px 0",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <SkeletonLoader height={16} />
        <SkeletonLoader height={16} />
        <SkeletonLoader height={16} />
        <SkeletonLoader height={16} />
      </div>
    ))}
  </div>
);

