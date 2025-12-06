import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { parseImageName, compareTags, groupImagesByRepository } from "../utils/imageParser";

export interface ImageUpdateRecommendation {
  id: string;
  currentImage: string;
  currentTag: string;
  recommendedTag: string;
  recommendedImage: string;
  updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST";
  priority: number; // 1-10
  reason: string;
  riskReduction: number; // Tahmini risk skoru azalması
  effort: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  currentRiskScore: number;
  estimatedNewRiskScore: number;
}

export class ImageUpdateRecommendationService {
  /**
   * Tüm image'ler için güncelleme önerileri üretir
   */
  generateUpdateRecommendations(
    images: ImageRiskDocument[]
  ): ImageUpdateRecommendation[] {
    const recommendations: ImageUpdateRecommendation[] = [];

    // Image'leri repository'ye göre grupla
    const groupedByRepo = groupImagesByRepository(
      images.map((img) => ({ imageName: img.imageName }))
    );

    // Her repository için güncelleme önerileri üret
    groupedByRepo.forEach((repoImages, baseName) => {
      // Aynı repository'deki tüm image'leri bul
      const repoImageRisks = images.filter((img) => {
        const parsed = parseImageName(img.imageName);
        return parsed.baseName === baseName;
      });

      if (repoImageRisks.length <= 1) {
        return; // Tek image varsa güncelleme önerisi yok
      }

      // Tag'leri sırala (en yeniden en eskiye)
      const sortedImages = [...repoImageRisks].sort((a, b) => {
        const parsedA = parseImageName(a.imageName);
        const parsedB = parseImageName(b.imageName);
        return compareTags(parsedB.tag, parsedA.tag); // Ters sıralama (yeni -> eski)
      });

      // Her image için daha yeni versiyonları kontrol et
      repoImageRisks.forEach((currentImage) => {
        const currentParsed = parseImageName(currentImage.imageName);
        const currentTag = currentParsed.tag;

        // Daha yeni tag'leri bul
        const newerImages = sortedImages.filter((img) => {
          const parsed = parseImageName(img.imageName);
          const comparison = compareTags(parsed.tag, currentTag);
          return comparison > 0; // Daha yeni
        });

        if (newerImages.length === 0) {
          return; // Daha yeni versiyon yok
        }

        // En yeni versiyonu öner
        const latestImage = newerImages[0];
        const latestParsed = parseImageName(latestImage.imageName);

        // Güncelleme tipini belirle
        const updateType = this.determineUpdateType(currentTag, latestParsed.tag);
        const priority = this.calculatePriority(currentImage, latestImage, updateType);
        const riskReduction = this.estimateRiskReduction(currentImage, latestImage);

        recommendations.push({
          id: `update-${currentImage.imageName}-${latestImage.imageName}`,
          currentImage: currentImage.imageName,
          currentTag: currentTag,
          recommendedTag: latestParsed.tag,
          recommendedImage: latestImage.imageName,
          updateType,
          priority,
          reason: this.getUpdateReason(currentImage, latestImage, updateType),
          riskReduction,
          effort: this.estimateEffort(updateType),
          description: this.getDescription(currentImage, latestImage, updateType),
          currentRiskScore: currentImage.riskScore,
          estimatedNewRiskScore: Math.max(0, currentImage.riskScore - riskReduction),
        });
      });
    });

    // Önceliğe göre sırala
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Belirli bir image için güncelleme önerileri üretir
   */
  generateImageUpdateRecommendations(
    image: ImageRiskDocument,
    allImages: ImageRiskDocument[]
  ): ImageUpdateRecommendation[] {
    const parsed = parseImageName(image.imageName);
    const baseName = parsed.baseName;

    // Aynı repository'deki diğer image'leri bul
    const repoImages = allImages.filter((img) => {
      const imgParsed = parseImageName(img.imageName);
      return imgParsed.baseName === baseName && img.imageName !== image.imageName;
    });

    if (repoImages.length === 0) {
      return [];
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
      return [];
    }

    const recommendations: ImageUpdateRecommendation[] = [];

    // En yeni 3 versiyonu öner
    newerImages.slice(0, 3).forEach((newerImage) => {
      const newerParsed = parseImageName(newerImage.imageName);
      const updateType = this.determineUpdateType(parsed.tag, newerParsed.tag);
      const priority = this.calculatePriority(image, newerImage, updateType);
      const riskReduction = this.estimateRiskReduction(image, newerImage);

      recommendations.push({
        id: `update-${image.imageName}-${newerImage.imageName}`,
        currentImage: image.imageName,
        currentTag: parsed.tag,
        recommendedTag: newerParsed.tag,
        recommendedImage: newerImage.imageName,
        updateType,
        priority,
        reason: this.getUpdateReason(image, newerImage, updateType),
        riskReduction,
        effort: this.estimateEffort(updateType),
        description: this.getDescription(image, newerImage, updateType),
        currentRiskScore: image.riskScore,
        estimatedNewRiskScore: Math.max(0, image.riskScore - riskReduction),
      });
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Güncelleme tipini belirler
   */
  private determineUpdateType(currentTag: string, newTag: string): "PATCH" | "MINOR" | "MAJOR" | "LATEST" {
    if (newTag === "latest") {
      return "LATEST";
    }

    // Semantic versioning kontrolü
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

    // Tarih formatı kontrolü
    const currentDate = currentTag.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const newDate = newTag.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (currentDate && newDate) {
      const daysDiff = Math.floor(
        (new Date(newDate[0]).getTime() - new Date(currentDate[0]).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 90) {
        return "MAJOR";
      } else if (daysDiff > 30) {
        return "MINOR";
      } else {
        return "PATCH";
      }
    }

    return "MINOR"; // Varsayılan
  }

  /**
   * Öncelik hesaplar
   */
  private calculatePriority(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument,
    updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST"
  ): number {
    let priority = 5; // Varsayılan

    // Risk seviyesine göre
    if (currentImage.riskLevel === "CRITICAL") priority += 3;
    else if (currentImage.riskLevel === "HIGH") priority += 2;
    else if (currentImage.riskLevel === "MEDIUM") priority += 1;

    // Güncelleme tipine göre
    if (updateType === "LATEST") priority += 2;
    else if (updateType === "MAJOR") priority += 1;

    // Production namespace'inde çalışıyorsa
    const prodPods = currentImage.pods.filter((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });
    if (prodPods.length > 0) {
      priority += 2;
    }

    // Risk skoru farkına göre
    const riskDiff = currentImage.riskScore - newImage.riskScore;
    if (riskDiff > 20) priority += 2;
    else if (riskDiff > 10) priority += 1;

    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Risk azalması tahmin eder
   */
  private estimateRiskReduction(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument
  ): number {
    // Yeni image'in risk skoruna göre tahmin
    const riskDiff = currentImage.riskScore - newImage.riskScore;

    // Eğer yeni image daha düşük riskli ise
    if (riskDiff > 0) {
      return Math.min(riskDiff, 50); // Maksimum 50 puan azalma
    }

    // Genel tahmin (eski image'ler genelde daha riskli)
    const currentParsed = parseImageName(currentImage.imageName);
    const newParsed = parseImageName(newImage.imageName);

    // Latest tag'den belirli bir tag'e geçiş
    if (currentParsed.tag === "latest" && newParsed.tag !== "latest") {
      return 40; // Latest tag riskini kaldırır
    }

    // Eski tag'den yeni tag'e geçiş
    const currentAge = this.estimateImageAge(currentParsed.tag);
    const newAge = this.estimateImageAge(newParsed.tag);

    if (currentAge > 180 && newAge < 90) {
      return 15; // Eski image'den yeni image'e geçiş
    }

    return 5; // Varsayılan azalma
  }

  /**
   * Image yaşını tahmin eder (gün cinsinden)
   */
  private estimateImageAge(tag: string): number {
    // Tarih formatı kontrolü
    const dateMatch = tag.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const tagDate = new Date(dateMatch[0]);
      const now = new Date();
      return Math.floor((now.getTime() - tagDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Semantic versioning'den tahmin (basit bir yaklaşım)
    const semver = tag.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (semver) {
      const major = parseInt(semver[1], 10);
      const minor = parseInt(semver[2], 10);
      // Daha yüksek versiyonlar genelde daha yenidir
      return Math.max(0, 365 - (major * 30 + minor * 10));
    }

    return 180; // Varsayılan yaş
  }

  /**
   * Uygulama zorluğunu tahmin eder
   */
  private estimateEffort(updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST"): "LOW" | "MEDIUM" | "HIGH" {
    switch (updateType) {
      case "PATCH":
        return "LOW";
      case "MINOR":
        return "MEDIUM";
      case "MAJOR":
      case "LATEST":
        return "HIGH";
    }
  }

  /**
   * Güncelleme nedeni üretir
   */
  private getUpdateReason(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument,
    updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST"
  ): string {
    const reasons: string[] = [];

    if (updateType === "LATEST") {
      reasons.push("Latest tag yerine belirli bir versiyon kullanılmalı");
    }

    if (currentImage.riskScore > newImage.riskScore) {
      reasons.push(`Risk skoru ${currentImage.riskScore}'dan ${newImage.riskScore}'a düşecek`);
    }

    const currentParsed = parseImageName(currentImage.imageName);
    const newParsed = parseImageName(newImage.imageName);

    if (currentParsed.tag === "latest") {
      reasons.push("Latest tag değişken olduğu için risklidir");
    }

    const currentAge = this.estimateImageAge(currentParsed.tag);
    if (currentAge > 180) {
      reasons.push("Image 180 günden eski, güvenlik yamaları eksik olabilir");
    }

    return reasons.join(". ") || "Daha yeni versiyon mevcut";
  }

  /**
   * Açıklama üretir
   */
  private getDescription(
    currentImage: ImageRiskDocument,
    newImage: ImageRiskDocument,
    updateType: "PATCH" | "MINOR" | "MAJOR" | "LATEST"
  ): string {
    const currentParsed = parseImageName(currentImage.imageName);
    const newParsed = parseImageName(newImage.imageName);

    const updateTypeLabels = {
      PATCH: "patch",
      MINOR: "minor",
      MAJOR: "major",
      LATEST: "latest",
    };

    return `${currentParsed.tag} versiyonundan ${newParsed.tag} versiyonuna ${updateTypeLabels[updateType]} güncelleme önerilir.`;
  }
}

