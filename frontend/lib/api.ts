export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ImageRisk {
  _id: string;
  imageName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  lastScannedAt: string;
  pods: { namespace: string; name: string }[];
  riskFactors: string[];
}

// Nginx reverse proxy üzerinden backend'e erişim
// Client-side'da /api kullan, server-side'da direkt backend'e eriş
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== "undefined"
    ? "/api"
    : process.env.BACKEND_URL || "http://localhost:5000");

// Admin işlemleri için (SSR veya server-side çağrılar için) isteğe bağlı header üretici.
// Tarayıcıdan gelen isteklerde bu header kullanılmıyor; admin anahtarı Next.js API route'larında kullanılıyor.
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {};
  if (typeof window === "undefined" && process.env.BACKEND_ADMIN_API_KEY) {
    headers["X-API-Key"] = process.env.BACKEND_ADMIN_API_KEY;
  }
  return headers;
};

// fetchImages, fetchTopImages, fetchImage fonksiyonları aşağıda cluster-aware versiyonlarıyla tanımlanmıştır

export async function fetchImageHistory(
  imageName: string,
  limit = 10
): Promise<{ at: string; riskScore: number; riskLevel: string }[]> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(
    `${BACKEND_URL}/images/${encoded}/history?limit=${limit}`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch image history");
  }
  return res.json();
}

export interface RiskBreakdownItem {
  factor: string;
  score: number;
  description: string;
}

export async function fetchImageBreakdown(
  imageName: string
): Promise<RiskBreakdownItem[]> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/breakdown`);
  if (!res.ok) {
    throw new Error("Failed to fetch image breakdown");
  }
  return res.json();
}

export interface ImageTagInfo {
  imageName: string;
  tag: string;
  riskScore: number;
  riskLevel: RiskLevel;
  lastScannedAt: string;
  pods: { namespace: string; name: string }[];
}

export interface ImageTagsResponse {
  baseName: string;
  tags: ImageTagInfo[];
}

export async function fetchImageTags(
  imageName: string
): Promise<ImageTagsResponse> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/tags`);
  if (!res.ok) {
    throw new Error("Failed to fetch image tags");
  }
  return res.json();
}

export interface RepositoryInfo {
  baseName: string;
  registry?: string;
  repository: string;
  tagCount: number;
  maxRiskScore: number;
  maxRiskLevel: RiskLevel;
  prodPodCount: number;
  lastScannedAt?: string;
}

export async function fetchRepositories(): Promise<RepositoryInfo[]> {
  const res = await fetch(`${BACKEND_URL}/repositories`);
  if (!res.ok) {
    throw new Error("Failed to fetch repositories");
  }
  return res.json();
}

export async function triggerScan(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/scan`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to trigger scan");
  }
}

export interface AllowlistEntry {
  _id?: string;
  imageName: string;
  ignoredRiskFactors: string[];
  note?: string;
}

export async function fetchAllowlist(): Promise<AllowlistEntry[]> {
  const res = await fetch("/api/allowlist");
  if (!res.ok) {
    throw new Error("Failed to fetch allowlist");
  }
  return res.json();
}

export async function upsertAllowlist(
  entry: AllowlistEntry
): Promise<AllowlistEntry> {
  const res = await fetch("/api/allowlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error("Failed to upsert allowlist entry");
  }
  return res.json();
}

export async function deleteAllowlist(imageName: string): Promise<void> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`/api/allowlist/${encoded}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete allowlist entry");
  }
}

export interface Stats {
  totalImages: number;
  highOrCritical: number;
  prodImpactedPods: number;
  lastScanAt: string | null;
}

// fetchStats fonksiyonu aşağıda cluster-aware versiyonuyla tanımlanmıştır

export interface StatsTrendPoint {
  startedAt: string;
  finishedAt?: string;
  avgRiskScore: number;
  highOrCritical: number;
}

export async function fetchStatsTrends(
  limit = 20
): Promise<StatsTrendPoint[]> {
  const res = await fetch(`${BACKEND_URL}/stats/trends?limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to fetch stats trends");
  }
  return res.json();
}

export type CustomRuleField =
  | "imageName"
  | "namespace"
  | "tag"
  | "age"
  | "baseImage"
  | "custom";

export type CustomRuleOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "regex"
  | "greaterThan"
  | "lessThan";

export type CustomRuleConjunction = "AND" | "OR";

export interface CustomRuleCondition {
  type: CustomRuleField;
  operator: CustomRuleOperator;
  value: string | number;
  conj?: CustomRuleConjunction;
}

export interface CustomRiskRule {
  _id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  condition: CustomRuleCondition;
  conditions?: CustomRuleCondition[];
  riskScore: number;
  riskFactor: string;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchCustomRules(includeDisabled = false): Promise<CustomRiskRule[]> {
  const params = includeDisabled ? "?includeDisabled=true" : "";
  const res = await fetch(`/api/custom-rules${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch custom rules");
  }
  return res.json();
}

export async function createCustomRule(rule: Omit<CustomRiskRule, "_id" | "createdAt" | "updatedAt">): Promise<CustomRiskRule> {
  const res = await fetch("/api/custom-rules", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create custom rule");
  }
  return res.json();
}

export async function updateCustomRule(id: string, updates: Partial<CustomRiskRule>): Promise<CustomRiskRule> {
  const res = await fetch(`/api/custom-rules/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to update custom rule");
  }
  return res.json();
}

export async function deleteCustomRule(id: string): Promise<void> {
  const res = await fetch(`/api/custom-rules/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to delete custom rule");
  }
}

export async function toggleCustomRule(id: string): Promise<CustomRiskRule> {
  const res = await fetch(`/api/custom-rules/${id}/toggle`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to toggle custom rule");
  }
  return res.json();
}

// Audit log API
export type AuditAction =
  | "SCAN_TRIGGERED"
  | "SCAN_COMPLETED"
  | "SCAN_FAILED"
  | "ALLOWLIST_CREATED"
  | "ALLOWLIST_UPDATED"
  | "ALLOWLIST_DELETED"
  | "CUSTOM_RULE_CREATED"
  | "CUSTOM_RULE_UPDATED"
  | "CUSTOM_RULE_DELETED"
  | "CUSTOM_RULE_TOGGLED"
  | "ALERT_RULE_CREATED"
  | "ALERT_RULE_UPDATED"
  | "ALERT_RULE_DELETED"
  | "IMAGE_VIEWED"
  | "EXPORT_GENERATED";

export interface AuditLog {
  _id: string;
  action: AuditAction;
  userId?: string;
  userIp?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PagedAuditLogs {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: AuditAction | "";
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PagedAuditLogs> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.action) search.set("action", params.action);
  if (params.resourceType) search.set("resourceType", params.resourceType);
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);

  const res = await fetch(`/api/audit-logs?${search.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch audit logs");
  }
  return res.json();
}

export async function fetchAuditLogsForResource(
  resourceType: string,
  resourceId: string,
  limit = 100
): Promise<AuditLog[]> {
  const encodedType = encodeURIComponent(resourceType);
  const encodedId = encodeURIComponent(resourceId);
  const res = await fetch(
    `/api/audit-logs/resource/${encodedType}/${encodedId}?limit=${limit}`,
    {
      headers: getHeaders(),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch audit logs for resource");
  }
  return res.json();
}

export interface DependencyNode {
  id: string;
  label: string;
  imageName: string;
  riskScore: number;
  riskLevel: string;
  type: "base" | "derived";
  namespace?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "base" | "namespace";
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export async function fetchDependencyGraph(): Promise<DependencyGraph> {
  const res = await fetch(`${BACKEND_URL}/dependency-graph`);
  if (!res.ok) {
    throw new Error("Failed to fetch dependency graph");
  }
  return res.json();
}

export interface ImageDependencies {
  baseImages: string[];
  dependentImages: string[];
  namespaces: string[];
}

export async function fetchImageDependencies(imageName: string): Promise<ImageDependencies> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/dependency-graph/image/${encoded}`);
  if (!res.ok) {
    throw new Error("Failed to fetch image dependencies");
  }
  return res.json();
}

export interface ScanStatus {
  status: "RUNNING" | "COMPLETED" | "FAILED" | null;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  message?: string;
}

export async function fetchScanStatus(): Promise<ScanStatus> {
  const res = await fetch(`${BACKEND_URL}/scan/status`);
  if (!res.ok) {
    throw new Error("Failed to fetch scan status");
  }
  return res.json();
}

