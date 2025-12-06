import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchUnresolvedAnomalies,
  resolveAnomaly,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    RISK_SCORE_SPIKE: "Risk Skoru Artışı",
    RISK_SCORE_DROP: "Risk Skoru Düşüşü",
    NEW_RISK_FACTOR: "Yeni Risk Faktörü",
    POD_COUNT_INCREASE: "Pod Sayısı Artışı",
    CRITICAL_VULNERABILITY: "Kritik CVE",
    IMAGE_DELETED: "Image Silindi",
    UNUSUAL_NAMESPACE: "Alışılmadık Namespace",
  };
  return labels[type] || type;
}

function getSeverityColor(severity: AnomalySeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "#ef4444";
    case "HIGH":
      return "#f87171";
    case "MEDIUM":
      return "#fbbf24";
    case "LOW":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AnomalyType | "ALL">("ALL");
  const [filterSeverity, setFilterSeverity] = useState<AnomalySeverity | "ALL">("ALL");

  useEffect(() => {
    loadAnomalies();
  }, []);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      const data = await fetchUnresolvedAnomalies();
      setAnomalies(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Anomaliler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Anomali çözülemez.");
      return;
    }
    try {
      await resolveAnomaly(id);
      await loadAnomalies();
    } catch (e: any) {
      setError(e.message || "Anomali çözülemedi.");
    }
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (filterType !== "ALL" && a.anomalyType !== filterType) return false;
    if (filterSeverity !== "ALL" && a.severity !== filterSeverity) return false;
    return true;
  });

  const anomalyTypes: AnomalyType[] = [
    "RISK_SCORE_SPIKE",
    "RISK_SCORE_DROP",
    "NEW_RISK_FACTOR",
    "POD_COUNT_INCREASE",
    "CRITICAL_VULNERABILITY",
    "IMAGE_DELETED",
    "UNUSUAL_NAMESPACE",
  ];

  return (
    <div className="layout">
      <Head>
        <title>Anomali Tespiti - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Anomali Tespiti</div>
          <span className="badge badge-medium" style={{ fontSize: 11 }}>
            {filteredAnomalies.length} çözülmemiş
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadAnomalies}>
            Yenile
          </button>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {/* Filtreler */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <span className="muted" style={{ fontSize: 12, marginRight: 8 }}>Tip:</span>
            <select
              className="select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AnomalyType | "ALL")}
              style={{ fontSize: 12 }}
            >
              <option value="ALL">Tümü</option>
              {anomalyTypes.map((type) => (
                <option key={type} value={type}>
                  {getAnomalyTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12, marginRight: 8 }}>Severity:</span>
            <select
              className="select"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as AnomalySeverity | "ALL")}
              style={{ fontSize: 12 }}
            >
              <option value="ALL">Tümü</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        {loading && <p>Yükleniyor...</p>}

        {!loading && filteredAnomalies.length === 0 && (
          <p className="muted">
            {anomalies.length === 0
              ? "Henüz anomali tespit edilmedi."
              : "Filtre kriterlerine uygun anomali bulunamadı."}
          </p>
        )}

        {!loading && filteredAnomalies.length > 0 && (
          <div className="grid">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly._id}
                className="card"
                style={{
                  borderLeft: `4px solid ${getSeverityColor(anomaly.severity)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      <Link href={`/images/${encodeURIComponent(anomaly.imageName)}`}>
                        <a style={{ color: "#3b82f6", textDecoration: "none" }}>
                          {anomaly.imageName}
                        </a>
                      </Link>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      {anomaly.description}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span
                      className={`badge badge-${anomaly.severity.toLowerCase()}`}
                      style={{ fontSize: 10 }}
                    >
                      {anomaly.severity}
                    </span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 9,
                        backgroundColor: "#374151",
                      }}
                    >
                      {getAnomalyTypeLabel(anomaly.anomalyType)}
                    </span>
                  </div>
                </div>

                {(anomaly.previousValue !== undefined || anomaly.currentValue !== undefined) && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                      Değişiklik:
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {anomaly.previousValue !== undefined && (
                        <span className="muted">{anomaly.previousValue}</span>
                      )}
                      {anomaly.previousValue !== undefined && anomaly.currentValue !== undefined && (
                        <span style={{ margin: "0 8px" }}>→</span>
                      )}
                      {anomaly.currentValue !== undefined && (
                        <strong>{anomaly.currentValue}</strong>
                      )}
                      {anomaly.changePercentage !== undefined && (
                        <span
                          style={{
                            marginLeft: 8,
                            color: anomaly.changePercentage > 0 ? "#f87171" : "#10b981",
                            fontSize: 11,
                          }}
                        >
                          ({anomaly.changePercentage > 0 ? "+" : ""}
                          {anomaly.changePercentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {anomaly.riskFactors && anomaly.riskFactors.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      Risk Faktörleri:
                    </div>
                    <div className="chips">
                      {anomaly.riskFactors.map((factor, idx) => (
                        <span key={idx} className="chip" style={{ fontSize: 10 }}>
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {anomaly.affectedPods && anomaly.affectedPods.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      Etkilenen Pods ({anomaly.affectedPods.length}):
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {anomaly.affectedPods.slice(0, 5).map((pod, idx) => (
                        <div key={idx} style={{ marginBottom: 2 }}>
                          <span className="muted">{pod.namespace}</span> / {pod.name}
                        </div>
                      ))}
                      {anomaly.affectedPods.length > 5 && (
                        <div className="muted" style={{ fontSize: 10 }}>
                          +{anomaly.affectedPods.length - 5} daha fazla
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #374151",
                  }}
                >
                  <div className="muted" style={{ fontSize: 10 }}>
                    Tespit: {new Date(anomaly.detectedAt).toLocaleString()}
                  </div>
                  {!IS_READONLY && (
                    <button
                      className="button button-secondary"
                      style={{ fontSize: 11, padding: "4px 8px" }}
                      onClick={() => handleResolve(anomaly._id)}
                    >
                      Çözüldü Olarak İşaretle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

