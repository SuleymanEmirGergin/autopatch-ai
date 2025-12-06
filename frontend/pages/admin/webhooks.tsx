import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchWebhookSubscriptions,
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  testWebhook,
  WebhookSubscription,
  WebhookEventType,
  CreateWebhookSubscriptionPayload,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const EVENT_TYPES: WebhookEventType[] = [
  "scan.complete",
  "scan.failed",
  "risk.new",
  "risk.updated",
  "anomaly.detected",
  "budget.exceeded",
  "cve.detected",
  "image.deleted",
  "*",
];

function getEventTypeLabel(type: WebhookEventType): string {
  const labels: Record<WebhookEventType, string> = {
    "scan.complete": "Scan Tamamlandı",
    "scan.failed": "Scan Başarısız",
    "risk.new": "Yeni Risk",
    "risk.updated": "Risk Güncellendi",
    "anomaly.detected": "Anomali Tespit Edildi",
    "budget.exceeded": "Budget Aşıldı",
    "cve.detected": "CVE Tespit Edildi",
    "image.deleted": "Image Silindi",
    "*": "Tüm Event'ler",
  };
  return labels[type] || type;
}

export default function WebhooksPage() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateWebhookSubscriptionPayload>({
    name: "",
    description: "",
    url: "",
    events: ["*"],
    secret: "",
    enabled: true,
    retryEnabled: true,
    maxRetries: 3,
    retryIntervalMs: 5000,
  });
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEventType>>(
    new Set(["*"])
  );

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await fetchWebhookSubscriptions();
      setSubscriptions(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Webhook subscription'lar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Webhook oluşturulamaz.");
      return;
    }

    try {
      const payload = {
        ...formData,
        events: Array.from(selectedEvents),
        secret: formData.secret || undefined,
      };
      await createWebhookSubscription(payload);
      await loadSubscriptions();
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        url: "",
        events: ["*"],
        secret: "",
        enabled: true,
        retryEnabled: true,
        maxRetries: 3,
        retryIntervalMs: 5000,
      });
      setSelectedEvents(new Set(["*"]));
    } catch (e: any) {
      setError(e.message || "Webhook oluşturulamadı.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Webhook silinemez.");
      return;
    }
    if (!confirm(`"${name}" webhook subscription'ını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteWebhookSubscription(id);
      await loadSubscriptions();
    } catch (e: any) {
      setError(e.message || "Webhook silinemedi.");
    }
  };

  const handleToggleEnabled = async (subscription: WebhookSubscription) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Webhook güncellenemez.");
      return;
    }
    try {
      await updateWebhookSubscription(subscription._id, {
        enabled: !subscription.enabled,
      });
      await loadSubscriptions();
    } catch (e: any) {
      setError(e.message || "Webhook güncellenemedi.");
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook(id);
      if (result.success) {
        alert("✅ Test webhook başarıyla gönderildi!");
      } else {
        alert(`❌ Test webhook gönderilemedi: ${result.message}`);
      }
    } catch (e: any) {
      alert(`❌ Hata: ${e.message}`);
    }
  };

  const toggleEvent = (event: WebhookEventType) => {
    const newSet = new Set(selectedEvents);
    if (event === "*") {
      // "*" seçildiğinde diğerlerini temizle
      if (newSet.has("*")) {
        newSet.delete("*");
      } else {
        newSet.clear();
        newSet.add("*");
      }
    } else {
      // Diğer event'ler seçildiğinde "*"ı kaldır
      newSet.delete("*");
      if (newSet.has(event)) {
        newSet.delete(event);
      } else {
        newSet.add(event);
      }
    }
    setSelectedEvents(newSet);
  };

  return (
    <div className="layout">
      <Head>
        <title>Webhook Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Webhook Yönetimi</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadSubscriptions}>
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

        {!IS_READONLY && (
          <div style={{ marginBottom: 16 }}>
            <button className="button" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Formu Kapat" : "Yeni Webhook Subscription Oluştur"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Webhook Subscription</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  İsim *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Açıklama
                </label>
                <textarea
                  className="input"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Webhook URL *
                </label>
                <input
                  className="input"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://example.com/webhook"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Event Tipleri *
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EVENT_TYPES.map((event) => (
                    <label
                      key={event}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.has(event)}
                        onChange={() => toggleEvent(event)}
                      />
                      <span>{getEventTypeLabel(event)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Secret Key (HMAC signature için, opsiyonel)
                </label>
                <input
                  className="input"
                  type="password"
                  value={formData.secret || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, secret: e.target.value })
                  }
                  placeholder="Secret key (boş bırakılabilir)"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Max Retries
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) =>
                      setFormData({ ...formData, maxRetries: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Retry Interval (ms)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1000"
                    step="1000"
                    value={formData.retryIntervalMs}
                    onChange={(e) =>
                      setFormData({ ...formData, retryIntervalMs: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, enabled: e.target.checked })
                    }
                  />
                  <span className="muted">Aktif</span>
                </label>
              </div>

              <button type="submit" className="button">
                Oluştur
              </button>
            </form>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && subscriptions.length === 0 && (
          <p className="muted">Henüz webhook subscription tanımlanmamış.</p>
        )}

        {!loading && subscriptions.length > 0 && (
          <div className="grid">
            {subscriptions.map((subscription) => (
              <div
                key={subscription._id}
                className="card"
                style={{
                  borderLeft: subscription.enabled && subscription.active
                    ? "4px solid #10b981"
                    : subscription.enabled && !subscription.active
                    ? "4px solid #fbbf24"
                    : "4px solid #6b7280",
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
                      {subscription.name}
                      {!subscription.enabled && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                          (Devre Dışı)
                        </span>
                      )}
                      {subscription.enabled && !subscription.active && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12, color: "#fbbf24" }}>
                          (Inactive - Çok fazla başarısız delivery)
                        </span>
                      )}
                    </div>
                    {subscription.description && (
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        {subscription.description}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 11, wordBreak: "break-all" }}>
                      {subscription.url}
                    </div>
                  </div>
                  <span
                    className={`badge ${subscription.enabled && subscription.active ? "badge-low" : "badge-medium"}`}
                    style={{ fontSize: 10 }}
                  >
                    {subscription.enabled && subscription.active ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    Event Tipleri:
                  </div>
                  <div className="chips">
                    {subscription.events.map((event, idx) => (
                      <span key={idx} className="chip" style={{ fontSize: 10 }}>
                        {getEventTypeLabel(event)}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                    İstatistikler:
                  </div>
                  <div style={{ fontSize: 11 }}>
                    Toplam: {subscription.totalDeliveries} • Başarılı:{" "}
                    <span style={{ color: "#10b981" }}>
                      {subscription.successfulDeliveries}
                    </span>{" "}
                    • Başarısız:{" "}
                    <span style={{ color: "#f87171" }}>
                      {subscription.failedDeliveries}
                    </span>
                  </div>
                  {subscription.lastDeliveryAt && (
                    <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                      Son delivery: {new Date(subscription.lastDeliveryAt).toLocaleString()}{" "}
                      ({subscription.lastDeliveryStatus === "success" ? "✅" : "❌"})
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    className="button button-secondary"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => handleTest(subscription._id)}
                  >
                    Test Et
                  </button>
                  {!IS_READONLY && (
                    <>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleToggleEnabled(subscription)}
                      >
                        {subscription.enabled ? "Devre Dışı Bırak" : "Aktif Et"}
                      </button>
                      <button
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => handleDelete(subscription._id, subscription.name)}
                      >
                        Sil
                      </button>
                    </>
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