// API Token Yönetimi (frontend sadece Next.js API route'larına konuşur)
export interface ApiToken {
  id: string;
  label: string;
  role: "admin" | "readonly";
  scopes: string[];
  expiresAt?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  createdBy?: string | null;
}

export interface CreateApiTokenPayload {
  label: string;
  role: "admin" | "readonly";
  expiresAt?: string | null;
}

export interface CreateApiTokenResponse {
  id: string;
  token: string;
  label: string;
  role: "admin" | "readonly";
  scopes: string[];
  expiresAt?: string | null;
  createdAt: string;
}

export async function fetchApiTokens(): Promise<ApiToken[]> {
  const res = await fetch("/api/tokens");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch API tokens");
  }
  return res.json();
}

export async function createApiToken(
  payload: CreateApiTokenPayload
): Promise<CreateApiTokenResponse> {
  const res = await fetch("/api/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create API token");
  }
  return res.json();
}

export async function deleteApiToken(id: string): Promise<void> {
  const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete API token");
  }
}

// Jira Ticket Oluşturma
export interface CreateJiraTicketRequest {
  imageName: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  pods: { namespace: string; name: string }[];
  summary?: string;
  description?: string;
}

export interface CreateJiraTicketResponse {
  success: boolean;
  ticketKey?: string;
  ticketUrl?: string;
  error?: string;
}

export async function createJiraTicket(
  request: CreateJiraTicketRequest
): Promise<CreateJiraTicketResponse> {
  const res = await fetch("/api/jira/ticket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create Jira ticket");
  }
  return res.json();
}

// Runbook Linkleri
export interface RunbookMapping {
  riskFactor: string;
  url: string;
  description?: string;
}

export async function fetchRunbookMappings(): Promise<RunbookMapping[]> {
  const res = await fetch(`${BACKEND_URL}/runbooks`);
  if (!res.ok) {
    throw new Error("Failed to fetch runbook mappings");
  }
  return res.json();
}

export async function fetchRunbookUrl(riskFactor: string): Promise<{ riskFactor: string; url: string } | null> {
  const encoded = encodeURIComponent(riskFactor);
  const res = await fetch(`${BACKEND_URL}/runbooks/${encoded}`);
  if (!res.ok) {
    return null; // Runbook URL bulunamadı
  }
  return res.json();
}

// Cluster Yönetimi
export interface ClusterInfo {
  clusterId: string;
  projectId: string;
  name: string;
  enabled: boolean;
}

export async function fetchClusters(): Promise<ClusterInfo[]> {
  const res = await fetch(`${BACKEND_URL}/clusters`);
  if (!res.ok) {
    throw new Error("Failed to fetch clusters");
  }
  return res.json();
}

export async function fetchImages(clusterId?: string, projectId?: string): Promise<ImageRisk[]> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/images${queryString ? `?${queryString}` : ""}`);
  if (!res.ok) {
    throw new Error("Failed to fetch images");
  }
  return res.json();
}

export async function fetchTopImages(
  limit = 3,
  prodOnly = false,
  clusterId?: string,
  projectId?: string
): Promise<ImageRisk[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (prodOnly) {
    params.set("prodOnly", "true");
  }
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const res = await fetch(`${BACKEND_URL}/images/top?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch top images");
  }
  return res.json();
}

export async function fetchImage(imageName: string, clusterId?: string): Promise<ImageRisk> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/images/${encoded}${queryString ? `?${queryString}` : ""}`);
  if (!res.ok) {
    throw new Error("Failed to fetch image");
  }
  return res.json();
}

// Recommendations
export interface Recommendation {
  id: string;
  type: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: number;
  title: string;
  description: string;
  riskFactor: string;
  action: string;
  impact: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  estimatedRiskReduction: number;
  relatedImages?: string[];
}

export interface ImageRecommendationsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: RiskLevel;
    riskFactors: string[];
  };
  recommendations: Recommendation[];
  totalRecommendations: number;
}

export interface BulkRecommendationsResponse {
  recommendations: Recommendation[];
  summary: {
    totalImages: number;
    criticalCount: number;
    highCount: number;
    totalRiskReduction: number;
    topRecommendations: Recommendation[];
  };
}

export async function fetchImageRecommendations(
  imageName: string,
  clusterId?: string,
  projectId?: string
): Promise<ImageRecommendationsResponse> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/recommendations?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch recommendations");
  }
  return res.json();
}

export async function fetchBulkRecommendations(filters?: {
  clusterId?: string;
  projectId?: string;
  riskLevel?: string;
  limit?: number;
}): Promise<BulkRecommendationsResponse> {
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.riskLevel) params.set("riskLevel", filters.riskLevel);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  
  const res = await fetch(`${BACKEND_URL}/recommendations?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch bulk recommendations");
  }
  return res.json();
}

export async function fetchPriorityRecommendations(filters?: {
  clusterId?: string;
  projectId?: string;
  minPriority?: number;
}): Promise<BulkRecommendationsResponse & { filteredCount: number }> {
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.minPriority) params.set("minPriority", filters.minPriority.toString());
  
  const res = await fetch(`${BACKEND_URL}/recommendations/priority?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch priority recommendations");
  }
  return res.json();
}

// Image Update Recommendations
export interface ImageUpdateRecommendation {
  id: string;
  currentImage: string;
  currentTag: string;
  recommendedTag: string;
  recommendedImage: string;
  updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST";
  priority: number;
  reason: string;
  riskReduction: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  currentRiskScore: number;
  estimatedNewRiskScore: number;
}

export interface ImageUpdateRecommendationsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: RiskLevel;
  };
  recommendations: ImageUpdateRecommendation[];
  totalRecommendations: number;
}

export interface BulkUpdateRecommendationsResponse {
  recommendations: ImageUpdateRecommendation[];
  summary: {
    totalImages: number;
    totalRecommendations: number;
    updateTypes: {
      PATCH: number;
      MINOR: number;
      MAJOR: number;
      LATEST: number;
    };
    totalRiskReduction: number;
    topRecommendations: ImageUpdateRecommendation[];
  };
}

export async function fetchImageUpdateRecommendations(
  imageName: string,
  clusterId?: string,
  projectId?: string
): Promise<ImageUpdateRecommendationsResponse> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/update-recommendations?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch update recommendations");
  }
  return res.json();
}

export async function fetchBulkUpdateRecommendations(filters?: {
  clusterId?: string;
  projectId?: string;
  minPriority?: number;
  limit?: number;
}): Promise<BulkUpdateRecommendationsResponse> {
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.minPriority) params.set("minPriority", filters.minPriority.toString());
  if (filters?.limit) params.set("limit", filters.limit.toString());
  
  const res = await fetch(`${BACKEND_URL}/recommendations/updates?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch bulk update recommendations");
  }
  return res.json();
}

// Remediation Scripts
export type ScriptType = "bash" | "kubectl" | "github-actions" | "gitlab-ci";

export interface RemediationScript {
  id: string;
  scriptType: ScriptType;
  title: string;
  description: string;
  riskFactor: string;
  script: string;
  language: string;
  estimatedRiskReduction: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  prerequisites?: string[];
  warnings?: string[];
}

export interface RemediationScriptsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: RiskLevel;
    riskFactors: string[];
  };
  scripts: RemediationScript[];
  totalScripts: number;
}

export interface RemediationExecutionRequest {
  imageName: string;
  scriptId: string;
  scriptType: ScriptType;
  namespace?: string;
  dryRun?: boolean;
  parameters?: Record<string, string>;
}

export interface RemediationExecutionResult {
  success: boolean;
  message: string;
  executedCommands?: string[];
  output?: string;
  error?: string;
  dryRun: boolean;
}

export async function fetchImageRemediationScripts(
  imageName: string,
  filters?: {
    clusterId?: string;
    projectId?: string;
    scriptTypes?: ScriptType[];
  }
): Promise<RemediationScriptsResponse> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.scriptTypes && filters.scriptTypes.length > 0) {
    params.set("scriptTypes", filters.scriptTypes.join(","));
  }
  
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/remediation-scripts?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch remediation scripts");
  }
  return res.json();
}

