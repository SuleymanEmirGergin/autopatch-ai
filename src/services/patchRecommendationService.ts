import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { SBOMDocument } from "../persistence/sbom.model";
import { parseImageName, compareTags } from "../utils/imageParser";

export interface PatchRecommendation {
  id: string;
  imageName: string;
  cveId?: string;
  packageName?: string;
  packageVersion?: string;
  fixedVersion?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: number; // 1-10
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
  publishedAt?: Date;
}

export interface PatchRecommendationsResponse {
  image: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
  };
  patches: PatchRecommendation[];
  totalPatches: number;
  criticalPatches: number;
  highPatches: number;
}

export class PatchRecommendationService {
  /**
   * Image için patch önerileri üretir
   */
  generatePatchRecommendations(
    image: ImageRiskDocument,
    sbomData?: SBOMDocument,
    allImages?: ImageRiskDocument[]
  ): PatchRecommendation[] {
    const patches: PatchRecommendation[] = [];

    // SBOM verilerinden CVE bazlı patch önerileri
    if (sbomData && sbomData.packages) {
      sbomData.packages.forEach((pkg) => {
        if (pkg.vulnerabilities && pkg.vulnerabilities.length > 0) {
          pkg.vulnerabilities.forEach((vuln) => {
            const patch = this.generateCVEBasedPatch(
              image,
              pkg,
              vuln,
              allImages || []
            );
            if (patch) {
              patches.push(patch);
            }
          });
        }
      });
    }

    // Risk faktörlerine göre patch önerileri
    image.riskFactors.forEach((factor) => {
      const factorPatches = this.generateFactorBasedPatches(image, factor, allImages || []);
      patches.push(...factorPatches);
    });

    // Eski image'ler için güncelleme patch'leri
    const updatePatches = this.generateUpdatePatches(image, allImages || []);
    patches.push(...updatePatches);

    // Önceliğe göre sırala
    return patches.sort((a, b) => b.priority - a.priority);
  }

  /**
   * CVE bazlı patch önerisi üretir
   */
  private generateCVEBasedPatch(
    image: ImageRiskDocument,
    pkg: { name: string; version: string; type: string },
    vuln: { cveId: string; severity: string; fixedVersion?: string; description: string; score: number },
    allImages: ImageRiskDocument[]
  ): PatchRecommendation | null {
    if (!vuln.fixedVersion) {
      return null; // Fixed version yoksa patch önerisi yok
    }

    const parsed = parseImageName(image.imageName);
    const affectedPods = image.pods.length;
    const affectedNamespaces = Array.from(new Set(image.pods.map((p) => p.namespace)));

    // Öncelik hesapla
    let priority = 5;
    if (vuln.severity === "CRITICAL") priority += 3;
    else if (vuln.severity === "HIGH") priority += 2;
    else if (vuln.severity === "MEDIUM") priority += 1;

    // Production namespace'inde çalışıyorsa öncelik artır
    const prodNamespaces = affectedNamespaces.filter((ns) => {
      const lower = ns.toLowerCase();
      return lower === "prod" || lower.startsWith("prod-");
    });
    if (prodNamespaces.length > 0) {
      priority += 2;
    }

    // Risk azalması tahmin et
    let riskReduction = 0;
    if (vuln.severity === "CRITICAL") riskReduction = 30;
    else if (vuln.severity === "HIGH") riskReduction = 20;
    else if (vuln.severity === "MEDIUM") riskReduction = 10;
    else riskReduction = 5;

    // Patch komutu oluştur
    const patchCommand = this.generatePatchCommand(
      parsed.baseName,
      pkg.name,
      pkg.version,
      vuln.fixedVersion,
      pkg.type
    );

    return {
      id: `patch-${image.imageName}-${vuln.cveId}`,
      imageName: image.imageName,
      cveId: vuln.cveId,
      packageName: pkg.name,
      packageVersion: pkg.version,
      fixedVersion: vuln.fixedVersion,
      severity: vuln.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      priority: Math.min(10, Math.max(1, priority)),
      title: `${vuln.cveId} - ${pkg.name} Güvenlik Açığı`,
      description: vuln.description || `${pkg.name} paketinde ${vuln.cveId} güvenlik açığı tespit edildi. ${vuln.fixedVersion} versiyonuna güncellenmelidir.`,
      patchType: "SECURITY",
      currentVersion: pkg.version,
      recommendedVersion: vuln.fixedVersion,
      riskReduction,
      effort: this.estimatePatchEffort(pkg.type, pkg.version, vuln.fixedVersion),
      affectedPods,
      affectedNamespaces,
      patchCommand,
      patchScript: this.generatePatchScript(image, pkg, vuln),
      references: [`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cveId}`],
    };
  }

