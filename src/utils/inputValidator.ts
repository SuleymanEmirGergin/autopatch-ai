/**
 * Input Validation Utilities
 * Güvenlik için input doğrulama ve sanitization fonksiyonları
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Image name validasyonu
 * - Path traversal saldırılarını önler
 * - XSS saldırılarını önler
 * - Format kontrolü yapar
 */
export function validateImageName(imageName: string): void {
  if (!imageName || typeof imageName !== "string") {
    throw new ValidationError("imageName geçerli bir string olmalıdır");
  }

  // Uzunluk kontrolü (DoS önleme)
  if (imageName.length > 500) {
    throw new ValidationError("imageName çok uzun (max 500 karakter)");
  }

  // Path traversal saldırılarını önle
  if (
    imageName.includes("..") ||
    imageName.includes("/") ||
    imageName.includes("\\") ||
    imageName.startsWith("/") ||
    imageName.startsWith("\\")
  ) {
    throw new ValidationError("imageName geçersiz karakterler içeriyor");
  }

  // XSS saldırılarını önle
  if (
    imageName.includes("<") ||
    imageName.includes(">") ||
    imageName.includes("script") ||
    imageName.includes("javascript:")
  ) {
    throw new ValidationError("imageName güvenlik riski içeriyor");
  }

  // Docker image name format kontrolü (basit)
  // Format: [registry/]repository[:tag] veya repository[:tag]
  const imageNamePattern = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?(\/[a-z0-9]([a-z0-9._-]*[a-z0-9])?)*(:[a-z0-9]([a-z0-9._-]*[a-z0-9])?)?$/i;
  if (!imageNamePattern.test(imageName) && imageName !== "latest") {
    // "latest" özel durum olarak kabul edilir
    if (!imageName.includes(":")) {
      // Tag yoksa sadece repository kontrolü
      const repoPattern = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?(\/[a-z0-9]([a-z0-9._-]*[a-z0-9])?)*$/i;
      if (!repoPattern.test(imageName)) {
        throw new ValidationError("imageName geçersiz format");
      }
    }
  }
}

/**
 * Risk score validasyonu
 */
export function validateRiskScore(riskScore?: number): number {
  if (riskScore === undefined || riskScore === null) {
    return -1; // Otomatik hesaplanacak
  }

  if (typeof riskScore !== "number" || isNaN(riskScore)) {
    throw new ValidationError("riskScore geçerli bir sayı olmalıdır");
  }

  if (riskScore < 0 || riskScore > 100) {
    throw new ValidationError("riskScore 0-100 arasında olmalıdır");
  }

  return riskScore;
}

/**
 * Risk level validasyonu
 */
export function validateRiskLevel(riskLevel?: string): string | undefined {
  if (!riskLevel) {
    return undefined; // Otomatik hesaplanacak
  }

  const validLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (!validLevels.includes(riskLevel.toUpperCase())) {
    throw new ValidationError(
      `riskLevel geçerli bir değer olmalıdır: ${validLevels.join(", ")}`
    );
  }

  return riskLevel.toUpperCase();
}

/**
 * Risk factors array validasyonu
 */
export function validateRiskFactors(riskFactors?: any): string[] {
  if (!riskFactors) {
    return [];
  }

  if (!Array.isArray(riskFactors)) {
    throw new ValidationError("riskFactors bir array olmalıdır");
  }

  // Array uzunluk kontrolü (DoS önleme)
  if (riskFactors.length > 50) {
    throw new ValidationError("riskFactors çok fazla öğe içeriyor (max 50)");
  }

  // Her bir factor string olmalı
  const validated: string[] = [];
  for (const factor of riskFactors) {
    if (typeof factor !== "string") {
      throw new ValidationError("riskFactors içindeki her öğe string olmalıdır");
    }

    // XSS kontrolü
    if (
      factor.includes("<") ||
      factor.includes(">") ||
      factor.length > 200
    ) {
      throw new ValidationError("riskFactors güvenlik riski içeriyor");
    }

    validated.push(factor.trim());
  }

  return validated;
}

/**
 * Pods array validasyonu
 */
export function validatePods(pods?: any): Array<{ namespace: string; name: string }> {
  if (!pods) {
    return [];
  }

  if (!Array.isArray(pods)) {
    throw new ValidationError("pods bir array olmalıdır");
  }

  // Array uzunluk kontrolü (DoS önleme)
  if (pods.length > 1000) {
    throw new ValidationError("pods çok fazla öğe içeriyor (max 1000)");
  }

  const validated: Array<{ namespace: string; name: string }> = [];
  for (const pod of pods) {
    if (!pod || typeof pod !== "object") {
      throw new ValidationError("pods içindeki her öğe object olmalıdır");
    }

    if (!pod.namespace || typeof pod.namespace !== "string") {
      throw new ValidationError("pod.namespace geçerli bir string olmalıdır");
    }

    if (!pod.name || typeof pod.name !== "string") {
      throw new ValidationError("pod.name geçerli bir string olmalıdır");
    }

    // XSS ve path traversal kontrolü
    const namespace = pod.namespace.trim();
    const name = pod.name.trim();

    if (
      namespace.length > 100 ||
      name.length > 100 ||
      namespace.includes("..") ||
      name.includes("..") ||
      namespace.includes("<") ||
      name.includes("<")
    ) {
      throw new ValidationError("pod namespace veya name güvenlik riski içeriyor");
    }

    validated.push({ namespace, name });
  }

  return validated;
}

/**
 * Cluster ID validasyonu
 */
export function validateClusterId(clusterId?: string): string | undefined {
  if (!clusterId) {
    return undefined;
  }

  if (typeof clusterId !== "string") {
    throw new ValidationError("clusterId geçerli bir string olmalıdır");
  }

  if (clusterId.length > 100) {
    throw new ValidationError("clusterId çok uzun (max 100 karakter)");
  }

  // XSS ve injection kontrolü
  if (
    clusterId.includes("<") ||
    clusterId.includes(">") ||
    clusterId.includes("..") ||
    clusterId.includes("'") ||
    clusterId.includes('"')
  ) {
    throw new ValidationError("clusterId güvenlik riski içeriyor");
  }

  return clusterId.trim();
}

/**
 * Project ID validasyonu
 */
export function validateProjectId(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }

  if (typeof projectId !== "string") {
    throw new ValidationError("projectId geçerli bir string olmalıdır");
  }

  if (projectId.length > 100) {
    throw new ValidationError("projectId çok uzun (max 100 karakter)");
  }

  // XSS ve injection kontrolü
  if (
    projectId.includes("<") ||
    projectId.includes(">") ||
    projectId.includes("..") ||
    projectId.includes("'") ||
    projectId.includes('"')
  ) {
    throw new ValidationError("projectId güvenlik riski içeriyor");
  }

  return projectId.trim();
}

/**
 * Bulk images limit kontrolü
 */
export function validateBulkImagesLimit(images: any[]): void {
  if (!Array.isArray(images)) {
    throw new ValidationError("images bir array olmalıdır");
  }

  // DoS önleme: maksimum image sayısı
  const MAX_BULK_IMAGES = 100;
  if (images.length > MAX_BULK_IMAGES) {
    throw new ValidationError(
      `Çok fazla image gönderildi (max ${MAX_BULK_IMAGES})`
    );
  }

  if (images.length === 0) {
    throw new ValidationError("En az bir image gönderilmelidir");
  }
}