export async function executeRemediationScript(
  imageName: string,
  scriptId: string,
  options?: {
    dryRun?: boolean;
    namespace?: string;
    parameters?: Record<string, string>;
  }
): Promise<RemediationExecutionResult> {
  const encoded = encodeURIComponent(imageName);
  const scriptIdEncoded = encodeURIComponent(scriptId);
  
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/remediation-scripts/${scriptIdEncoded}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({
      dryRun: options?.dryRun !== false,
      namespace: options?.namespace,
      parameters: options?.parameters,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to execute remediation script");
  }
  return res.json();
}

export async function executeBatchRemediation(
  payload: {
    imageNames: string[];
    scriptIds: string[];
    dryRun?: boolean;
    namespace?: string;
  }
): Promise<{
  totalExecutions: number;
  successful: number;
  failed: number;
  results: RemediationExecutionResult[];
}> {
  const res = await fetch(`${BACKEND_URL}/remediation/batch-execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({
      imageNames: payload.imageNames,
      scriptIds: payload.scriptIds,
      dryRun: payload.dryRun !== false,
      namespace: payload.namespace,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to execute batch remediation");
  }
  return res.json();
}

export async function executeBulkGenerateAndRunRemediation(payload: {
  imageNames: string[];
  scriptTypes?: ScriptType[];
  riskFactors?: string[];
  dryRun?: boolean;
  namespace?: string;
}): Promise<{
  totalExecutions: number;
  successful: number;
  failed: number;
  results: RemediationExecutionResult[];
}> {
  const res = await fetch(`${BACKEND_URL}/remediation/batch-generate-execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({
      imageNames: payload.imageNames,
      scriptTypes: payload.scriptTypes,
      riskFactors: payload.riskFactors,
      dryRun: payload.dryRun !== false,
      namespace: payload.namespace,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to execute bulk remediation");
  }
  return res.json();
}

// Patch Recommendations
export interface PatchRecommendation {
  id: string;
  imageName: string;
  cveId?: string;
  packageName?: string;
  packageVersion?: string;
  fixedVersion?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: number;
  title: string;
  description: string;
  patchType: "SECURITY" | "FEATURE" | "BUGFIX" | "UPDATE";
  currentVersion: string;
  recommendedVersion: string;
  riskReduction: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  affectedPods: number;
  affectedNamespaces: string[];
  patchCommand?: string;
  patchScript?: string;
  references?: string[];
  publishedAt?: string;
}

export interface PatchRecommendationsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: RiskLevel;
  };
  patches: PatchRecommendation[];
  totalPatches: number;
  criticalPatches: number;
  highPatches: number;
}

export interface BulkPatchRecommendationsResponse {
  patches: PatchRecommendation[];
  summary: {
    totalImages: number;
    totalPatches: number;
    criticalPatches: number;
    highPatches: number;
    mediumPatches: number;
    lowPatches: number;
    totalRiskReduction: number;
    filteredPatches?: number;
  };
}

export async function fetchImagePatchRecommendations(
  imageName: string,
  filters?: {
    clusterId?: string;
    projectId?: string;
  }
): Promise<PatchRecommendationsResponse> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  
  const res = await fetch(`${BACKEND_URL}/images/${encoded}/patch-recommendations?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch patch recommendations");
  }
  return res.json();
}

export async function fetchBulkPatchRecommendations(filters?: {
  clusterId?: string;
  projectId?: string;
  minPriority?: number;
  severity?: string;
  limit?: number;
}): Promise<BulkPatchRecommendationsResponse> {
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.minPriority) params.set("minPriority", filters.minPriority.toString());
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  
  const res = await fetch(`${BACKEND_URL}/recommendations/patches?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch bulk patch recommendations");
  }
  return res.json();
}

// Auto Actions (risk skoruna göre otomatik aksiyonlar)
export type AutoActionType = "NOTIFY" | "REMEDIATE_DRY_RUN" | "REMEDIATE_EXECUTE";

export interface AutoActionPolicy {
  _id: string;
  name: string;
  description?: string;
  enabled: boolean;
  clusterId?: string;
  projectId?: string;
  riskScoreThreshold: number;
  riskLevels: RiskLevel[];
  namespaces: string[];
  riskFactors: string[];
  maxActionsPerRun: number;
  actionType: AutoActionType;
  notifyChannels: string[];
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutoActionExecutionItem {
  imageName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  matchedRiskFactors: string[];
  actionType: AutoActionType;
  dryRun: boolean;
  status: "EXECUTED" | "SKIPPED" | "NOTIFIED" | "FAILED";
  message: string;
  remediation?: {
    scriptId: string;
    scriptType: string;
    executed?: RemediationExecutionResult;
  };
}

export interface AutoActionExecutionResult {
  policyId: string;
  policyName: string;
  totalMatches: number;
  executedCount: number;
  skippedCount: number;
  items: AutoActionExecutionItem[];
}

export async function fetchAutoActionPolicies(filters?: {
  clusterId?: string;
  projectId?: string;
}): Promise<AutoActionPolicy[]> {
  const params = new URLSearchParams();
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);

  const res = await fetch(`${BACKEND_URL}/auto-actions/policies?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Auto action policy'leri alınamadı");
  }
  return res.json();
}

export async function createAutoActionPolicy(payload: Partial<AutoActionPolicy>): Promise<AutoActionPolicy> {
  const res = await fetch(`${BACKEND_URL}/auto-actions/policies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Auto action policy oluşturulamadı");
  }
  return res.json();
}

export async function updateAutoActionPolicy(id: string, payload: Partial<AutoActionPolicy>): Promise<AutoActionPolicy> {
  const res = await fetch(`${BACKEND_URL}/auto-actions/policies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Auto action policy güncellenemedi");
  }
  return res.json();
}

export async function deleteAutoActionPolicy(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/auto-actions/policies/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Auto action policy silinemedi");
  }
}

export async function executeAutoActionPolicy(
  id: string,
  payload?: { maxActions?: number; dryRunOverride?: boolean }
): Promise<AutoActionExecutionResult> {
  const res = await fetch(`${BACKEND_URL}/auto-actions/policies/${id}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Auto action policy çalıştırılamadı");
  }
  return res.json();
}

export async function fetchStats(clusterId?: string, projectId?: string): Promise<Stats> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/stats${queryString ? `?${queryString}` : ""}`);
  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

// Risk Budget Yönetimi
export interface RiskBudget {
  _id: string;
  name: string;
  description?: string;
  enabled: boolean;
  clusterId?: string;
  projectId?: string;
  maxCritical: number | null;
  maxHigh: number | null;
  maxMedium: number | null;
  maxTotalRiskScore: number | null;
  alertOnExceed: boolean;
  alertChannels: string[];
  currentCritical: number;
  currentHigh: number;
  currentMedium: number;
  currentTotalRiskScore: number;
  lastCheckedAt: string | null;
  exceededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskBudgetStatus {
  budget: RiskBudget;
  isExceeded: boolean;
  exceededFields: string[];
  utilization: {
    critical: number;
    high: number;
    medium: number;
    totalRiskScore: number;
  };
}

export interface CreateRiskBudgetPayload {
  name: string;
  description?: string;
  enabled?: boolean;
  clusterId?: string;
  projectId?: string;
  maxCritical?: number | null;
  maxHigh?: number | null;
  maxMedium?: number | null;
  maxTotalRiskScore?: number | null;
  alertOnExceed?: boolean;
  alertChannels?: string[];
}

export async function fetchRiskBudgets(clusterId?: string, projectId?: string): Promise<RiskBudget[]> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/risk-budgets${queryString ? `?${queryString}` : ""}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch risk budgets");
  }
  return res.json();
}

export async function fetchRiskBudgetStatus(id: string): Promise<RiskBudgetStatus> {
  const res = await fetch(`${BACKEND_URL}/risk-budgets/${id}/check`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to check risk budget status");
  }
  return res.json();
}

export async function checkAllRiskBudgets(): Promise<RiskBudgetStatus[]> {
  const res = await fetch(`${BACKEND_URL}/risk-budgets/check-all`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to check all risk budgets");
  }
  return res.json();
}

export async function createRiskBudget(payload: CreateRiskBudgetPayload): Promise<RiskBudget> {
  const res = await fetch(`${BACKEND_URL}/risk-budgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create risk budget");
  }
  return res.json();
}

