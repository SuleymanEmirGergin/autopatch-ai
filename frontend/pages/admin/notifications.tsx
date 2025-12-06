import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchActiveNotifications,
  acknowledgeNotification,
  dismissNotification,
  NotificationGroup,
  NotificationType,
  AnomalySeverity,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    RISK_DETECTED: "Risk Tespiti",
    ANOMALY_DETECTED: "Anomali",
    BUDGET_EXCEEDED: "Budget Aşımı",
    SCAN_COMPLETE: "Scan Tamamlandı",
    CVE_DETECTED: "CVE Tespiti",
    ALERT_TRIGGERED: "Alert Tetiklendi",
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<NotificationType | "ALL">("ALL");
  const [filterSeverity, setFilterSeverity] = useState<AnomalySeverity | "ALL">("ALL");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const severity = filterSeverity !== "ALL" ? filterSeverity : undefined;
      const data = await fetchActiveNotifications(severity);
      setNotifications(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Bildirimler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Bildirim onaylanamaz.");
      return;
    }
    try {
      await acknowledgeNotification(id);
      await loadNotifications();
    } catch (e: any) {
      setError(e.message || "Bildirim onaylanamadı.");
    }
  };

  const handleDismiss = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Bildirim reddedilemez.");
      return;
    }
    try {
      await dismissNotification(id);
      await loadNotifications();
    } catch (e: any) {
      setError(e.message || "Bildirim reddedilemedi.");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== "ALL" && n.type !== filterType) return false;
    if (filterSeverity !== "ALL" && n.severity !== filterSeverity) return false;
    return true;
  });

  const notificationTypes: NotificationType[] = [
    "RISK_DETECTED",
    "ANOMALY_DETECTED",
    "BUDGET_EXCEEDED",
    "SCAN_COMPLETE",
    "CVE_DETECTED",
    "ALERT_TRIGGERED",
  ];

  return (
    <div className="layout">
      <Head>
        <title>Bildirim Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Bildirim Yönetimi</div>
          <span className="badge badge-medium" style={{ fontSize: 11 }}>
            {filteredNotifications.length} aktif
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadNotifications}>
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
              onChange={(e) => {
                setFilterType(e.target.value as NotificationType | "ALL");
                loadNotifications();
              }}
              style={{ fontSize: 12 }}
            >
              <option value="ALL">Tümü</option>
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {getNotificationTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12, marginRight: 8 }}>Severity:</span>
            <select
              className="select"
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value as AnomalySeverity | "ALL");
                loadNotifications();
              }}
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

        {!loading && filteredNotifications.length === 0 && (
          <p className="muted">
            {notifications.length === 0
              ? "Henüz bildirim yok."
              : "Filtre kriterlerine uygun bildirim bulunamadı."}
          </p>
        )}

        {!loading && filteredNotifications.length > 0 && (
          <div className="grid">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className="card"
                style={{
                  borderLeft: `4px solid ${getSeverityColor(notification.severity)}`,
                  opacity: notification.acknowledged ? 0.7 : 1,
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
                      {notification.title}
                      {notification.count > 1 && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>
                          ({notification.count}x tekrarlandı)
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      {notification.summary}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span
                      className={`badge badge-${notification.severity.toLowerCase()}`}
                      style={{ fontSize: 10 }}
                    >
                      {notification.severity}
                    </span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 9,
                        backgroundColor: "#374151",
                      }}
                    >
                      {getNotificationTypeLabel(notification.type)}
                    </span>
                  </div>
                </div>

                {notification.affectedImages && notification.affectedImages.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      Etkilenen Image'ler ({notification.affectedImages.length}):
                    </div>
                    <div className="chips">
                      {notification.affectedImages.slice(0, 5).map((imageName, idx) => (
                        <Link key={idx} href={`/images/${encodeURIComponent(imageName)}`}>
                          <span className="chip" style={{ fontSize: 10, cursor: "pointer" }}>
                            {imageName.length > 30 ? `${imageName.substring(0, 30)}...` : imageName}
                          </span>
                        </Link>
                      ))}
                      {notification.affectedImages.length > 5 && (
                        <span className="chip muted" style={{ fontSize: 10 }}>
                          +{notification.affectedImages.length - 5} daha
                        </span>
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
                    İlk: {new Date(notification.firstOccurredAt).toLocaleString()} • Son: {new Date(notification.lastOccurredAt).toLocaleString()}
                  </div>
                  {!IS_READONLY && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {!notification.acknowledged && (
                        <button
                          className="button button-secondary"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                          onClick={() => handleAcknowledge(notification._id)}
                        >
                          Onayla
                        </button>
                      )}
                      {!notification.dismissed && (
                        <button
                          className="button button-secondary"
                          style={{ fontSize: 11, padding: "4px 8px", backgroundColor: "#6b7280" }}
                          onClick={() => handleDismiss(notification._id)}
                        >
                          Reddet
                        </button>
                      )}
                    </div>
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

