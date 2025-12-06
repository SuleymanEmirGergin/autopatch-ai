import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchImages,
  ImageRisk,
  executeBulkGenerateAndRunRemediation,
  RemediationExecutionResult,
  ScriptType,
} from "../../lib/api";

const SCRIPT_TYPE_OPTIONS: { value: ScriptType; label: string }[] = [
  { value: "kubectl", label: "kubectl" },
  { value: "bash", label: "bash" },
  { value: "github-actions", label: "GitHub Actions" },
  { value: "gitlab-ci", label: "GitLab CI" },
];

export default function BulkOperationsPage() {
  const [images, setImages] = useState<ImageRisk[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [riskFactorFilter, setRiskFactorFilter] = useState("");
  const [scriptTypes, setScriptTypes] = useState<ScriptType[]>(["kubectl", "bash"]);
  const [dryRun, setDryRun] = useState(true);
  const [namespace, setNamespace] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalExecutions: number;
    successful: number;
    failed: number;
    results: RemediationExecutionResult[];
  } | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchImages();
      setImages(data);
      setSelected([]);
    } catch (e: any) {
      setError(e.message || "Image listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelected(images.map((i) => i.imageName));
  };

  const clearAll = () => setSelected([]);

  const handleRun = async () => {
    if (selected.length === 0) {
      setError("En az bir image seçin.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const rfList = riskFactorFilter
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await executeBulkGenerateAndRunRemediation({
        imageNames: selected,
        scriptTypes,
        riskFactors: rfList,
        dryRun,
        namespace: namespace || undefined,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Toplu çalıştırma başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>Bulk Operations - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Bulk Operations</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/recommendations">
            <button className="button button-secondary">Öneriler</button>
          </Link>
          <Link href="/admin/remediation-scripts">
            <button className="button button-secondary">Script'ler</button>
          </Link>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Seçim ve filtreler */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Seçim</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="button button-secondary" onClick={selectAll} disabled={loading}>
              Tümünü Seç
            </button>
            <button className="button button-secondary" onClick={clearAll} disabled={loading}>
              Temizle
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {loading ? (
              <div>Yükleniyor...</div>
            ) : (
              images.map((img) => (
                <label key={img.imageName} className="card" style={{ padding: 12, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(img.imageName)}
                      onChange={() => toggleSelect(img.imageName)}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{img.imageName}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        Risk: {img.riskLevel} ({img.riskScore})
                      </div>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Ayarlar */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Ayarlar</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Script Tipleri
              </label>
              <select
                multiple
                className="select"
                value={scriptTypes}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value as ScriptType);
                  setScriptTypes(values);
                }}
                style={{ minHeight: 100, fontSize: 12 }}
              >
                {SCRIPT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Risk Faktörleri (virgülle, opsiyonel)
              </label>
              <input
                className="input"
                value={riskFactorFilter}
                onChange={(e) => setRiskFactorFilter(e.target.value)}
                placeholder="Uses latest tag, Uses root user"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Namespace (opsiyonel)
              </label>
              <input
                className="input"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="default"
                style={{ fontSize: 12 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span style={{ fontSize: 12 }}>Dry-run (önerilir)</span>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="button button-primary"
              onClick={handleRun}
              disabled={submitting || selected.length === 0}
            >
              {submitting ? "Çalıştırılıyor..." : `Toplu Çalıştır (${selected.length})`}
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        {result && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sonuç</h3>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
              Toplam: {result.totalExecutions} — Başarılı: {result.successful} — Başarısız: {result.failed}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.results.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: "#0f172a",
                    border: "1px solid #1f2937",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>#{idx + 1}</div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: r.success ? "#10b981" : "#ef4444",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {r.success ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    {r.message}
                  </div>
                  {r.output && (
                    <pre
                      style={{
                        marginTop: 6,
                        padding: 8,
                        backgroundColor: "#111827",
                        borderRadius: 6,
                        fontSize: 11,
                        overflowX: "auto",
                      }}
                    >
                      {r.output}
                    </pre>
                  )}
                  {r.error && (
                    <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                      {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