export async function updateRiskBudget(id: string, payload: Partial<CreateRiskBudgetPayload>): Promise<RiskBudget> {
  const res = await fetch(`${BACKEND_URL}/risk-budgets/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update risk budget");
  }
  return res.json();
}

export async function deleteRiskBudget(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/risk-budgets/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete risk budget");
  }
}

// SBOM (Software Bill of Materials)
export interface PackageVulnerability {
  cveId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  description: string;
  fixedVersion?: string;
  publishedAt: string;
  references?: string[];
}

export interface PackageInfo {
  name: string;
  version: string;
  type: "npm" | "pip" | "maven" | "golang" | "docker" | "os";
  vulnerabilities: PackageVulnerability[];
}

export interface SBOM {
  _id: string;
  imageName: string;
  clusterId?: string;
  scannedAt: string;
  packages: PackageInfo[];
  totalPackages: number;
  vulnerablePackages: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  format: "spdx" | "cyclonedx" | "syft";
  scanner: "trivy" | "grype" | "syft" | "mock";
  createdAt: string;
  updatedAt: string;
}

export async function fetchSBOM(imageName: string, clusterId?: string): Promise<SBOM> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/sbom/image/${encoded}${queryString ? `?${queryString}` : ""}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch SBOM");
  }
  return res.json();
}

export async function rescanSBOM(imageName: string, clusterId?: string): Promise<SBOM> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/sbom/image/${encoded}/rescan${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to rescan SBOM");
  }
  return res.json();
}

export async function fetchAllCVEs(clusterId?: string): Promise<PackageVulnerability[]> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/sbom/cves${queryString ? `?${queryString}` : ""}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch CVEs");
  }
  return res.json();
}

export async function findImagesByPackage(packageName: string, clusterId?: string): Promise<SBOM[]> {
  const encoded = encodeURIComponent(packageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/sbom/package/${encoded}${queryString ? `?${queryString}` : ""}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to find images by package");
  }
  return res.json();
}

// Anomali Tespiti
export type AnomalyType =
  | "RISK_SCORE_SPIKE"
  | "RISK_SCORE_DROP"
  | "NEW_RISK_FACTOR"
  | "POD_COUNT_INCREASE"
  | "CRITICAL_VULNERABILITY"
  | "IMAGE_DELETED"
  | "UNUSUAL_NAMESPACE";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Anomaly {
  _id: string;
  imageName: string;
  clusterId?: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  previousValue?: number | string;
  currentValue?: number | string;
  changePercentage?: number;
  affectedPods?: { namespace: string; name: string }[];
  riskFactors?: string[];
  detectedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUnresolvedAnomalies(clusterId?: string, limit = 100): Promise<Anomaly[]> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND_URL}/anomalies?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch anomalies");
  }
  return res.json();
}

export async function fetchAnomaliesForImage(imageName: string, clusterId?: string, limit = 50): Promise<Anomaly[]> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  params.set("limit", String(limit));
  const queryString = params.toString();
  const res = await fetch(`${BACKEND_URL}/anomalies/image/${encoded}${queryString ? `?${queryString}` : ""}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch image anomalies");
  }
  return res.json();
}

export async function resolveAnomaly(id: string): Promise<Anomaly> {
  const res = await fetch(`${BACKEND_URL}/anomalies/${id}/resolve`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to resolve anomaly");
  }
  return res.json();
}

// Bildirim Gruplama
export type NotificationType =
  | "RISK_DETECTED"
  | "ANOMALY_DETECTED"
  | "BUDGET_EXCEEDED"
  | "SCAN_COMPLETE"
  | "CVE_DETECTED"
  | "ALERT_TRIGGERED";

export interface NotificationGroup {
  _id: string;
  type: NotificationType;
  severity: AnomalySeverity;
  groupKey: string;
  title: string;
  summary: string;
  affectedImages: string[];
  affectedClusters?: string[];
  metadata?: Record<string, any>;
  firstOccurredAt: string;
  lastOccurredAt: string;
  count: number;
  acknowledged: boolean;
  acknowledgedAt?: string;
  dismissed: boolean;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchActiveNotifications(severity?: AnomalySeverity, limit = 50): Promise<NotificationGroup[]> {
  const params = new URLSearchParams();
  if (severity) params.set("severity", severity);
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND_URL}/notifications?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return res.json();
}

export async function acknowledgeNotification(id: string): Promise<NotificationGroup> {
  const res = await fetch(`${BACKEND_URL}/notifications/${id}/acknowledge`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to acknowledge notification");
  }
  return res.json();
}

export async function dismissNotification(id: string): Promise<NotificationGroup> {
  const res = await fetch(`${BACKEND_URL}/notifications/${id}/dismiss`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to dismiss notification");
  }
  return res.json();
}

// Webhook Subscription Yönetimi
export type WebhookEventType =
  | "scan.complete"
  | "scan.failed"
  | "risk.new"
  | "risk.updated"
  | "anomaly.detected"
  | "budget.exceeded"
  | "cve.detected"
  | "image.deleted"
  | "*";

export interface WebhookSubscription {
  _id: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  active: boolean;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: "success" | "failed";
  lastDeliveryError?: string;
  retryEnabled: boolean;
  maxRetries: number;
  retryIntervalMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookSubscriptionPayload {
  name: string;
  description?: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  retryEnabled?: boolean;
  maxRetries?: number;
  retryIntervalMs?: number;
}

export async function fetchWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  const res = await fetch(`${BACKEND_URL}/webhooks`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch webhook subscriptions");
  }
  return res.json();
}

export async function createWebhookSubscription(
  payload: CreateWebhookSubscriptionPayload
): Promise<WebhookSubscription> {
  const res = await fetch(`${BACKEND_URL}/webhooks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create webhook subscription");
  }
  return res.json();
}

export async function updateWebhookSubscription(
  id: string,
  payload: Partial<CreateWebhookSubscriptionPayload>
): Promise<WebhookSubscription> {
  const res = await fetch(`${BACKEND_URL}/webhooks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update webhook subscription");
  }
  return res.json();
}

export async function deleteWebhookSubscription(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/webhooks/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete webhook subscription");
  }
}

export async function testWebhook(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BACKEND_URL}/webhooks/${id}/test`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to test webhook");
  }
  return res.json();
}

// Widget Yönetimi
export type WidgetType =
  | "STATS_CARD"
  | "RISK_CHART"
  | "TREND_CHART"
  | "TOP_IMAGES_LIST"
  | "ANOMALIES_LIST"
  | "RISK_BUDGET_STATUS"
  | "SCAN_HISTORY"
  | "CLUSTER_STATS";

export interface WidgetConfig {
  title?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  refreshInterval?: number;
  limit?: number;
  chartType?: "line" | "bar" | "pie" | "area";
  metric?: string;
  clusterId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface Widget {
  _id: string;
  userId?: string;
  name: string;
  type: WidgetType;
  config: WidgetConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWidgetPayload {
  name: string;
  type: WidgetType;
  config?: WidgetConfig;
  position?: { x: number; y: number; w: number; h: number };
  enabled?: boolean;
  order?: number;
}

export async function fetchWidgets(): Promise<Widget[]> {
  const res = await fetch(`${BACKEND_URL}/widgets`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch widgets");
  }
  return res.json();
}

export async function fetchWidgetData(id: string): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/widgets/${id}/data`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch widget data");
  }
  return res.json();
}

export async function createWidget(payload: CreateWidgetPayload): Promise<Widget> {
  const res = await fetch(`${BACKEND_URL}/widgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create widget");
  }
  return res.json();
}

export async function updateWidget(id: string, payload: Partial<CreateWidgetPayload>): Promise<Widget> {
  const res = await fetch(`${BACKEND_URL}/widgets/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update widget");
  }
  return res.json();
}

export async function deleteWidget(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/widgets/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete widget");
  }
}

export async function updateWidgetPositions(positions: Array<{ id: string; x: number; y: number; w: number; h: number; order: number }>): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/widgets/positions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ positions }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update widget positions");
  }
}

// Image Karşılaştırma
export interface ImageComparisonResult {
  image1: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    pods: { namespace: string; name: string }[];
    lastScannedAt: string;
    clusterId?: string;
    projectId?: string;
  };
  image2: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    pods: { namespace: string; name: string }[];
    lastScannedAt: string;
    clusterId?: string;
    projectId?: string;
  };
  differences: {
    riskScoreDiff: number;
    riskLevelChanged: boolean;
    riskLevelChange?: "improved" | "degraded" | "same";
    addedRiskFactors: string[];
    removedRiskFactors: string[];
    commonRiskFactors: string[];
    podCountDiff: number;
    prodPodCountDiff: number;
    newPods: { namespace: string; name: string }[];
    removedPods: { namespace: string; name: string }[];
    commonPods: { namespace: string; name: string }[];
  };
  summary: {
    overallChange: "improved" | "degraded" | "same";
    riskScoreChangePercent: number;
    totalChanges: number;
  };
}

