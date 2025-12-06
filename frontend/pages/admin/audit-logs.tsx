import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AuditLog,
  AuditAction,
  fetchAuditLogs,
  fetchAuditLogsForResource,
} from "../../lib/api";

const IS_READONLY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_READONLY === "true";

interface PagedAuditState {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<PagedAuditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | "">("");
  const [resourceType, setResourceType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [resourceLogs, setResourceLogs] = useState<AuditLog[] | null>(null);
  const [loadingResourceLogs, setLoadingResourceLogs] = useState(false);

  useEffect(() => {
    void loadLogs();
  }, [page, action, resourceType, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await fetchAuditLogs({
        page,
        limit: 50,
        action: action || "",
        resourceType: resourceType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(result);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Audit log listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadResourceLogs = async (type: string, id: string) => {
    try {
      setLoadingResourceLogs(true);
      const result = await fetchAuditLogsForResource(type, id, 100);
      setResourceLogs(result);
      setSelectedResourceType(type);
      setSelectedResourceId(id);
    } catch (e: any) {
      setError(e.message || "Resource için audit log alınamadı.");
    } finally {
      setLoadingResourceLogs(false);
    }
  };

  const clearFilters = () => {
    setPage(1);
    setAction("");
    setResourceType("");
    setStartDate("");
    setEndDate("");
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("tr-TR");

  return (
    <div className="layout">
      <Head>
        <title>Audit Loglar - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">Audit Loglar</div>
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
        {error && (
          <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        )}

        <div
          className="card"
          style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div className="muted" style={{ fontSize: 12 }}>
            Filtreler
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <label
                className="muted"
                style={{ display: "block", fontSize: 11, marginBottom: 4 }}
              >
                Aksiyon
              </label>
              <select
                className="select"
                value={action}
                onChange={(e) => {
                  setPage(1);
                  setAction(e.target.value as AuditAction | "");
                }}
              >
                <option value="">Tümü</option>
                <option value="SCAN_TRIGGERED">SCAN_TRIGGERED</option>
                <option value="SCAN_COMPLETED">SCAN_COMPLETED</option>
                <option value="SCAN_FAILED">SCAN_FAILED</option>
                <option value="ALLOWLIST_CREATED">ALLOWLIST_CREATED</option>
                <option value="ALLOWLIST_UPDATED">ALLOWLIST_UPDATED</option>
                <option value="ALLOWLIST_DELETED">ALLOWLIST_DELETED</option>
                <option value="CUSTOM_RULE_CREATED">CUSTOM_RULE_CREATED</option>
                <option value="CUSTOM_RULE_UPDATED">CUSTOM_RULE_UPDATED</option>
                <option value="CUSTOM_RULE_DELETED">CUSTOM_RULE_DELETED</option>
                <option value="CUSTOM_RULE_TOGGLED">CUSTOM_RULE_TOGGLED</option>
                <option value="ALERT_RULE_CREATED">ALERT_RULE_CREATED</option>
                <option value="ALERT_RULE_UPDATED">ALERT_RULE_UPDATED</option>
                <option value="ALERT_RULE_DELETED">ALERT_RULE_DELETED</option>
                <option value="IMAGE_VIEWED">IMAGE_VIEWED</option>
                <option value="EXPORT_GENERATED">EXPORT_GENERATED</option>
              </select>
            </div>
            <div>
              <label
                className="muted"
                style={{ display: "block", fontSize: 11, marginBottom: 4 }}
              >
                Resource Type
              </label>
              <input
                className="input"
                placeholder="image / allowlist / customRule ..."
                value={resourceType}
                onChange={(e) => {
                  setPage(1);
                  setResourceType(e.target.value);
                }}
              />
            </div>
            <div>
              <label
                className="muted"
                style={{ display: "block", fontSize: 11, marginBottom: 4 }}
              >
                Başlangıç
              </label>
              <input
                className="input"
                type="datetime-local"
                value={startDate}
                onChange={(e) => {
                  setPage(1);
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label
                className="muted"
                style={{ display: "block", fontSize: 11, marginBottom: 4 }}
              >
                Bitiş
              </label>
              <input
                className="input"
                type="datetime-local"
                value={endDate}
                onChange={(e) => {
                  setPage(1);
                  setEndDate(e.target.value);
                }}
              />
            </div>
            <div>
              <button
                className="button button-secondary"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {loading && <p>Yükleniyor...</p>}

        {!loading && logs && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 2fr",
              gap: 8,
            }}
          >
            <div
              className="card"
              style={{ maxHeight: 520, overflow: "auto", fontSize: 12 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr",
                  gap: 6,
                  marginBottom: 8,
                  color: "#9ca3af",
                  fontSize: 11,
                }}
              >
                <div>Zaman</div>
                <div>Aksiyon</div>
                <div>Resource</div>
                <div>Detay</div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {logs.items.map((log) => (
                  <div
                    key={log._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr",
                      gap: 6,
                      padding: "4px 0",
                      borderBottom: "1px solid #111827",
                    }}
                  >
                    <div className="muted">
                      {formatDateTime(log.timestamp)}
                    </div>
                    <div>{log.action}</div>
                    <div>
                      {log.resourceType && log.resourceId ? (
                        <button
                          className="button button-secondary"
                          style={{ fontSize: 11, padding: "2px 6px" }}
                          onClick={() =>
                            loadResourceLogs(log.resourceType!, log.resourceId!)
                          }
                        >
                          {log.resourceType}:{log.resourceId.slice(0, 10)}…
                        </button>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {log.details
                        ? JSON.stringify(log.details).slice(0, 80)
                        : "-"}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <div className="muted">
                  Toplam {logs.total} kayıt • Sayfa {logs.page}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="button button-secondary"
                    disabled={logs.page <= 1}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={logs.page * logs.limit >= logs.total}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ gridColumn: "span 3", fontSize: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14 }}>
                Zaman Çizelgesi
              </h3>
              {!selectedResourceId && (
                <p className="muted" style={{ fontSize: 12 }}>
                  Sol taraftan bir resource'a tıklayarak zaman çizelgesini
                  görüntüleyin.
                </p>
              )}
              {selectedResourceId && (
                <>
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 8 }}
                  >
                    Resource: {selectedResourceType}:{selectedResourceId}
                  </div>
                  {loadingResourceLogs && <p>Yükleniyor...</p>}
                  {!loadingResourceLogs && resourceLogs && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight: 480,
                        overflow: "auto",
                      }}
                    >
                      {resourceLogs.map((log) => (
                        <div
                          key={log._id}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 80,
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            {new Date(log.timestamp).toLocaleString("tr-TR")}
                          </div>
                          <div
                            style={{
                              width: 10,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 9999,
                                backgroundColor: "#3b82f6",
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                width: 2,
                                backgroundColor: "#1f2937",
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>
                              {log.action}
                            </div>
                            {log.details && (
                              <div
                                className="muted"
                                style={{ fontSize: 11, marginTop: 2 }}
                              >
                                {JSON.stringify(log.details)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


