import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiToken,
  CreateApiTokenPayload,
  CreateApiTokenResponse,
  fetchApiTokens,
  createApiToken,
  deleteApiToken,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showNewTokenModal, setShowNewTokenModal] =
    useState<CreateApiTokenResponse | null>(null);
  const [form, setForm] = useState<CreateApiTokenPayload>({
    label: "",
    role: "readonly",
    expiresAt: null,
  });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const data = await fetchApiTokens();
      setTokens(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Token listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Token oluşturulamaz.");
      return;
    }
    try {
      setCreating(true);
      const payload: CreateApiTokenPayload = {
        label: form.label.trim(),
        role: form.role,
        expiresAt: form.expiresAt || null,
      };
      const created = await createApiToken(payload);
      setShowNewTokenModal(created);
      setForm({ label: "", role: "readonly", expiresAt: null });
      await loadTokens();
    } catch (e: any) {
      setError(e.message || "Token oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (IS_READONLY) {
      setError("Bu ortam read-only modda. Token silinemez.");
      return;
    }
    if (!confirm("Bu token'ı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteApiToken(id);
      await loadTokens();
    } catch (e: any) {
      setError(e.message || "Token silinemedi.");
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>API Token Yönetimi - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">API Token Yönetimi</div>
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
            ⚠️ Bu ortam read-only modda. Token'lar görüntülenebilir ancak
            oluşturulamaz veya silinemez.
          </div>
        )}

        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        {!IS_READONLY && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              Yeni Token Oluştur
            </h3>
            <form onSubmit={handleCreate} noValidate>
              <div style={{ marginBottom: 12 }}>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Label *
                </label>
                <input
                  className="input"
                  type="text"
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="Örn: GitLab CI - prod"
                  required
                />
              </div>
              <div style={{ marginBottom: 12, display: "flex", gap: 16 }}>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Rol *
                  </label>
                  <select
                    className="select"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as "admin" | "readonly",
                      }))
                    }
                  >
                    <option value="readonly">Read-only</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                    Bitiş Tarihi (opsiyonel)
                  </label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.expiresAt ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        expiresAt: e.target.value || null,
                      }))
                    }
                    style={{ minWidth: 220 }}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="button"
                disabled={creating}
              >
                {creating ? "Oluşturuluyor..." : "Token Oluştur"}
              </button>
            </form>
          </div>
        )}

        {loading && <p>Yükleniyor...</p>}

        {!loading && tokens.length === 0 && (
          <p className="muted">Henüz tanımlı API token yok.</p>
        )}

        {!loading && tokens.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Token Listesi</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr 1fr",
                gap: 8,
                fontSize: 12,
                marginBottom: 8,
                color: "#9ca3af",
              }}
            >
              <div>Label</div>
              <div>Rol</div>
              <div>Oluşturulma / Son Kullanım</div>
              <div>İşlemler</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tokens.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 2fr 1fr",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <div>{t.label}</div>
                  <div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          t.role === "admin"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(59,130,246,0.15)",
                        color:
                          t.role === "admin" ? "#fca5a5" : "#93c5fd",
                      }}
                    >
                      {t.role === "admin" ? "Admin" : "Read-only"}
                    </span>
                  </div>
                  <div className="muted">
                    <div>
                      Oluşturulma:{" "}
                      {new Date(t.createdAt).toLocaleString("tr-TR")}
                    </div>
                    {t.lastUsedAt && (
                      <div>
                        Son kullanım:{" "}
                        {new Date(t.lastUsedAt).toLocaleString("tr-TR")}
                      </div>
                    )}
                    {t.expiresAt && (
                      <div>
                        Bitiş:{" "}
                        {new Date(t.expiresAt).toLocaleString("tr-TR")}
                      </div>
                    )}
                  </div>
                  <div>
                    {!IS_READONLY && (
                      <button
                        className="button button-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                        }}
                        onClick={() => handleDelete(t.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showNewTokenModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: 520,
                width: "100%",
                backgroundColor: "#020617",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                Yeni Token Oluşturuldu
              </h3>
              <p className="muted" style={{ marginBottom: 12 }}>
                Bu token değeri yalnızca bir kez gösterilir. Güvenli bir yerde
                saklayın.
              </p>
              <div
                style={{
                  backgroundColor: "#111827",
                  padding: 12,
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 13,
                  wordBreak: "break-all",
                  marginBottom: 12,
                }}
              >
                {showNewTokenModal.token}
              </div>
              <button
                className="button button-secondary"
                style={{ marginRight: 8, fontSize: 12, padding: "6px 10px" }}
                onClick={() => {
                  navigator.clipboard
                    .writeText(showNewTokenModal.token)
                    .catch(() => {});
                }}
              >
                Kopyala
              </button>
              <button
                className="button"
                style={{ fontSize: 12, padding: "6px 10px" }}
                onClick={() => setShowNewTokenModal(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