export async function compareImages(
  image1: string,
  image2: string,
  clusterId1?: string,
  clusterId2?: string
): Promise<ImageComparisonResult> {
  const params = new URLSearchParams();
  params.set("image1", image1);
  params.set("image2", image2);
  if (clusterId1) params.set("clusterId1", clusterId1);
  if (clusterId2) params.set("clusterId2", clusterId2);

  const res = await fetch(`${BACKEND_URL}/images/compare?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to compare images");
  }
  return res.json();
}

// Compliance Yönetimi
export type ComplianceStandard = "PCI-DSS" | "SOC2" | "ISO27001";
export type ComplianceStatus = "PASS" | "FAIL" | "WARNING" | "NOT_APPLICABLE";

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  standard: ComplianceStandard;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: ComplianceStatus;
  evidence?: string[];
  lastCheckedAt: string;
  notes?: string;
}

export interface ComplianceAssessment {
  _id: string;
  standard: ComplianceStandard;
  clusterId?: string;
  projectId?: string;
  assessedAt: string;
  assessedBy?: string;
  version: string;
  requirements: ComplianceRequirement[];
  totalRequirements: number;
  passedRequirements: number;
  failedRequirements: number;
  warningRequirements: number;
  notApplicableRequirements: number;
  complianceScore: number;
  overallStatus: ComplianceStatus;
  nextAssessmentDue?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchComplianceAssessments(
  standard?: ComplianceStandard,
  clusterId?: string,
  projectId?: string
): Promise<ComplianceAssessment[]> {
  const params = new URLSearchParams();
  if (standard) params.set("standard", standard);
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);

  const res = await fetch(`${BACKEND_URL}/compliance?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch compliance assessments");
  }
  return res.json();
}

export async function fetchLatestComplianceAssessment(
  standard: ComplianceStandard,
  clusterId?: string,
  projectId?: string
): Promise<ComplianceAssessment> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);

  const res = await fetch(`${BACKEND_URL}/compliance/${standard}?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch compliance assessment");
  }
  return res.json();
}

export async function assessCompliance(
  standard: ComplianceStandard,
  clusterId?: string,
  projectId?: string
): Promise<ComplianceAssessment> {
  const params = new URLSearchParams();
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);

  const res = await fetch(`${BACKEND_URL}/compliance/${standard}/assess?${params.toString()}`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to assess compliance");
  }
  return res.json();
}

// Raporlama
export type ReportType = "RISK_SUMMARY" | "COMPLIANCE" | "EXECUTIVE" | "DETAILED";
export type ReportFormat = "PDF" | "HTML" | "MARKDOWN";

export async function generateReport(
  type: ReportType,
  options?: {
    riskLevel?: string;
    namespace?: string;
    standard?: ComplianceStandard;
    clusterId?: string;
    projectId?: string;
    templateId?: string;
    format?: ReportFormat;
  }
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options?.riskLevel) params.set("riskLevel", options.riskLevel);
  if (options?.namespace) params.set("namespace", options.namespace);
  if (options?.standard) params.set("standard", options.standard);
  if (options?.clusterId) params.set("clusterId", options.clusterId);
  if (options?.projectId) params.set("projectId", options.projectId);
  if (options?.templateId) params.set("templateId", options.templateId);

  const format = options?.format || "PDF";
  const formatSuffix = format === "HTML" ? "/html" : format === "MARKDOWN" ? "/markdown" : "";

  let endpoint = "";
  switch (type) {
    case "RISK_SUMMARY":
      endpoint = `/reports/risk-summary${formatSuffix}`;
      break;
    case "EXECUTIVE":
      endpoint = `/reports/executive-summary${formatSuffix}`;
      break;
    case "COMPLIANCE":
      endpoint = `/reports/compliance${formatSuffix}`;
      break;
    case "DETAILED":
      endpoint = `/reports/detailed${formatSuffix}`;
      break;
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate report");
  }
  return res.blob();
}

// Scheduled Reports
export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ScheduledReport {
  _id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  complianceStandard?: ComplianceStandard;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
  };
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
  recipients: string[];
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStatus?: "success" | "failed";
  lastRunError?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledReportPayload {
  name: string;
  description?: string;
  reportType: ReportType;
  complianceStandard?: ComplianceStandard;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
  };
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
  recipients: string[];
  enabled?: boolean;
}

export async function fetchScheduledReports(): Promise<ScheduledReport[]> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch scheduled reports");
  }
  return res.json();
}

export async function fetchScheduledReport(id: string): Promise<ScheduledReport> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch scheduled report");
  }
  return res.json();
}

export async function createScheduledReport(
  payload: CreateScheduledReportPayload
): Promise<ScheduledReport> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create scheduled report");
  }
  return res.json();
}

export async function updateScheduledReport(
  id: string,
  payload: Partial<CreateScheduledReportPayload>
): Promise<ScheduledReport> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update scheduled report");
  }
  return res.json();
}

export async function deleteScheduledReport(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete scheduled report");
  }
}

export async function runScheduledReportNow(id: string): Promise<{ message: string; reportId: string }> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports/${id}/run-now`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to run scheduled report");
  }
  return res.json();
}

export async function toggleScheduledReport(id: string): Promise<ScheduledReport> {
  const res = await fetch(`${BACKEND_URL}/scheduled-reports/${id}/toggle`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to toggle scheduled report");
  }
  return res.json();
}

// Export
export type ExportFormat = "CSV" | "XLSX" | "JSON";

export interface ExportOptions {
  format: ExportFormat;
  riskLevel?: string;
  namespace?: string;
  clusterId?: string;
  projectId?: string;
  includePods?: boolean;
  includeRiskFactors?: boolean;
  sortBy?: "riskScore" | "imageName" | "lastScannedAt";
  sortOrder?: "asc" | "desc";
}

export async function exportData(options: ExportOptions): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", options.format);
  if (options.riskLevel) params.set("riskLevel", options.riskLevel);
  if (options.namespace) params.set("namespace", options.namespace);
  if (options.clusterId) params.set("clusterId", options.clusterId);
  if (options.projectId) params.set("projectId", options.projectId);
  if (options.includePods) params.set("includePods", "true");
  if (options.includeRiskFactors !== false) params.set("includeRiskFactors", "true");
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.sortOrder) params.set("sortOrder", options.sortOrder);

  const res = await fetch(`${BACKEND_URL}/images/export?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to export data");
  }
  return res.blob();
}

export async function exportComplianceToExcel(
  standard?: ComplianceStandard,
  clusterId?: string,
  projectId?: string
): Promise<Blob> {
  const params = new URLSearchParams();
  if (standard) params.set("standard", standard);
  if (clusterId) params.set("clusterId", clusterId);
  if (projectId) params.set("projectId", projectId);

  const res = await fetch(`${BACKEND_URL}/reports/compliance/export/excel?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to export compliance data");
  }
  return res.blob();
}

// Report Templates
export interface ReportTemplate {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  headerText?: string;
  footerText?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  contentOptions: {
    includeSummary?: boolean;
    includeRiskDistribution?: boolean;
    includeTopRiskyImages?: boolean;
    includeRiskFactorAnalysis?: boolean;
    includeNamespaceAnalysis?: boolean;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    topRiskyCount?: number;
  };
  pdfOptions?: {
    pageSize?: "A4" | "LETTER";
    orientation?: "portrait" | "landscape";
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    fontFamily?: string;
    fontSize?: {
      title?: number;
      heading?: number;
      body?: number;
    };
  };
  excelOptions?: {
    includeCharts?: boolean;
    includePivotTables?: boolean;
    sheetOrder?: string[];
  };
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplatePayload {
  name: string;
  description?: string;
  logo?: string;
  headerText?: string;
  footerText?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  contentOptions?: {
    includeSummary?: boolean;
    includeRiskDistribution?: boolean;
    includeTopRiskyImages?: boolean;
    includeRiskFactorAnalysis?: boolean;
    includeNamespaceAnalysis?: boolean;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
    topRiskyCount?: number;
  };
  pdfOptions?: {
    pageSize?: "A4" | "LETTER";
    orientation?: "portrait" | "landscape";
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    fontFamily?: string;
    fontSize?: {
      title?: number;
      heading?: number;
      body?: number;
    };
  };
  excelOptions?: {
    includeCharts?: boolean;
    includePivotTables?: boolean;
    sheetOrder?: string[];
  };
  category?: string;
  tags?: string[];
  isDefault?: boolean;
  currentVersion?: number;
  versionCount?: number;
}

export async function fetchReportTemplates(): Promise<ReportTemplate[]> {
  const res = await fetch(`${BACKEND_URL}/report-templates`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch report templates");
  }
  return res.json();
}

export async function fetchDefaultReportTemplate(): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates/default`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch default template");
  }
  return res.json();
}

export async function fetchReportTemplate(id: string): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch template");
  }
  return res.json();
}

export async function createReportTemplate(
  payload: CreateReportTemplatePayload
): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create template");
  }
  return res.json();
}

export async function updateReportTemplate(
  id: string,
  payload: Partial<CreateReportTemplatePayload>
): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update template");
  }
  return res.json();
}

export async function deleteReportTemplate(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete template");
  }
}

export async function copyReportTemplate(id: string, name?: string): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}/copy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to copy template");
  }
  return res.json();
}

export async function exportReportTemplate(id: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}/export`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to export template");
  }
  return res.blob();
}