  /**
   * Risk faktörüne göre patch önerileri üretir
   */
  private generateFactorBasedPatches(
    image: ImageRiskDocument,
    factor: string,
    allImages: ImageRiskDocument[]
  ): PatchRecommendation[] {
    const patches: PatchRecommendation[] = [];
    const parsed = parseImageName(image.imageName);

    if (factor === "Uses latest tag") {
      // Latest tag'den belirli versiyona geçiş patch'i
      const suggestedTag = "v1.0.0";
      patches.push({
        id: `patch-latest-tag-${image.imageName}`,
        imageName: image.imageName,
        severity: "HIGH",
        priority: 8,
        title: "Latest Tag Patch",
        description: "Latest tag yerine belirli bir versiyon kullanın",
        patchType: "SECURITY",
        currentVersion: "latest",
        recommendedVersion: suggestedTag,
        riskReduction: 40,
        effort: "LOW",
        affectedPods: image.pods.length,
        affectedNamespaces: Array.from(new Set(image.pods.map((p) => p.namespace))),
        patchCommand: `kubectl set image deployment/* -n <namespace> <container>=${parsed.baseName}:${suggestedTag}`,
        patchScript: this.generateImageUpdateScript(image, parsed.baseName, "latest", suggestedTag),
      });
    }

    if (factor === "Uses root user") {
      patches.push({
        id: `patch-root-user-${image.imageName}`,
        imageName: image.imageName,
        severity: "CRITICAL",
        priority: 9,
        title: "Root User Security Patch",
        description: "Image'i non-root user ile çalışacak şekilde patch edin",
        patchType: "SECURITY",
        currentVersion: "root",
        recommendedVersion: "non-root",
        riskReduction: 30,
        effort: "MEDIUM",
        affectedPods: image.pods.length,
        affectedNamespaces: Array.from(new Set(image.pods.map((p) => p.namespace))),
        patchCommand: `kubectl patch deployment -n <namespace> -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000}}}}}'`,
        patchScript: this.generateSecurityContextPatchScript(image),
      });
    }

    if (factor.includes("older than")) {
      // Eski image için güncelleme patch'i
      const updatePatches = this.generateUpdatePatches(image, allImages);
      patches.push(...updatePatches);
    }

    return patches;
  }

  /**
   * Güncelleme patch'leri üretir
   */
  private generateUpdatePatches(
    image: ImageRiskDocument,
    allImages: ImageRiskDocument[]
  ): PatchRecommendation[] {
    const patches: PatchRecommendation[] = [];
    const parsed = parseImageName(image.imageName);
    const baseName = parsed.baseName;

    // Aynı repository'deki daha yeni versiyonları bul
    const repoImages = allImages.filter((img) => {
      const imgParsed = parseImageName(img.imageName);
      return imgParsed.baseName === baseName && img.imageName !== image.imageName;
    });

    if (repoImages.length === 0) {
      return patches;
    }

    // Tag'leri sırala
    const sortedImages = [...repoImages].sort((a, b) => {
      const parsedA = parseImageName(a.imageName);
      const parsedB = parseImageName(b.imageName);
      return compareTags(parsedB.tag, parsedA.tag);
    });

    // Daha yeni versiyonları bul
    const newerImages = sortedImages.filter((img) => {
      const imgParsed = parseImageName(img.imageName);
      const comparison = compareTags(imgParsed.tag, parsed.tag);
      return comparison > 0;
    });

    if (newerImages.length === 0) {
      return patches;
    }

    // En yeni versiyonu öner
    const latestImage = newerImages[0];
    const latestParsed = parseImageName(latestImage.imageName);

    const updateType = this.determineUpdateType(parsed.tag, latestParsed.tag);
    const priority = this.calculatePatchPriority(image, latestImage, updateType);

    patches.push({
      id: `patch-update-${image.imageName}-${latestImage.imageName}`,
      imageName: image.imageName,
      severity: image.riskLevel === "CRITICAL" ? "CRITICAL" : image.riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
      priority,
      title: `Image Güncelleme Patch - ${updateType}`,
      description: `${parsed.tag} versiyonundan ${latestParsed.tag} versiyonuna ${updateType.toLowerCase()} güncelleme patch'i`,
      patchType: updateType === "PATCH" ? "BUGFIX" : updateType === "MINOR" ? "FEATURE" : "UPDATE",
      currentVersion: parsed.tag,
      recommendedVersion: latestParsed.tag,
      riskReduction: this.estimateRiskReduction(image, latestImage),
      effort: updateType === "PATCH" ? "LOW" : updateType === "MINOR" ? "MEDIUM" : "HIGH",
      affectedPods: image.pods.length,
      affectedNamespaces: Array.from(new Set(image.pods.map((p) => p.namespace))),
      patchCommand: `kubectl set image deployment/* -n <namespace> <container>=${baseName}:${latestParsed.tag}`,
      patchScript: this.generateImageUpdateScript(image, baseName, parsed.tag, latestParsed.tag),
    });

    return patches;
  }

