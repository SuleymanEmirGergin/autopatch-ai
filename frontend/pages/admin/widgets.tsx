import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
  Widget,
  WidgetType,
  CreateWidgetPayload,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const WIDGET_TYPES: { value: WidgetType; label: string; description: string }[] = [
  { value: "STATS_CARD", label: "İstatistik Kartı", description: "Toplam image, HIGH/CRITICAL sayısı vb." },
  { value: "TOP_IMAGES_LIST", label: "En Riskli Image'ler", description: "En yüksek risk skoruna sahip image'lerin listesi" },
  { value: "RISK_CHART", label: "Risk Dağılım Grafiği", description: "Risk seviyelerine göre image dağılımı" },
  { value: "TREND_CHART", label: "Trend Grafiği", description: "Zaman içinde risk skoru trendi" },
  { value: "ANOMALIES_LIST", label: "Anomaliler Listesi", description: "Tespit edilen anomaliler" },
  { value: "RISK_BUDGET_STATUS", label: "Risk Budget Durumu", description: "Risk budget'ların durumu" },
];

function getWidgetTypeLabel(type: WidgetType): string {
  return WIDGET_TYPES.find((t) => t.value === type)?.label || type;
}

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateWidgetPayload>({
    name: "",
    type: "STATS_CARD",
    config: {
      title: "",
      size: "medium",
      refreshInterval: 30,
      limit: 10,
    },
    position: { x: 0, y: 0, w: 4, h: 3 },
    enabled: true,
    order: 0,
  });

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const data = await fetchWidgets();
      setWidgets(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Widget'lar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Widget oluşturulamaz.");
      return;
    }

    try {
      await createWidget(formData);
      await loadWidgets();
      setShowForm(false);
      setFormData({
        name: "",
        type: "STATS_CARD",
        config: {
          title: "",
          size: "medium",
          refreshInterval: 30,
          limit: 10,
        },
        position: { x: 0, y: 0, w: 4, h: 3 },
        enabled: true,
        order: 0,
      });
    } catch (e: any) {
      setError(e.message || "Widget oluşturulamadı.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Widget silinemez.");
      return;
    }
    if (!confirm(`"${name}" widget'ını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteWidget(id);
      await loadWidgets();
    } catch (e: any) {
      setError(e.message || "Widget silinemedi.");
    }
  };

  const handleToggleEnabled = async (widget: Widget) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Widget güncellenemez.");
      return;
    }
    try {
      await updateWidget(widget._id, { enabled: !widget.enabled });
      await loadWidgets();
    } catch (e: any) {
      setError(e.message || "Widget güncellenemedi.");
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Widget Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Widget Yönetimi</div>
          <span className="badge badge-medium" style={{ fontSize: 11 }}>
            {widgets.filter((w) => w.enabled).length} aktif
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadWidgets}>
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
              {showForm ? "Formu Kapat" : "Yeni Widget Oluştur"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Widget</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Widget Adı *
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
                  Widget Tipi *
                </label>
                <select
                  className="select"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as WidgetType })
                  }
                  required
                >
                  {WIDGET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Genişlik (Grid Units)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.position?.w || 4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        position: { ...formData.position!, w: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Yükseklik (Grid Units)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.position?.h || 3}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        position: { ...formData.position!, h: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Başlık (Opsiyonel)
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.config?.title || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, title: e.target.value },
                    })
                  }
                />
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

        {!loading && widgets.length === 0 && (
          <p className="muted">Henüz widget tanımlanmamış.</p>
        )}

        {!loading && widgets.length > 0 && (
          <div className="grid">
            {widgets.map((widget) => (
              <div
                key={widget._id}
                className="card"
                style={{
                  borderLeft: widget.enabled ? "4px solid #10b981" : "4px solid #6b7280",
                  opacity: widget.enabled ? 1 : 0.7,
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
                      {widget.name}
                      {!widget.enabled && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                          (Devre Dışı)
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      {getWidgetTypeLabel(widget.type)}
                    </div>
                    {widget.config?.title && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        Başlık: {widget.config.title}
                      </div>
                    )}
                  </div>
                  <span
                    className={`badge ${widget.enabled ? "badge-low" : "badge-medium"}`}
                    style={{ fontSize: 10 }}
                  >
                    {widget.enabled ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11 }}>
                    Pozisyon: ({widget.position.x}, {widget.position.y}) • Boyut: {widget.position.w}×{widget.position.h}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    Sıra: {widget.order}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {!IS_READONLY && (
                    <>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleToggleEnabled(widget)}
                      >
                        {widget.enabled ? "Devre Dışı Bırak" : "Aktif Et"}
                      </button>
                      <button
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => handleDelete(widget._id, widget.name)}
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