export async function importReportTemplate(
  templateData: any,
  overwrite?: boolean
): Promise<{ template: ReportTemplate; action: "created" | "updated"; message: string }> {
  const params = new URLSearchParams();
  if (overwrite) {
    params.set("overwrite", "true");
  }

  const res = await fetch(`${BACKEND_URL}/report-templates/import?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(templateData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to import template");
  }
  return res.json();
}

export async function setReportTemplateAsDefault(id: string): Promise<ReportTemplate> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}/set-default`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to set template as default");
  }
  return res.json();
}

export async function initializeReportTemplates(): Promise<{ message: string }> {
  const res = await fetch(`${BACKEND_URL}/report-templates/initialize`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to initialize templates");
  }
  return res.json();
}

export async function uploadReportTemplateLogo(id: string, file: File): Promise<ReportTemplate> {
  const formData = new FormData();
  formData.append("logo", file);
  
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}/upload-logo`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload logo");
  }
  return res.json();
}

export async function previewReportTemplate(id: string): Promise<{ template: ReportTemplate; preview: any }> {
  const res = await fetch(`${BACKEND_URL}/report-templates/${id}/preview`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to preview template");
  }
  return res.json();
}

// Report History
export type ReportHistoryType = "RISK_SUMMARY" | "COMPLIANCE" | "EXECUTIVE" | "DETAILED" | "EXCEL_EXPORT" | "CSV_EXPORT" | "JSON_EXPORT";

export interface ReportHistory {
  _id: string;
  reportType: ReportHistoryType;
  templateId?: string;
  templateName?: string;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
    standard?: string;
  };
  fileName: string;
  fileSize?: number;
  filePath?: string;
  format?: "PDF" | "XLSX" | "CSV" | "JSON";
  stats?: {
    totalImages?: number;
    highOrCritical?: number;
    prodImpactedPods?: number;
    avgRiskScore?: number;
  };
  createdBy?: string;
  createdAt: string;
}

export interface ReportHistoryListResponse {
  reports: ReportHistory[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReportHistoryStatistics {
  totalReports: number;
  reportsByType: Record<ReportHistoryType, number>;
  reportsByTemplate: Array<{ templateId: string; templateName?: string; count: number }>;
  recentReports: ReportHistory[];
}

export async function fetchReportHistory(
  page: number = 1,
  limit: number = 50,
  filters?: {
    reportType?: ReportHistoryType;
    templateId?: string;
    clusterId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ReportHistoryListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (filters?.reportType) params.set("reportType", filters.reportType);
  if (filters?.templateId) params.set("templateId", filters.templateId);
  if (filters?.clusterId) params.set("clusterId", filters.clusterId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  
  const res = await fetch(`${BACKEND_URL}/report-history?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch report history");
  }
  return res.json();
}

export async function fetchReportHistoryById(id: string): Promise<ReportHistory> {
  const res = await fetch(`${BACKEND_URL}/report-history/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch report history");
  }
  return res.json();
}

export async function fetchReportHistoryStatistics(): Promise<ReportHistoryStatistics> {
  const res = await fetch(`${BACKEND_URL}/report-history/statistics`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch report history statistics");
  }
  return res.json();
}

export async function deleteReportHistory(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/report-history/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete report history");
  }
}

// AI Features
export interface AIModelStatus {
  ready: boolean;
  name: string;
  description: string;
}

export interface AIModelStatusResponse {
  success: boolean;
  models: {
    riskPrediction: AIModelStatus;
    anomalyDetection: AIModelStatus;
    recommendationScoring: AIModelStatus;
  };
}

export interface RiskPrediction {
  predictedRiskScore: number;
  predictedRiskLevel: RiskLevel;
  confidence: number;
  factors: { name: string; impact: number }[];
  trend: "INCREASING" | "STABLE" | "DECREASING";
  predictionDate: string;
}

export interface RiskPredictionResponse {
  success: boolean;
  imageName: string;
  currentRisk: { score: number; level: RiskLevel };
  prediction: RiskPrediction;
}

export interface AIAnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType: string;
  severity: RiskLevel;
  explanation: string;
  confidence: number;
  suggestedActions: string[];
}

export interface AIAnomalyResponse {
  success: boolean;
  imageName: string;
  currentRisk: { score: number; level: RiskLevel };
  anomaly: AIAnomalyResult;
}

export interface IntelligentRecommendation {
  id: string;
  type: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: number;
  aiScore: number;
  mlConfidence: number;
  predictedImpact: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasoning: string;
  title: string;
  description: string;
  riskFactor: string;
  action: string;
  impact: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
  estimatedRiskReduction: number;
}

export interface IntelligentRecommendationsResponse {
  success: boolean;
  imageName: string;
  currentRisk: { score: number; level: RiskLevel };
  recommendations: IntelligentRecommendation[];
  summary: {
    total: number;
    critical: number;
    high: number;
    avgAIScore: number;
  };
}

// AI API Functions
export async function trainAIModels(clusterId?: string): Promise<AIModelStatusResponse> {
  const url = clusterId
    ? `${BACKEND_URL}/ai/train?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/train`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to train AI models");
  }
  return res.json();
}

export async function getAIModelStatus(): Promise<AIModelStatusResponse> {
  const res = await fetch(`${BACKEND_URL}/ai/status`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get AI model status");
  }
  return res.json();
}

export async function predictRisk(
  imageName: string,
  clusterId?: string
): Promise<RiskPredictionResponse> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/predict/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/predict/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to predict risk");
  }
  return res.json();
}

export async function predictBulkRisk(
  imageNames: string[],
  clusterId?: string
): Promise<{ success: boolean; predictions: RiskPredictionResponse[]; total: number }> {
  const res = await fetch(`${BACKEND_URL}/ai/predict/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ imageNames, clusterId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to predict bulk risk");
  }
  return res.json();
}

export async function detectAIAnomaly(
  imageName: string,
  clusterId?: string
): Promise<AIAnomalyResponse> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/anomaly/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/anomaly/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to detect anomaly");
  }
  return res.json();
}