  /**
   * Patch komutu üretir
   */
  private generatePatchCommand(
    baseImage: string,
    packageName: string,
    currentVersion: string,
    fixedVersion: string,
    packageType: string
  ): string {
    // Package type'a göre farklı komutlar
    if (packageType === "docker") {
      return `docker pull ${baseImage}:${fixedVersion}`;
    } else if (packageType === "npm") {
      return `npm update ${packageName}@${fixedVersion}`;
    } else if (packageType === "pip") {
      return `pip install --upgrade ${packageName}==${fixedVersion}`;
    } else if (packageType === "maven") {
      return `mvn versions:use-latest-versions -Dincludes=${packageName}`;
    } else {
      return `Update ${packageName} from ${currentVersion} to ${fixedVersion}`;
    }
  }

  /**
   * Patch script'i üretir
   */
  private generatePatchScript(
    image: ImageRiskDocument,
    pkg: { name: string; version: string },
    vuln: { cveId: string; fixedVersion?: string }
  ): string {
    const parsed = parseImageName(image.imageName);
    const namespace = image.pods.length > 0 ? image.pods[0].namespace : "default";

    return `#!/bin/bash
# Patch Script for ${vuln.cveId}
# Package: ${pkg.name}
# Current Version: ${pkg.version}
# Fixed Version: ${vuln.fixedVersion}

IMAGE_NAME="${parsed.baseName}"
NAMESPACE="${namespace}"

# Image'i güncelle (package güncellemesi için image rebuild gerekir)
# Bu script image rebuild sonrası deployment'ı günceller

kubectl set image deployment/* -n $NAMESPACE \\
  \$(kubectl get deployment -n $NAMESPACE -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):$IMAGE_NAME:${vuln.fixedVersion}

kubectl rollout restart deployment -n $NAMESPACE
kubectl rollout status deployment -n $NAMESPACE --timeout=300s

echo "Patch applied successfully for ${vuln.cveId}"
`;
  }

  /**
   * Image güncelleme script'i üretir
   */
  private generateImageUpdateScript(
    image: ImageRiskDocument,
    baseName: string,
    currentTag: string,
    newTag: string
  ): string {
    const namespace = image.pods.length > 0 ? image.pods[0].namespace : "default";

    return `#!/bin/bash
# Image Update Patch Script
# ${baseName}:${currentTag} -> ${baseName}:${newTag}

IMAGE_NAME="${baseName}"
OLD_TAG="${currentTag}"
NEW_TAG="${newTag}"
NAMESPACE="${namespace}"

# Deployment'ları güncelle
kubectl set image deployment/* -n $NAMESPACE \\
  \$(kubectl get deployment -n $NAMESPACE -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG

# StatefulSet'leri güncelle
kubectl set image statefulset/* -n $NAMESPACE \\
  \$(kubectl get statefulset -n $NAMESPACE -o jsonpath='{.items[*].spec.template.spec.containers[*].name}'):$IMAGE_NAME:$NEW_TAG

# Rollout'u başlat
kubectl rollout restart deployment -n $NAMESPACE
kubectl rollout restart statefulset -n $NAMESPACE

# Durumu kontrol et
kubectl rollout status deployment -n $NAMESPACE --timeout=300s
kubectl rollout status statefulset -n $NAMESPACE --timeout=300s

echo "Image updated from $OLD_TAG to $NEW_TAG"
`;
  }

