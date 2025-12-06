import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  fetchAllowlist,
  upsertAllowlist,
  deleteAllowlist,
  AllowlistEntry,
} from "../../lib/api";

const RISK_FACTORS = [
  "Uses latest tag",
  "Uses non-production tag",
  "Test image used in workload",
  "Running in production namespace",
  "Legacy image tag",
  "Image older than 180 days",
  "Uses root user",
  "Uses unknown base image",
];

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function AllowlistPage() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [formData, setFormData] = useState<AllowlistEntry>({
    imageName: "",
    ignoredRiskFactors: [],
    note: "",
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await fetchAllowlist();
      setEntries(data);
      setError(null);
    } catch (e) {
      setError("Allowlist yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertAllowlist(formData);
      await loadEntries();
      setShowForm(false);
      setFormData({ imageName: "", ignoredRiskFactors: [], note: "" });
    } catch (e) {
      setError("Kayıt eklenemedi/güncellenemedi.");
    }
  };

  const handleDelete = async (imageName: string) => {
    if (!confirm(`"${imageName}" kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteAllowlist(imageName);
      await loadEntries();
    } catch (e) {
      setError("Kayıt silinemedi.");
    }
  };

  const toggleFactor = (factor: string) => {
    const current = formData.ignoredRiskFactors;
    if (current.includes(factor)) {
      setFormData({
        ...formData,
        ignoredRiskFactors: current.filter((f) => f !== factor),
      });
    } else {
      setFormData({
        ...formData,
        ignoredRiskFactors: [...current, factor],
      });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      setError("Lütfen JSON veya CSV verisi girin.");
      return;
    }

    try {
      let parsed: AllowlistEntry[] = [];

      // JSON formatını dene
      try {
        parsed = JSON.parse(bulkData);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON bir array olmalı");
        }
      } catch {
        // CSV formatını dene
        const lines = bulkData.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        const imageNameIdx = headers.findIndex(
          (h) => h.toLowerCase() === "imagename" || h.toLowerCase() === "image"
        );
        const factorsIdx = headers.findIndex(
          (h) =>
            h.toLowerCase().includes("factor") ||
            h.toLowerCase().includes("ignore")
        );
        const noteIdx = headers.findIndex(
          (h) => h.toLowerCase() === "note" || h.toLowerCase() === "comment"
        );

        if (imageNameIdx === -1) {
          throw new Error("CSV'de imageName sütunu bulunamadı");
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const imageName = values[imageNameIdx];
          const factorsStr = factorsIdx >= 0 ? values[factorsIdx] : "";
          const note = noteIdx >= 0 ? values[noteIdx] : "";

          parsed.push({
            imageName,
            ignoredRiskFactors: factorsStr
              ? factorsStr.split("|").map((f) => f.trim())
              : [],
            note: note || undefined,
          });
        }
      }

      // Her entry'yi tek tek ekle
      let successCount = 0;
      let errorCount = 0;

      for (const entry of parsed) {
        if (!entry.imageName) {
          errorCount++;
          continue;
        }

        try {
          await upsertAllowlist(entry);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      await loadEntries();
      setBulkData("");
      setShowBulkImport(false);

      if (errorCount > 0) {
        setError(
          `${successCount} kayıt eklendi, ${errorCount} kayıt başarısız oldu.`
        );
      } else {
        setError(null);
        alert(`${successCount} kayıt başarıyla eklendi.`);
      }
    } catch (e) {
      setError(
        `Bulk import hatası: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="layout">
      <Head>
        <title>Risk Allowlist Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Risk Allowlist Yönetimi</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="role-badge">
            <span
              className={`role-badge-dot ${IS_READONLY ? "readonly" : ""}`}
            />
            <span style={{ fontWeight: 500 }}>
              Rol: {IS_READONLY ? "Read-only" : "Admin"}
            </span>
          </div>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {IS_READONLY && (
          <div
            style={{
              padding: 12,
              backgroundColor: "#374151",
              borderRadius: 4,
              marginBottom: 16,
              color: "#fbbf24",
            }}
          >
            ⚠️ Bu ortam read-only modda. Allowlist kayıtları görüntülenebilir ancak değiştirilemez.
          </div>
        )}

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {!IS_READONLY && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <button
              className="button"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Formu Kapat" : "Yeni Kayıt Ekle"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? "Bulk Import'u Kapat" : "Bulk Import"}
            </button>
          </div>
        )}

        {showForm && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Yeni Allowlist Kaydı</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Image Adı
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.imageName}
                  onChange={(e) =>
                    setFormData({ ...formData, imageName: e.target.value })
                  }
                  placeholder="registry.example.com/app:latest"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Ignore Edilecek Risk Faktörleri
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RISK_FACTORS.map((factor) => (
                    <label
                      key={factor}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.ignoredRiskFactors.includes(factor)}
                        onChange={() => toggleFactor(factor)}
                      />
                      <span style={{ fontSize: 13 }}>{factor}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Not (opsiyonel)
                </label>
                <input
                  className="input"
                  type="text"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Örn: Internal base image, risk kabul edildi"
                />
              </div>

              <button type="submit" className="button">
                Kaydet
              </button>
            </form>
          </div>
        )}

        {showBulkImport && !IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              Bulk Import (JSON veya CSV)
            </h3>
            <div style={{ marginBottom: 12 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                Dosya Yükle (opsiyonel)
              </label>
              <input
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileUpload}
                style={{ fontSize: 13 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                JSON Formatı:
              </label>
              <pre
                style={{
                  fontSize: 11,
                  padding: 8,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                  overflow: "auto",
                }}
              >
                {`[
  {
    "imageName": "registry.example.com/app:latest",
    "ignoredRiskFactors": ["Uses latest tag", "Uses unknown base image"],
    "note": "Internal image"
  }
]`}
              </pre>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                CSV Formatı:
              </label>
              <pre
                style={{
                  fontSize: 11,
                  padding: 8,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                  overflow: "auto",
                }}
              >
                {`imageName,ignoredRiskFactors,note
registry.example.com/app:latest,"Uses latest tag|Uses unknown base image",Internal image`}
              </pre>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                Veri:
              </label>
              <textarea
                className="input"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="JSON veya CSV verisini buraya yapıştırın..."
                rows={10}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
            </div>
            <button className="button" onClick={handleBulkImport}>
              Import Et
            </button>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && entries.length === 0 && (
          <p className="muted">Henüz allowlist kaydı yok.</p>
        )}

        {!loading && entries.length > 0 && (
          <div className="grid">
            {entries.map((entry) => (
              <div key={entry._id || entry.imageName} className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  {entry.imageName}
                </div>
                {entry.note && (
                  <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                    {entry.note}
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                    Ignore Edilen Faktörler:
                  </div>
                  <div className="chips">
                    {entry.ignoredRiskFactors.map((f, idx) => (
                      <span key={idx} className="chip">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {!IS_READONLY && (
                  <button
                    className="button button-secondary"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    onClick={() => handleDelete(entry.imageName)}
                  >
                    Sil
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