export async function detectAllAnomalies(
  clusterId?: string,
  limit = 50
): Promise<{ success: boolean; anomalies: AIAnomalyResponse[]; total: number }> {
  const url = clusterId
    ? `${BACKEND_URL}/ai/anomalies?clusterId=${clusterId}&limit=${limit}`
    : `${BACKEND_URL}/ai/anomalies?limit=${limit}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to detect anomalies");
  }
  return res.json();
}

export async function getIntelligentRecommendations(
  imageName: string,
  clusterId?: string
): Promise<IntelligentRecommendationsResponse> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/recommendations/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/recommendations/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get intelligent recommendations");
  }
  return res.json();
}

// Additional AI interfaces
export interface ImageHealthScore {
  overallScore: number;
  categoryScores: {
    security: number;
    freshness: number;
    compliance: number;
    stability: number;
  };
  trend: "IMPROVING" | "STABLE" | "DETERIORATING";
  factors: Array<{ name: string; impact: number }>;
}

export interface PredictiveMaintenanceSchedule {
  imageName: string;
  currentRisk: number;
  recommendedUpdateDate: Date;
  daysUntilCritical: number;
  estimatedRiskReduction: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface RiskCorrelationMatrix {
  correlations: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
  }>;
  topCorrelations: Array<{
    factor1: string;
    factor2: string;
    correlation: number;
    insight: string;
  }>;
}

export interface RemediationSuccessPrediction {
  imageName: string;
  scriptType: string;
  successProbability: number;
  confidence: number;
  factors: Array<{ name: string; impact: "POSITIVE" | "NEGATIVE"; value: number }>;
  recommendation: string;
  warnings: string[];
}

export interface SecurityPosture {
  overallScore: number;
  categoryScores: {
    vulnerabilityManagement: number;
    accessControl: number;
    imageSecurity: number;
    runtimeSecurity: number;
    compliance: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trend: "IMPROVING" | "STABLE" | "DETERIORATING";
  benchmark: {
    industryAverage: number;
    bestPractice: number;
    gap: number;
  };
}

export interface CostBenefitAnalysis {
  imageName: string;
  remediationCost: {
    timeCost: number;
    resourceCost: number;
    opportunityCost: number;
    totalCost: number;
  };
  benefit: {
    riskReduction: number;
    securityImprovement: number;
    complianceGain: number;
    incidentPrevention: number;
    totalBenefit: number;
  };
  roi: number;
  paybackPeriod: number;
  recommendation: "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "NEUTRAL" | "NOT_RECOMMENDED";
  reasoning: string;
  factors: Array<{ name: string; impact: "POSITIVE" | "NEGATIVE"; value: number }>;
}

export interface RiskForecast {
  imageName: string;
  currentRisk: {
    score: number;
    level: string;
  };
  forecasts: Array<{
    date: string;
    predictedRiskScore: number;
    predictedRiskLevel: string;
    confidence: number;
    factors: Array<{ name: string; impact: number }>;
  }>;
  riskTrajectory: "INCREASING" | "STABLE" | "DECREASING" | "VOLATILE";
  criticalDate: string | null;
  recommendations: string[];
}

export interface WorkloadOptimization {
  imageName: string;
  currentState: {
    podCount: number;
    namespaceCount: number;
    resourceUsage: {
      cpu: number;
      memory: number;
    };
  };
  optimization: {
    recommendedPodCount: number;
    recommendedNamespaces: string[];
    resourceOptimization: {
      cpuReduction: number;
      memoryReduction: number;
      costSavings: number;
    };
    riskOptimization: {
      recommendedImages: string[];
      riskReduction: number;
    };
  };
  recommendations: string[];
  estimatedSavings: {
    monthly: number;
    annual: number;
  };
}

export interface ZeroDayDetection {
  imageName: string;
  hasZeroDayRisk: boolean;
  riskScore: number;
  indicators: Array<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    confidence: number;
    evidence: string[];
    recommendedAction: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    significance: "HIGH" | "MEDIUM" | "LOW";
  }>;
  recommendations: string[];
  mitigationSteps: string[];
}

export interface ThreatMatch {
  imageName: string;
  threat: {
    source: string;
    threatType: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    affectedImages: string[];
    confidence: number;
    publishedDate: string;
    mitigation: string;
  };
  matchScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  evidence: string[];
  recommendedActions: string[];
}

export interface PrioritizedPatch {
  patchId: string;
  cveId?: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affectedPackage: string;
  fixedVersion: string;
  currentVersion?: string;
  aiPriority: number;
  urgency: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW";
  estimatedRiskReduction: number;
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  affectedImages: string[];
  exploitability: number;
  impact: number;
  cvssScore?: number;
  reasoning: string;
  recommendedSchedule: string;
}

// Additional AI API functions
export async function analyzeCveWithNlp(
  imageName: string
): Promise<{ success: boolean; imageName: string; analysis: any }> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/ai/nlp/${encoded}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to analyze CVE with NLP");
  }
  return res.json();
}

export async function getImageSimilarityClusters(): Promise<{
  success: boolean;
  clusters: Array<{
    clusterId: number;
    images: string[];
    averageRisk: number;
    commonFactors: string[];
  }>;
}> {
  const res = await fetch(`${BACKEND_URL}/ai/similarity/clusters`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get similarity clusters");
  }
  return res.json();
}

export async function getSimilarImages(
  imageName: string
): Promise<{ success: boolean; imageName: string; similarImages: ImageRisk[] }> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/ai/similarity/${encoded}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get similar images");
  }
  return res.json();
}

export async function getPredictiveMaintenanceSchedule(
  clusterId?: string
): Promise<{
  success: boolean;
  schedule: PredictiveMaintenanceSchedule[];
}> {
  const url = clusterId
    ? `${BACKEND_URL}/ai/maintenance/schedule?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/maintenance/schedule`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get maintenance schedule");
  }
  return res.json();
}

export async function getRiskCorrelation(
  clusterId?: string
): Promise<{ success: boolean; correlation: RiskCorrelationMatrix }> {
  const url = clusterId
    ? `${BACKEND_URL}/ai/correlation?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/correlation`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get risk correlation");
  }
  return res.json();
}

export async function predictRemediationSuccess(
  imageName: string,
  scriptType: string,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; prediction: RemediationSuccessPrediction }> {
  const res = await fetch(`${BACKEND_URL}/ai/remediation/predict-success`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ imageName, scriptType, clusterId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to predict remediation success");
  }
  return res.json();
}

export async function getImageHealthScore(
  imageName: string,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; healthScore: ImageHealthScore }> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/health/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/health/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get health score");
  }
  return res.json();
}

export async function getSmartAlertPrioritization(
  alerts: any[],
  clusterId?: string
): Promise<{
  success: boolean;
  alerts: Array<{
    alertId: string;
    priority: number;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    estimatedImpact: number;
    reasoning: string;
  }>;
  total: number;
}> {
  const res = await fetch(`${BACKEND_URL}/ai/alerts/prioritize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ alerts, clusterId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to prioritize alerts");
  }
  return res.json();
}

export async function getBehavioralPatternAnalysis(
  imageName: string,
  clusterId?: string
): Promise<{
  success: boolean;
  imageName: string;
  pattern: {
    trend: "STABLE" | "VOLATILE" | "TRENDING_UP" | "TRENDING_DOWN";
    usagePattern: string;
    riskPattern: string;
    recommendations: string[];
  };
}> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/behavior/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/behavior/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to analyze behavioral pattern");
  }
  return res.json();
}

export async function analyzeCostBenefit(
  imageName: string,
  estimatedRiskReduction: number,
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH",
  clusterId?: string
): Promise<{ success: boolean; imageName: string; analysis: CostBenefitAnalysis }> {
  const res = await fetch(`${BACKEND_URL}/ai/cost-benefit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({
      imageName,
      estimatedRiskReduction,
      estimatedEffort,
      clusterId,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to analyze cost-benefit");
  }
  return res.json();
}

export async function getSecurityPosture(
  imageName: string,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; posture: SecurityPosture }> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/security-posture/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/security-posture/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get security posture");
  }
  return res.json();
}

export async function getClusterSecurityPosture(
  clusterId: string
): Promise<{
  success: boolean;
  posture: {
    clusterId: string;
    overallScore: number;
    imageCount: number;
    riskDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    categoryScores: SecurityPosture["categoryScores"];
    topRisks: Array<{
      imageName: string;
      riskScore: number;
      riskLevel: string;
    }>;
    recommendations: string[];
  };
}> {
  const res = await fetch(`${BACKEND_URL}/ai/security-posture/cluster/${clusterId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to get cluster security posture");
  }
  return res.json();
}

export async function analyzeRootCause(
  anomalyId: string,
  clusterId?: string
): Promise<{
  success: boolean;
  analysis: {
    anomalyId: string;
    anomalyType: string;
    rootCauses: Array<{
      cause: string;
      confidence: number;
      evidence: string[];
      impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      recommendation: string;
    }>;
    primaryRootCause: {
      cause: string;
      confidence: number;
      explanation: string;
    };
    contributingFactors: string[];
    timeline: Array<{
      timestamp: string;
      event: string;
      significance: "HIGH" | "MEDIUM" | "LOW";
    }>;
    recommendations: string[];
  };
}> {
  const url = clusterId
    ? `${BACKEND_URL}/ai/root-cause/${anomalyId}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/root-cause/${anomalyId}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to analyze root cause");
  }
  return res.json();
}

export async function forecastRisk(
  imageName: string,
  days: number = 30,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; forecast: RiskForecast }> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/forecast/${encoded}?days=${days}&clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/forecast/${encoded}?days=${days}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to forecast risk");
  }
  return res.json();
}

export async function forecastClusterRisk(
  clusterId: string,
  days: number = 30
): Promise<{
  success: boolean;
  forecast: {
    clusterId: string;
    overallForecast: {
      currentAverageRisk: number;
      predictedAverageRisk: number;
      trend: "IMPROVING" | "STABLE" | "DETERIORATING";
    };
    imageForecasts: RiskForecast[];
    criticalImages: Array<{
      imageName: string;
      currentRisk: number;
      predictedRisk: number;
      daysUntilCritical: number;
    }>;
    recommendations: string[];
  };
}> {
  const res = await fetch(`${BACKEND_URL}/ai/forecast/cluster/${clusterId}?days=${days}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to forecast cluster risk");
  }
  return res.json();
}

