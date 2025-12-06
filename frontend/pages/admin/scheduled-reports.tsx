import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  runScheduledReportNow,
  toggleScheduledReport,
  ScheduledReport,
  ReportType,
  ScheduleFrequency,
  ComplianceStandard,
  CreateScheduledReportPayload,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "RISK_SUMMARY", label: "Risk Özet Raporu" },
  { value: "EXECUTIVE", label: "Executive Summary" },
  { value: "COMPLIANCE", label: "Compliance Raporu" },
  { value: "DETAILED", label: "Detaylı Analiz Raporu" },
];

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
  { value: "DAILY", label: "Günlük" },
  { value: "WEEKLY", label: "Haftalık" },
  { value: "MONTHLY", label: "Aylık" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Pazar" },
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
];

function getFrequencyLabel(frequency: ScheduleFrequency): string {
  return FREQUENCIES.find((f) => f.value === frequency)?.label || frequency;
}

function getReportTypeLabel(type: ReportType): string {
  return REPORT_TYPES.find((t) => t.value === type)?.label || type;
}

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateScheduledReportPayload>({
    name: "",
    description: "",
    reportType: "RISK_SUMMARY",
    frequency: "DAILY",
    time: "09:00",
    recipients: [],
    enabled: true,
  });
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fetchScheduledReports();
      setReports(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Scheduled report'lar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Scheduled report oluşturulamaz.");
      return;
    }

    if (formData.recipients.length === 0) {
      setError("En az bir alıcı e-posta adresi gereklidir.");
      return;
    }

    try {
      await createScheduledReport(formData);
      await loadReports();
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        reportType: "RISK_SUMMARY",
        frequency: "DAILY",
        time: "09:00",
        recipients: [],
        enabled: true,
      });
      setRecipientEmail("");
    } catch (e: any) {
      setError(e.message || "Scheduled report oluşturulamadı.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Scheduled report silinemez.");
      return;
    }
    if (!confirm(`"${name}" scheduled report'unu silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteScheduledReport(id);
      await loadReports();
    } catch (e: any) {
      setError(e.message || "Scheduled report silinemedi.");
    }
  };

  const handleToggle = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Scheduled report güncellenemez.");
      return;
    }
    try {
      await toggleScheduledReport(id);
      await loadReports();
    } catch (e: any) {
      setError(e.message || "Scheduled report güncellenemedi.");
    }
  };

  const handleRunNow = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Rapor çalıştırılamaz.");
      return;
    }
    try {
      await runScheduledReportNow(id);
      alert("Rapor çalıştırma işlemi başlatıldı. E-posta gönderilecek.");
      await loadReports();
    } catch (e: any) {
      setError(e.message || "Rapor çalıştırılamadı.");
    }
  };

  const addRecipient = () => {
    if (recipientEmail && !formData.recipients.includes(recipientEmail)) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, recipientEmail],
      });
      setRecipientEmail("");
    }
  };

  const removeRecipient = (email: string) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((e) => e !== email),
    });
  };

  return (
    <div className="layout">
      <Head>
        <title>Scheduled Reports - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Scheduled Reports</div>
          <span className="badge badge-medium" style={{ fontSize: 11 }}>
            {reports.filter((r) => r.enabled).length} aktif
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button button-secondary" onClick={loadReports}>
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
              {showForm ? "Formu Kapat" : "Yeni Scheduled Report Oluştur"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Scheduled Report</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  İsim *
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Rapor Tipi *
                </label>
                <select
                  className="select"
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
                  required
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.reportType === "COMPLIANCE" && (
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Compliance Standardı
                  </label>
                  <select
                    className="select"
                    value={formData.complianceStandard || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        complianceStandard: e.target.value as ComplianceStandard | undefined,
                      })
                    }
                  >
                    <option value="">Tüm Standartlar</option>
                    <option value="PCI-DSS">PCI-DSS</option>
                    <option value="SOC2">SOC 2</option>
                    <option value="ISO27001">ISO 27001</option>
                  </select>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Sıklık *
                  </label>
                  <select
                    className="select"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ScheduleFrequency })}
                    required
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Saat (HH:MM) *
                  </label>
                  <input
                    className="input"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formData.frequency === "WEEKLY" && (
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Haftanın Günü
                  </label>
                  <select
                    className="select"
                    value={formData.dayOfWeek ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, dayOfWeek: Number(e.target.value) })
                    }
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.frequency === "MONTHLY" && (
                <div style={{ marginBottom: 12 }}>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Ayın Günü (1-31)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, dayOfMonth: Number(e.target.value) })
                    }
                  />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Alıcılar (E-posta) *
                </label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    className="input"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                    placeholder="email@example.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={addRecipient}
                  >
                    Ekle
                  </button>
                </div>
                {formData.recipients.length > 0 && (
                  <div className="chips">
                    {formData.recipients.map((email, idx) => (
                      <span key={idx} className="chip" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            fontSize: 12,
                            padding: 0,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
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

        {!loading && reports.length === 0 && (
          <p className="muted">Henüz scheduled report tanımlanmamış.</p>
        )}

        {!loading && reports.length > 0 && (
          <div className="grid">
            {reports.map((report) => (
              <div
                key={report._id}
                className="card"
                style={{
                  borderLeft: report.enabled ? "4px solid #10b981" : "4px solid #6b7280",
                  opacity: report.enabled ? 1 : 0.7,
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
                      {report.name}
                      {!report.enabled && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                          (Devre Dışı)
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        {report.description}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 11 }}>
                      {getReportTypeLabel(report.reportType)} • {getFrequencyLabel(report.frequency)}
                    </div>
                  </div>
                  <span
                    className={`badge ${report.enabled ? "badge-low" : "badge-medium"}`}
                    style={{ fontSize: 10 }}
                  >
                    {report.enabled ? "Aktif" : "Pasif"}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                    Zamanlama:
                  </div>
                  <div style={{ fontSize: 11 }}>
                    {report.frequency === "DAILY" && `Her gün ${report.time}`}
                    {report.frequency === "WEEKLY" &&
                      `Her ${DAYS_OF_WEEK.find((d) => d.value === report.dayOfWeek)?.label || "Pazartesi"} ${report.time}`}
                    {report.frequency === "MONTHLY" &&
                      `Her ayın ${report.dayOfMonth || 1}. günü ${report.time}`}
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>
                    Alıcılar ({report.recipients.length}):
                  </div>
                  <div style={{ fontSize: 10, maxHeight: 60, overflowY: "auto" }}>
                    {report.recipients.join(", ")}
                  </div>
                </div>

                {report.nextRunAt && (
                  <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>
                    Sonraki çalışma: {new Date(report.nextRunAt).toLocaleString()}
                  </div>
                )}

                {report.lastRunAt && (
                  <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>
                    Son çalışma: {new Date(report.lastRunAt).toLocaleString()}{" "}
                    ({report.lastRunStatus === "success" ? "✅" : "❌"})
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 10 }}>
                    Toplam: {report.totalRuns} • Başarılı:{" "}
                    <span style={{ color: "#10b981" }}>{report.successfulRuns}</span> • Başarısız:{" "}
                    <span style={{ color: "#f87171" }}>{report.failedRuns}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {!IS_READONLY && (
                    <>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleRunNow(report._id)}
                      >
                        Şimdi Çalıştır
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        onClick={() => handleToggle(report._id)}
                      >
                        {report.enabled ? "Devre Dışı Bırak" : "Aktif Et"}
                      </button>
                      <button
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => handleDelete(report._id, report.name)}
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

