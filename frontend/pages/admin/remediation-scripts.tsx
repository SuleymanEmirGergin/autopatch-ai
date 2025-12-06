import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchImages,
  fetchImageRemediationScripts,
  executeRemediationScript,
  RemediationScript,
  RemediationScriptsResponse,
  ScriptType,
  ImageRisk,
} from "../../lib/api";

const SCRIPT_TYPE_COLORS: Record<ScriptType, string> = {
  bash: "#10b981",
  kubectl: "#3b82f6",
  "github-actions": "#24292e",
  "gitlab-ci": "#fc6d26",
};

const EFFORT_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function RemediationScriptsPage() {
  const [images, setImages] = useState<ImageRisk[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scripts, setScripts] = useState<RemediationScript[]>([]);
  const [imageInfo, setImageInfo] = useState<RemediationScriptsResponse["image"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScriptTypes, setSelectedScriptTypes] = useState<ScriptType[]>([
    "bash",
    "kubectl",
    "github-actions",
    "gitlab-ci",
  ]);
  const [executingScript, setExecutingScript] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    if (selectedImage) {
      loadScripts();
    }
  }, [selectedImage, selectedScriptTypes]);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchImages();
      setImages(data.sort((a, b) => b.riskScore - a.riskScore));
    } catch (e: any) {
      setError(e.message || "Image'ler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadScripts = async () => {
    if (!selectedImage) return;

    try {
      setScriptsLoading(true);
      setError(null);
      const result = await fetchImageRemediationScripts(selectedImage, {
        scriptTypes: selectedScriptTypes,
      });
      setScripts(result.scripts);
      setImageInfo(result.image);
    } catch (e: any) {
      setError(e.message || "Script'ler yüklenemedi.");
    } finally {
      setScriptsLoading(false);
    }
  };

  const handleExecuteScript = async (script: RemediationScript, dryRun: boolean = true) => {
    if (!selectedImage) return;
    if (IS_READONLY && !dryRun) {
      setError("Bu ortam read-only modda. Gerçek uygulama yapılamaz.");
      return;
    }

    try {
      setExecutingScript(script.id);
      setError(null);
      const result = await executeRemediationScript(selectedImage, script.id, {
        dryRun,
        namespace: imageInfo?.riskFactors[0] || undefined,
      });
      setExecutionResult(result);
    } catch (e: any) {
      setError(e.message || "Script çalıştırılamadı.");
    } finally {
      setExecutingScript(null);
    }
  };

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    alert("Script kopyalandı!");
  };

  const handleDownloadScript = (script: RemediationScript) => {
    const blob = new Blob([script.script], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.id}.${script.language === "yaml" ? "yml" : "sh"}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const groupScriptsByRiskFactor = (scripts: RemediationScript[]): Map<string, RemediationScript[]> => {
    const grouped = new Map<string, RemediationScript[]>();
    scripts.forEach((script) => {
      if (!grouped.has(script.riskFactor)) {
        grouped.set(script.riskFactor, []);
      }
      grouped.get(script.riskFactor)!.push(script);
    });
    return grouped;
  };

  const groupedScripts = groupScriptsByRiskFactor(scripts);

  return (
    <div className="layout">
      <Head>
        <title>Remediation Script'leri - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Remediation Script'leri</div>
          {imageInfo && (
            <span className="badge badge-medium" style={{ fontSize: 11 }}>
              {scripts.length} script
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/recommendations">
            <button className="button button-secondary">Öneriler</button>
          </Link>
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

        {/* Image Seçimi */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Image Seç</h3>
          {loading ? (
            <div>Yükleniyor...</div>
          ) : (
            <select
              className="select"
              value={selectedImage || ""}
              onChange={(e) => setSelectedImage(e.target.value || null)}
              style={{ width: "100%" }}
            >
              <option value="">Image seçin...</option>
              {images.map((img) => (
                <option key={img.imageName} value={img.imageName}>
                  {img.imageName} ({img.riskScore} - {img.riskLevel})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Script Tipi Filtresi */}
        {selectedImage && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Script Tipleri</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(["bash", "kubectl", "github-actions", "gitlab-ci"] as ScriptType[]).map((type) => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedScriptTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScriptTypes([...selectedScriptTypes, type]);
                      } else {
                        setSelectedScriptTypes(selectedScriptTypes.filter((t) => t !== type));
                      }
                    }}
                  />
                  <span style={{ fontSize: 12 }}>{type}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Image Bilgileri */}
        {imageInfo && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Image Bilgileri</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Image Name</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{imageInfo.imageName}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Risk Skoru</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{imageInfo.riskScore}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Risk Seviyesi</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{imageInfo.riskLevel}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Risk Faktörleri</div>
                <div style={{ fontSize: 14 }}>{imageInfo.riskFactors.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Result */}
        {executionResult && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Execution Sonucu</h3>
            <div style={{ padding: 16, backgroundColor: executionResult.success ? "#064e3b" : "#7f1d1d", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {executionResult.success ? "✅ Başarılı" : "❌ Başarısız"}
              </div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>{executionResult.message}</div>
              {executionResult.dryRun && (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  ⚠️ Dry-run modu: Gerçek uygulama yapılmadı
                </div>
              )}
            </div>
            {executionResult.output && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Çıktı:</div>
                <pre style={{ padding: 12, backgroundColor: "#1f2937", borderRadius: 8, overflow: "auto", fontSize: 11 }}>
                  {executionResult.output}
                </pre>
              </div>
            )}
            {executionResult.error && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>Hata:</div>
                <div style={{ padding: 12, backgroundColor: "#7f1d1d", borderRadius: 8, fontSize: 11 }}>
                  {executionResult.error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Script'ler */}
        {selectedImage && (
          <>
            {scriptsLoading ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div>Script'ler yükleniyor...</div>
              </div>
            ) : scripts.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, color: "#6b7280", marginBottom: 8 }}>
                  Script bulunamadı
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Bu image için remediation script'i bulunamadı
                </div>
              </div>
            ) : (
              <div>
                {Array.from(groupedScripts.entries()).map(([riskFactor, scripts]) => (
                  <div key={riskFactor} className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                      {riskFactor} ({scripts.length} script)
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {scripts.map((script) => (
                        <div
                          key={script.id}
                          style={{
                            padding: 16,
                            backgroundColor: "#1f2937",
                            borderRadius: 8,
                            borderLeft: `4px solid ${SCRIPT_TYPE_COLORS[script.scriptType] || "#6b7280"}`,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    backgroundColor: SCRIPT_TYPE_COLORS[script.scriptType] || "#6b7280",
                                    color: "white",
                                    fontWeight: 600,
                                  }}
                                >
                                  {script.scriptType.toUpperCase()}
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{script.title}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                                {script.description}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                              <div style={{ fontSize: 12, color: EFFORT_COLORS[script.effort] }}>
                                {script.effort}
                              </div>
                              <div style={{ fontSize: 10, color: "#6b7280" }}>Zorluk</div>
                            </div>
                          </div>

                          {/* Script Preview */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>Script:</div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="button button-secondary"
                                  style={{ fontSize: 10, padding: "4px 8px" }}
                                  onClick={() => handleCopyScript(script.script)}
                                >
                                  Kopyala
                                </button>
                                <button
                                  className="button button-secondary"
                                  style={{ fontSize: 10, padding: "4px 8px" }}
                                  onClick={() => handleDownloadScript(script)}
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
                                maxHeight: 300,
                                border: "1px solid #374151",
                              }}
                            >
                              {script.script}
                            </pre>
                          </div>

                          {/* Prerequisites ve Warnings */}
                          {script.prerequisites && script.prerequisites.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Gereksinimler:</div>
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                {script.prerequisites.join(", ")}
                              </div>
                            </div>
                          )}

                          {script.warnings && script.warnings.length > 0 && (
                            <div style={{ marginBottom: 12, padding: 8, backgroundColor: "#7f1d1d", borderRadius: 4 }}>
                              <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 4 }}>⚠️ Uyarılar:</div>
                              {script.warnings.map((warning, idx) => (
                                <div key={idx} style={{ fontSize: 11, color: "#fca5a5" }}>
                                  • {warning}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="button button-secondary"
                              style={{ fontSize: 11, padding: "6px 12px" }}
                              onClick={() => handleExecuteScript(script, true)}
                              disabled={executingScript === script.id}
                            >
                              {executingScript === script.id ? "Çalıştırılıyor..." : "Dry-Run Çalıştır"}
                            </button>
                            {!IS_READONLY && (
                              <button
                                className="button button-primary"
                                style={{ fontSize: 11, padding: "6px 12px" }}
                                onClick={() => {
                                  if (confirm("Bu script'i gerçekten çalıştırmak istediğinizden emin misiniz?")) {
                                    handleExecuteScript(script, false);
                                  }
                                }}
                                disabled={executingScript === script.id}
                              >
                                {executingScript === script.id ? "Çalıştırılıyor..." : "Gerçek Çalıştır"}
                              </button>
                            )}
                          </div>

                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                            Tahmini Risk Azalması: <span style={{ color: "#10b981", fontWeight: 600 }}>-{script.estimatedRiskReduction} puan</span>
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