export async function optimizeWorkload(
  imageName: string,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; optimization: WorkloadOptimization }> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/optimization/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/optimization/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to optimize workload");
  }
  return res.json();
}

export async function optimizeCluster(
  clusterId: string
): Promise<{
  success: boolean;
  optimization: {
    clusterId: string;
    overallOptimization: {
      totalCostSavings: number;
      riskReduction: number;
      resourceEfficiency: number;
    };
    imageOptimizations: WorkloadOptimization[];
    topOpportunities: Array<{
      imageName: string;
      savings: number;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
  };
}> {
  const res = await fetch(`${BACKEND_URL}/ai/optimization/cluster/${clusterId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to optimize cluster");
  }
  return res.json();
}

export async function detectZeroDay(
  imageName: string,
  clusterId?: string
): Promise<{ success: boolean; imageName: string; detection: ZeroDayDetection }> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/zero-day/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/zero-day/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to detect zero-day");
  }
  return res.json();
}

export async function checkThreats(
  imageName: string,
  clusterId?: string
): Promise<{
  success: boolean;
  imageName: string;
  threatMatches: ThreatMatch[];
  total: number;
}> {
  const encoded = encodeURIComponent(imageName);
  const url = clusterId
    ? `${BACKEND_URL}/ai/threats/${encoded}?clusterId=${clusterId}`
    : `${BACKEND_URL}/ai/threats/${encoded}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to check threats");
  }
  return res.json();
}

export async function prioritizePatches(
  patches: Array<{
    patchId: string;
    cveId?: string;
    description: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    affectedPackage: string;
    fixedVersion: string;
    currentVersion?: string;
  }>,
  clusterId?: string
): Promise<{ success: boolean; patches: PrioritizedPatch[]; total: number }> {
  const res = await fetch(`${BACKEND_URL}/ai/patches/prioritize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ patches, clusterId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to prioritize patches");
  }
  return res.json();
}

// Image Creation Functions
export interface CreateImagePayload {
  imageName: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskFactors?: string[];
  pods?: Array<{ namespace: string; name: string }>;
  clusterId?: string;
  projectId?: string;
}

export interface CreateImageResponse {
  success: boolean;
  message: string;
  data: ImageRisk;
}

export interface CreateBulkImagesPayload {
  images: CreateImagePayload[];
}

export interface CreateBulkImagesResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    failed: number;
    results: ImageRisk[];
    errors?: Array<{ imageName: string; error: string }>;
  };
}

export async function createImage(payload: CreateImagePayload): Promise<CreateImageResponse> {
  const res = await fetch(`${BACKEND_URL}/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create image");
  }
  return res.json();
}

export async function createBulkImages(payload: CreateBulkImagesPayload): Promise<CreateBulkImagesResponse> {
  const res = await fetch(`${BACKEND_URL}/images/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create bulk images");
  }
  return res.json();
}

// ==================== IoT APIs ====================

export interface IoTDevice {
  deviceId: string;
  deviceName: string;
  deviceType: "edge" | "gateway" | "sensor" | "actuator" | "other";
  location?: string;
  clusterId?: string;
  projectId?: string;
  containers: Array<{
    containerId: string;
    imageName: string;
    status: "running" | "stopped" | "error";
    lastUpdated: Date;
  }>;
  metadata?: {
    firmwareVersion?: string;
    osVersion?: string;
    connectivity?: "wifi" | "ethernet" | "cellular" | "other";
  };
}

export interface IoTScanResult {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  totalContainers: number;
  runningContainers: number;
  images: ImageRisk[];
  scanTimestamp: Date;
  connectivityStatus: "online" | "offline" | "unknown";
}

export async function scanIoTDevice(device: IoTDevice): Promise<IoTScanResult> {
  const res = await fetch(`${BACKEND_URL}/iot/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(device),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to scan IoT device");
  }
  return res.json().then(r => r.data);
}

export async function scanBulkIoTDevices(devices: IoTDevice[]): Promise<{ total: number; results: IoTScanResult[] }> {
  const res = await fetch(`${BACKEND_URL}/iot/scan/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify({ devices }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to scan bulk IoT devices");
  }
  return res.json().then(r => r.data);
}

export async function getIoTImages(deviceId?: string, deviceType?: string): Promise<ImageRisk[]> {
  const params = new URLSearchParams();
  if (deviceId) params.set("deviceId", deviceId);
  if (deviceType) params.set("deviceType", deviceType);
  
  const res = await fetch(`${BACKEND_URL}/iot/images?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch IoT images");
  }
  return res.json().then(r => r.data);
}

export async function getIoTStatistics(): Promise<{
  totalDevices: number;
  totalContainers: number;
  deviceTypes: Record<string, number>;
  riskDistribution: Record<string, number>;
}> {
  const res = await fetch(`${BACKEND_URL}/iot/statistics`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch IoT statistics");
  }
  return res.json().then(r => r.data);
}

// ==================== Computer Vision APIs ====================

export interface ImageLayerAnalysis {
  layerId: string;
  layerIndex: number;
  layerSize: number;
  commands: string[];
  vulnerabilities: Array<{
    type: "exposed_port" | "root_user" | "sensitive_file" | "weak_permission" | "other";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    confidence: number;
  }>;
  suspiciousPatterns: Array<{
    pattern: string;
    description: string;
    riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export interface CVImageAnalysis {
  imageName: string;
  totalLayers: number;
  totalSize: number;
  layers: ImageLayerAnalysis[];
  visualRiskScore: number;
  visualRiskLevel: RiskLevel;
  detectedIssues: Array<{
    type: string;
    severity: string;
    layer: number;
    description: string;
  }>;
  recommendations: string[];
}

export async function analyzeImageWithCV(imageName: string, manifest?: any): Promise<CVImageAnalysis> {
  const encoded = encodeURIComponent(imageName);
  const params = new URLSearchParams();
  if (manifest) params.set("manifest", JSON.stringify(manifest));
  
  const res = await fetch(`${BACKEND_URL}/cv/analyze/${encoded}?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to analyze image with Computer Vision");
  }
  return res.json().then(r => r.data);
}

export async function extractVisualFeatures(imageName: string): Promise<{
  features: number[];
  hash: string;
}> {
  const encoded = encodeURIComponent(imageName);
  const res = await fetch(`${BACKEND_URL}/cv/features/${encoded}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to extract visual features");
  }
  return res.json().then(r => r.data);
}

// ==================== Generative AI APIs ====================

export interface GenerativeScriptRequest {
  imageName: string;
  riskFactors: string[];
  riskLevel: RiskLevel;
  targetEnvironment: "kubernetes" | "docker" | "ci-cd";
  scriptType: "bash" | "kubectl" | "yaml" | "python";
}

export interface GenerativeScriptResponse {
  script: string;
  explanation: string;
  steps: string[];
  warnings: string[];
  estimatedTime: string;
  confidence: number;
}

export interface GenerativeReportRequest {
  reportType: "executive" | "technical" | "compliance";
  images: Array<{
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
  }>;
  language?: "tr" | "en";
}

export interface GenerativeReportResponse {
  report: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
}

export interface GenerativeCVEDescriptionRequest {
  cveId: string;
  severity: string;
  affectedPackages: string[];
}

export interface GenerativeCVEDescriptionResponse {
  description: string;
  impact: string;
  remediation: string;
  references: string[];
}

export async function generateRemediationScript(request: GenerativeScriptRequest): Promise<GenerativeScriptResponse> {
  const res = await fetch(`${BACKEND_URL}/ai/generate/script`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate remediation script");
  }
  return res.json().then(r => r.data);
}

export async function generateNaturalLanguageReport(request: GenerativeReportRequest): Promise<GenerativeReportResponse> {
  const res = await fetch(`${BACKEND_URL}/ai/generate/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate report");
  }
  return res.json().then(r => r.data);
}

export async function generateCVEDescription(request: GenerativeCVEDescriptionRequest): Promise<GenerativeCVEDescriptionResponse> {
  const res = await fetch(`${BACKEND_URL}/ai/generate/cve-description`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getHeaders(),
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate CVE description");
  }
  return res.json().then(r => r.data);
}