  /**
   * SecurityContext patch script'i üretir
   */
  private generateSecurityContextPatchScript(image: ImageRiskDocument): string {
    const namespace = image.pods.length > 0 ? image.pods[0].namespace : "default";

    return `#!/bin/bash
# SecurityContext Patch Script
# Root user kullanımını kaldır

NAMESPACE="${namespace}"

# Deployment'lar için SecurityContext ekle
for deployment in \$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
  kubectl patch deployment $deployment -n $NAMESPACE --type='json' -p='[
    {
      "op": "add",
      "path": "/spec/template/spec/securityContext",
      "value": {
        "runAsNonRoot": true,
        "runAsUser": 1000,
        "fsGroup": 1000
      }
    },
    {
      "op": "add",
      "path": "/spec/template/spec/containers/0/securityContext",
      "value": {
        "allowPrivilegeEscalation": false,
        "capabilities": {
          "drop": ["ALL"]
        }
      }
    }
  ]'
done

# Pod'ları yeniden başlat
kubectl rollout restart deployment -n $NAMESPACE

echo "SecurityContext patch applied successfully"
`;
  }

  /**
   * Güncelleme tipini belirler
   */
  private determineUpdateType(currentTag: string, newTag: string): "PATCH" | "MINOR" | "MAJOR" {
    const currentSemver = currentTag.match(/^(\d+)\.(\d+)\.(\d+)/);
    const newSemver = newTag.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (currentSemver && newSemver) {
      const currentMajor = parseInt(currentSemver[1], 10);
      const currentMinor = parseInt(currentSemver[2], 10);
      const newMajor = parseInt(newSemver[1], 10);
      const newMinor = parseInt(newSemver[2], 10);

      if (newMajor > currentMajor) {
        return "MAJOR";
      } else if (newMinor > currentMinor) {
        return "MINOR";
      } else {
        return "PATCH";
      }
    }

    return "MINOR";
  }

  /**
   * Patch önceliği hesaplar
   */
  private calculatePatchPriority(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument,
    updateType: "PATCH" | "MINOR" | "MAJOR"
  ): number {
    let priority = 5;

    if (currentImage.riskLevel === "CRITICAL") priority += 3;
    else if (currentImage.riskLevel === "HIGH") priority += 2;
    else if (currentImage.riskLevel === "MEDIUM") priority += 1;

    const prodPods = currentImage.pods.filter((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });
    if (prodPods.length > 0) {
      priority += 2;
    }

    if (updateType === "MAJOR") priority += 1;

    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Risk azalması tahmin eder
   */
  private estimateRiskReduction(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument
  ): number {
    const riskDiff = currentImage.riskScore - newImage.riskScore;
    return Math.min(50, Math.max(0, riskDiff));
  }

  /**
   * Patch effort tahmin eder
   */
  private estimatePatchEffort(
    packageType: string,
    currentVersion: string,
    fixedVersion: string
  ): "LOW" | "MEDIUM" | "HIGH" {
    // Semantic versioning kontrolü
    const currentSemver = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
    const fixedSemver = fixedVersion.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (currentSemver && fixedSemver) {
      const currentMajor = parseInt(currentSemver[1], 10);
      const fixedMajor = parseInt(fixedSemver[1], 10);

      if (fixedMajor > currentMajor) {
        return "HIGH"; // Major version update
      } else {
        return "MEDIUM"; // Minor or patch update
      }
    }

    return "MEDIUM";
  }

  /**
   * Toplu patch önerileri üretir
   */
  generateBulkPatchRecommendations(
    images: ImageRiskDocument[],
    sbomDataMap?: Map<string, SBOMDocument>
  ): {
    patches: PatchRecommendation[];
    summary: {
      totalImages: number;
      totalPatches: number;
      criticalPatches: number;
      highPatches: number;
      mediumPatches: number;
      lowPatches: number;
      totalRiskReduction: number;
    };
  } {
    const allPatches: PatchRecommendation[] = [];

    images.forEach((image) => {
      const sbomData = sbomDataMap?.get(image.imageName);
      const patches = this.generatePatchRecommendations(image, sbomData, images);
      allPatches.push(...patches);
    });

    const summary = {
      totalImages: images.length,
      totalPatches: allPatches.length,
      criticalPatches: allPatches.filter((p) => p.severity === "CRITICAL").length,
      highPatches: allPatches.filter((p) => p.severity === "HIGH").length,
      mediumPatches: allPatches.filter((p) => p.severity === "MEDIUM").length,
      lowPatches: allPatches.filter((p) => p.severity === "LOW").length,
      totalRiskReduction: allPatches.reduce((sum, p) => sum + p.riskReduction, 0),
    };

    return {
      patches: allPatches.sort((a, b) => b.priority - a.priority),
      summary,
    };
  }
}

