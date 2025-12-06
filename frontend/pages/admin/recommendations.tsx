import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchBulkRecommendations,
  fetchPriorityRecommendations,
  fetchBulkUpdateRecommendations,
  fetchBulkPatchRecommendations,
  Recommendation,
  BulkRecommendationsResponse,
  ImageUpdateRecommendation,
  BulkUpdateRecommendationsResponse,
  PatchRecommendation,
  BulkPatchRecommendationsResponse,
} from "../../lib/api";

const EFFORT_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const TYPE_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f87171",
  MEDIUM: "#fbbf24",
  LOW: "#10b981",
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [updateRecommendations, setUpdateRecommendations] = useState<ImageUpdateRecommendation[]>([]);
  const [patchRecommendations, setPatchRecommendations] = useState<PatchRecommendation[]>([]);
  const [summary, setSummary] = useState<BulkRecommendationsResponse["summary"] | null>(null);
  const [updateSummary, setUpdateSummary] = useState<BulkUpdateRecommendationsResponse["summary"] | null>(null);
  const [patchSummary, setPatchSummary] = useState<BulkPatchRecommendationsResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "priority" | "updates" | "patches">("priority");
  const [filters, setFilters] = useState({
    riskLevel: "ALL",
    clusterId: "",
    projectId: "",
    minPriority: 7,
    severity: "ALL",
  });

  useEffect(() => {
    loadRecommendations();
  }, [viewMode, filters]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === "patches") {
        const result = await fetchBulkPatchRecommendations({
          clusterId: filters.clusterId || undefined,
          projectId: filters.projectId || undefined,
          minPriority: filters.minPriority,
          severity: filters.severity !== "ALL" ? filters.severity : undefined,
        });
        setPatchRecommendations(result.patches);
        setPatchSummary(result.summary);
        setRecommendations([]);
        setSummary(null);
        setUpdateRecommendations([]);
        setUpdateSummary(null);
      } else if (viewMode === "updates") {
        const result = await fetchBulkUpdateRecommendations({
          clusterId: filters.clusterId || undefined,
          projectId: filters.projectId || undefined,
          minPriority: filters.minPriority,
        });
        setUpdateRecommendations(result.recommendations);
        setUpdateSummary(result.summary);
        setRecommendations([]);
        setSummary(null);
        setPatchRecommendations([]);
        setPatchSummary(null);
      } else if (viewMode === "priority") {
        const result = await fetchPriorityRecommendations({
          clusterId: filters.clusterId || undefined,
          projectId: filters.projectId || undefined,
          minPriority: filters.minPriority,
        });
        setRecommendations(result.recommendations);
        setSummary(result.summary);
        setUpdateRecommendations([]);
        setUpdateSummary(null);
        setPatchRecommendations([]);
        setPatchSummary(null);
      } else {
        const result = await fetchBulkRecommendations({
          clusterId: filters.clusterId || undefined,
          projectId: filters.projectId || undefined,
          riskLevel: filters.riskLevel !== "ALL" ? filters.riskLevel : undefined,
        });
        setRecommendations(result.recommendations);
        setSummary(result.summary);
        setUpdateRecommendations([]);
        setUpdateSummary(null);
        setPatchRecommendations([]);
        setPatchSummary(null);
      }
    } catch (e: any) {
      setError(e.message || "Öneriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const groupByRiskFactor = (recs: Recommendation[]): Map<string, Recommendation[]> => {
    const grouped = new Map<string, Recommendation[]>();
    recs.forEach((rec) => {
      const factor = rec.riskFactor;
      if (!grouped.has(factor)) {
        grouped.set(factor, []);
      }
      grouped.get(factor)!.push(rec);
    });
    return grouped;
  };

  const groupedRecommendations = groupByRiskFactor(recommendations);

  return (
    <div className="layout">
      <Head>
        <title>Risk Azaltma Önerileri - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Risk Azaltma Önerileri</div>
          {summary && (
            <span className="badge badge-medium" style={{ fontSize: 11 }}>
              {summary.totalImages} image • {recommendations.length} öneri
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Filtreler ve Görünüm */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Filtreler</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setViewMode("priority")}
                className={`button ${viewMode === "priority" ? "button-primary" : "button-secondary"}`}
                style={{ fontSize: 12 }}
              >
                Öncelikli
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`button ${viewMode === "all" ? "button-primary" : "button-secondary"}`}
                style={{ fontSize: 12 }}
              >
                Tümü
              </button>
              <button
                onClick={() => setViewMode("updates")}
                className={`button ${viewMode === "updates" ? "button-primary" : "button-secondary"}`}
                style={{ fontSize: 12 }}
              >
                Güncelleme Önerileri
              </button>
              <button
                onClick={() => setViewMode("patches")}
                className={`button ${viewMode === "patches" ? "button-primary" : "button-secondary"}`}
                style={{ fontSize: 12 }}
              >
                Patch Önerileri
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {viewMode === "all" && (
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Risk Seviyesi
                </label>
                <select
                  className="select"
                  value={filters.riskLevel}
                  onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                  style={{ fontSize: 12 }}
                >
                  <option value="ALL">Tümü</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            )}
            {(viewMode === "priority" || viewMode === "patches" || viewMode === "updates") && (
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Min Öncelik
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="10"
                  value={filters.minPriority}
                  onChange={(e) => setFilters({ ...filters, minPriority: parseInt(e.target.value) || 7 })}
                  style={{ fontSize: 12 }}
                />
              </div>
            )}
            {viewMode === "patches" && (
              <div>
                <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                  Severity
                </label>
                <select
                  className="select"
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  style={{ fontSize: 12 }}
                >
                  <option value="ALL">Tümü</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            )}
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Cluster ID
              </label>
              <input
                className="input"
                type="text"
                value={filters.clusterId}
                onChange={(e) => setFilters({ ...filters, clusterId: e.target.value })}
                placeholder="Opsiyonel"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
                Project ID
              </label>
              <input
                className="input"
                type="text"
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                placeholder="Opsiyonel"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
        </div>

        {/* Özet */}
        {summary && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Özet</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6" }}>
                  {summary.totalImages}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Image</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#ef4444" }}>
                  {summary.criticalCount}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Kritik Riskli</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#f87171" }}>
                  {summary.highCount}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Yüksek Riskli</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
                  {summary.totalRiskReduction}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Risk Azalması</div>
              </div>
            </div>
          </div>
        )}

        {/* Güncelleme Önerileri Özeti */}
        {updateSummary && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Güncelleme Önerileri Özeti</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6" }}>
                  {updateSummary.totalImages}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Image</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
                  {updateSummary.totalRecommendations}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Güncelleme Önerisi</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#f59e0b" }}>
                  {updateSummary.updateTypes.PATCH + updateSummary.updateTypes.MINOR + updateSummary.updateTypes.MAJOR + updateSummary.updateTypes.LATEST}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Güncelleme</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
                  {updateSummary.totalRiskReduction}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Risk Azalması</div>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #374151" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Güncelleme Tipleri</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <span style={{ color: "#10b981" }}>PATCH:</span> {updateSummary.updateTypes.PATCH}
                </div>
                <div>
                  <span style={{ color: "#f59e0b" }}>MINOR:</span> {updateSummary.updateTypes.MINOR}
                </div>
                <div>
                  <span style={{ color: "#f87171" }}>MAJOR:</span> {updateSummary.updateTypes.MAJOR}
                </div>
                <div>
                  <span style={{ color: "#ef4444" }}>LATEST:</span> {updateSummary.updateTypes.LATEST}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patch Önerileri Özeti */}
        {patchSummary && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Patch Önerileri Özeti</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6" }}>
                  {patchSummary.totalImages}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Image</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
                  {patchSummary.filteredPatches || patchSummary.totalPatches}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Patch Önerisi</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#ef4444" }}>
                  {patchSummary.criticalPatches}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Kritik Patch</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#f87171" }}>
                  {patchSummary.highPatches}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Yüksek Patch</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
                  {patchSummary.totalRiskReduction}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Toplam Risk Azalması</div>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #374151" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Severity Dağılımı</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <span style={{ color: "#ef4444" }}>CRITICAL:</span> {patchSummary.criticalPatches}
                </div>
                <div>
                  <span style={{ color: "#f87171" }}>HIGH:</span> {patchSummary.highPatches}
                </div>
                <div>
                  <span style={{ color: "#fbbf24" }}>MEDIUM:</span> {patchSummary.mediumPatches}
                </div>
                <div>
                  <span style={{ color: "#10b981" }}>LOW:</span> {patchSummary.lowPatches}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patch Önerileri */}
        {viewMode === "patches" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div>Yükleniyor...</div>
              </div>
            ) : patchRecommendations.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
                  Patch önerisi bulunamadı
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Tüm image'ler güncel görünüyor veya filtreleri değiştirerek tekrar deneyin
                </div>
              </div>
            ) : (
              <div>
                {patchRecommendations.map((patch) => {
                  const severityColors: Record<string, string> = {
                    CRITICAL: "#ef4444",
                    HIGH: "#f87171",
                    MEDIUM: "#fbbf24",
                    LOW: "#10b981",
                  };

                  const patchTypeColors: Record<string, string> = {
                    SECURITY: "#ef4444",
                    FEATURE: "#3b82f6",
                    BUGFIX: "#10b981",
                    UPDATE: "#f59e0b",
                  };

                  return (
                    <div key={patch.id} className="card" style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: severityColors[patch.severity] || "#6b7280",
                                color: "white",
                                fontWeight: 600,
                              }}
                            >
                              {patch.severity}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: patchTypeColors[patch.patchType] || "#6b7280",
                                color: "white",
                                fontWeight: 600,
                              }}
                            >
                              {patch.patchType}
                            </span>
                            {patch.cveId && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  backgroundColor: "#1f2937",
                                  color: "#9ca3af",
                                  fontWeight: 600,
                                }}
                              >
                                {patch.cveId}
                              </span>
                            )}
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{patch.title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                            {patch.description}
                          </div>
                          {patch.packageName && (
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                              <strong>Package:</strong> {patch.packageName} ({patch.packageVersion} → {patch.fixedVersion})
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ fontSize: 18, fontWeight: "bold", color: severityColors[patch.severity] }}>
                            {patch.priority}/10
                          </div>
                          <div style={{ fontSize: 10, color: "#6b7280" }}>Öncelik</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Mevcut</div>
                          <div style={{ fontSize: 12 }}>
                            <div><strong>Versiyon:</strong> {patch.currentVersion}</div>
                            <div><strong>Etkilenen Pod:</strong> {patch.affectedPods}</div>
                            <div><strong>Namespace:</strong> {patch.affectedNamespaces.join(", ")}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Önerilen</div>
                          <div style={{ fontSize: 12 }}>
                            <div><strong>Versiyon:</strong> {patch.recommendedVersion}</div>
                            <div><strong>Risk Azalması:</strong> <span style={{ color: "#10b981" }}>-{patch.riskReduction} puan</span></div>
                            <div><strong>Zorluk:</strong> <span style={{ color: EFFORT_COLORS[patch.effort] }}>{patch.effort}</span></div>
                          </div>
                        </div>
                      </div>

                      {patch.patchCommand && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Patch Komutu:</div>
                          <div style={{ padding: 8, backgroundColor: "#1f2937", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}>
                            {patch.patchCommand}
                          </div>
                        </div>
                      )}

                      {patch.patchScript && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>Patch Script:</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="button button-secondary"
                                style={{ fontSize: 10, padding: "4px 8px" }}
                                onClick={() => {
                                  navigator.clipboard.writeText(patch.patchScript || "");
                                  alert("Script kopyalandı!");
                                }}
                              >
                                Kopyala
                              </button>
                              <button
                                className="button button-secondary"
                                style={{ fontSize: 10, padding: "4px 8px" }}
                                onClick={() => {
                                  const blob = new Blob([patch.patchScript || ""], { type: "text/plain" });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `patch-${patch.id}.sh`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                }}
                              >
                                İndir
                              </button>
                            </div>
                          </div>
                          <pre
                            style={{
                              padding: 12,
                              backgroundColor: "#0f172a",
                              borderRadius: 8,
                              overflow: "auto",
                              fontSize: 11,
                              maxHeight: 200,
                              border: "1px solid #374151",
                            }}
                          >
                            {patch.patchScript}
                          </pre>
                        </div>
                      )}

                      {patch.references && patch.references.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Referanslar:</div>
                          {patch.references.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: "#3b82f6", marginRight: 12, textDecoration: "underline" }}
                            >
                              {ref}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Güncelleme Önerileri */}
        {viewMode === "updates" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div>Yükleniyor...</div>
              </div>
            ) : updateRecommendations.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
                  Güncelleme önerisi bulunamadı
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Tüm image'ler güncel görünüyor veya filtreleri değiştirerek tekrar deneyin
                </div>
              </div>
            ) : (
              <div>
                {updateRecommendations.map((rec) => {
                  const updateTypeColors: Record<string, string> = {
                    PATCH: "#10b981",
                    MINOR: "#f59e0b",
                    MAJOR: "#f87171",
                    LATEST: "#ef4444",
                  };

                  return (
                    <div key={rec.id} className="card" style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: updateTypeColors[rec.updateType] || "#6b7280",
                                color: "white",
                                fontWeight: 600,
                              }}
                            >
                              {rec.updateType}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>
                              {rec.currentImage} → {rec.recommendedImage}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                            {rec.description}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ fontSize: 18, fontWeight: "bold", color: TYPE_COLORS[rec.priority >= 8 ? "CRITICAL" : rec.priority >= 6 ? "HIGH" : "MEDIUM"] }}>
                            {rec.priority}/10
                          </div>
                          <div style={{ fontSize: 10, color: "#6b7280" }}>Öncelik</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Mevcut</div>
                          <div style={{ fontSize: 12 }}>
                            <div><strong>Tag:</strong> {rec.currentTag}</div>
                            <div><strong>Risk Skoru:</strong> {rec.currentRiskScore}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Önerilen</div>
                          <div style={{ fontSize: 12 }}>
                            <div><strong>Tag:</strong> {rec.recommendedTag}</div>
                            <div><strong>Tahmini Risk Skoru:</strong> {rec.estimatedNewRiskScore}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: 12, backgroundColor: "#1f2937", borderRadius: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Neden Güncellenmeli?</div>
                        <div style={{ fontSize: 12 }}>{rec.reason}</div>
                      </div>

                      <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                        <div>
                          <span style={{ color: "#6b7280" }}>Zorluk:</span>{" "}
                          <span style={{ color: EFFORT_COLORS[rec.effort] }}>{rec.effort}</span>
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Risk Azalması:</span>{" "}
                          <span style={{ color: "#10b981", fontWeight: 600 }}>
                            -{rec.riskReduction} puan
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Risk Azaltma Önerileri */}
        {viewMode !== "updates" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div>Yükleniyor...</div>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
                  Öneri bulunamadı
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Filtreleri değiştirerek tekrar deneyin
                </div>
              </div>
            ) : (
              <div>
                {/* Risk Faktörüne Göre Gruplandırılmış */}
                {Array.from(groupedRecommendations.entries()).map(([riskFactor, recs]) => (
              <div key={riskFactor} className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                  {riskFactor} ({recs.length} öneri)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recs.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        padding: 16,
                        backgroundColor: "#1f2937",
                        borderRadius: 8,
                        borderLeft: `4px solid ${TYPE_COLORS[rec.type] || "#6b7280"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span
                              className={`badge badge-${rec.type.toLowerCase()}`}
                              style={{ fontSize: 10 }}
                            >
                              {rec.type}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{rec.title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                            {rec.description}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ fontSize: 18, fontWeight: "bold", color: TYPE_COLORS[rec.type] }}>
                            {rec.priority}/10
                          </div>
                          <div style={{ fontSize: 10, color: "#6b7280" }}>Öncelik</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Aksiyon</div>
                          <div style={{ fontSize: 12 }}>{rec.action}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Etki</div>
                          <div style={{ fontSize: 12 }}>{rec.impact}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                        <div>
                          <span style={{ color: "#6b7280" }}>Zorluk:</span>{" "}
                          <span style={{ color: EFFORT_COLORS[rec.effort] }}>{rec.effort}</span>
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Tahmini Risk Azalması:</span>{" "}
                          <span style={{ color: "#10b981", fontWeight: 600 }}>
                            -{rec.estimatedRiskReduction} puan
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}

