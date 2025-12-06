import Head from "next/head";
import Link from "next/link";
import { useTheme } from "../../contexts/ThemeContext";
import { ThemeToggle } from "../../components/ThemeToggle";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="layout">
      <Head>
        <title>Kişisel Ayarlar - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="header-title">Kişisel Ayarlar</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Görünüm Ayarları</h3>

          <div style={{ marginBottom: 24 }}>
            <label className="muted" style={{ display: "block", marginBottom: 8 }}>
              Tema Tercihi
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border-color)"}`,
                  backgroundColor: theme === "dark" ? "var(--bg-tertiary)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setTheme("dark")}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                />
                <span style={{ fontSize: 20, marginRight: 8 }}>🌙</span>
                <div>
                  <div style={{ fontWeight: 500 }}>Karanlık Tema</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Koyu arka plan, açık metin
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: `2px solid ${theme === "light" ? "var(--accent)" : "var(--border-color)"}`,
                  backgroundColor: theme === "light" ? "var(--bg-tertiary)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setTheme("light")}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                />
                <span style={{ fontSize: 20, marginRight: 8 }}>☀️</span>
                <div>
                  <div style={{ fontWeight: 500 }}>Açık Tema</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Açık arka plan, koyu metin
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: `2px solid ${theme === "system" ? "var(--accent)" : "var(--border-color)"}`,
                  backgroundColor: theme === "system" ? "var(--bg-tertiary)" : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setTheme("system")}
              >
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={theme === "system"}
                  onChange={() => setTheme("system")}
                />
                <span style={{ fontSize: 20, marginRight: 8 }}>🖥️</span>
                <div>
                  <div style={{ fontWeight: 500 }}>Sistem Tercihi</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    İşletim sisteminizin tema ayarını kullan
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Hızlı Erişim
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Diğer Ayarlar</h3>
          <p className="muted">
            Daha fazla kişiselleştirme seçeneği yakında eklenecek.
          </p>
        </div>
      </main>
    </div>
  );
}

