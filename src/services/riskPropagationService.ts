import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";

export interface RiskPropagation {
  sourceImage: string;
  affectedImages: Array<{
    imageName: string;
    propagationScore: number; // 0-100, risk yayılım skoru
    path: string[]; // Yayılım yolu
    riskIncrease: number; // Risk artışı
  }>;
  totalAffected: number;
  criticalPaths: string[][]; // En kritik yayılım yolları
  recommendations: string[];
}

export interface DependencyGraph {
  nodes: Array<{
    imageName: string;
    riskScore: number;
    riskLevel: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number; // Bağımlılık gücü
    type: "BASE_IMAGE" | "DEPENDENCY" | "SHARED_NAMESPACE" | "SHARED_POD";
  }>;
}

export class RiskPropagationService {
  /**
   * Risk yayılım analizi yapar
   */
  async analyzePropagation(
    sourceImageName: string,
    clusterId?: string,
    maxDepth: number = 3
  ): Promise<RiskPropagation> {
    const sourceImage = await ImageRiskModel.findOne({
      imageName: sourceImageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!sourceImage) {
      return {
        sourceImage: sourceImageName,
        affectedImages: [],
        totalAffected: 0,
        criticalPaths: [],
        recommendations: [],
      };
    }

    // Dependency graph oluştur
    const graph = await this.buildDependencyGraph(clusterId);

    // Risk propagation hesapla
    const affectedImages = this.calculatePropagation(
      sourceImageName,
      graph,
      maxDepth
    );

    // Critical paths bul
    const criticalPaths = this.findCriticalPaths(
      sourceImageName,
      graph,
      affectedImages
    );

    // Recommendations
    const recommendations = this.generateRecommendations(
      sourceImage,
      affectedImages,
      criticalPaths
    );

    return {
      sourceImage: sourceImageName,
      affectedImages,
      totalAffected: affectedImages.length,
      criticalPaths,
      recommendations,
    };
  }

  /**
   * Dependency graph oluşturur
   */
  private async buildDependencyGraph(
    clusterId?: string
  ): Promise<DependencyGraph> {
    const images = await ImageRiskModel.find({
      ...(clusterId && { clusterId }),
    }).exec();

    const nodes = images.map(img => ({
      imageName: img.imageName,
      riskScore: img.riskScore,
      riskLevel: img.riskLevel,
    }));

    const edges: DependencyGraph["edges"] = [];

    // Shared namespace bağımlılıkları
    const namespaceMap = new Map<string, string[]>();
    images.forEach(img => {
      img.pods.forEach(pod => {
        if (!namespaceMap.has(pod.namespace)) {
          namespaceMap.set(pod.namespace, []);
        }
        namespaceMap.get(pod.namespace)!.push(img.imageName);
      });
    });

    namespaceMap.forEach((imageNames, namespace) => {
      for (let i = 0; i < imageNames.length; i++) {
        for (let j = i + 1; j < imageNames.length; j++) {
          edges.push({
            from: imageNames[i],
            to: imageNames[j],
            weight: 0.5,
            type: "SHARED_NAMESPACE",
          });
          edges.push({
            from: imageNames[j],
            to: imageNames[i],
            weight: 0.5,
            type: "SHARED_NAMESPACE",
          });
        }
      }
    });

    // Base image bağımlılıkları (basit hesaplama)
    images.forEach(img => {
      const baseImage = this.extractBaseImage(img.imageName);
      if (baseImage) {
        const baseImg = images.find(i => i.imageName.includes(baseImage));
        if (baseImg && baseImg.imageName !== img.imageName) {
          edges.push({
            from: baseImg.imageName,
            to: img.imageName,
            weight: 0.8,
            type: "BASE_IMAGE",
          });
        }
      }
    });

    return { nodes, edges };
  }

  /**
   * Base image çıkarır (basit)
   */
  private extractBaseImage(imageName: string): string | null {
    // Basit hesaplama - gerçek kullanımda SBOM data kullanılır
    const parts = imageName.split("/");
    if (parts.length > 1) {
      return parts[0]; // Registry/repo
    }
    return null;
  }

  /**
   * Risk propagation hesaplar
   */
  private calculatePropagation(
    sourceImageName: string,
    graph: DependencyGraph,
    maxDepth: number
  ): RiskPropagation["affectedImages"] {
    const affected: RiskPropagation["affectedImages"] = [];
    const visited = new Set<string>();
    const queue: Array<{ imageName: string; path: string[]; depth: number; score: number }> = [
      { imageName: sourceImageName, path: [sourceImageName], depth: 0, score: 100 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.imageName) || current.depth > maxDepth) {
        continue;
      }

      visited.add(current.imageName);

      // Source image değilse affected listesine ekle
      if (current.imageName !== sourceImageName) {
        const sourceNode = graph.nodes.find(n => n.imageName === sourceImageName);
        const currentNode = graph.nodes.find(n => n.imageName === current.imageName);

        if (sourceNode && currentNode) {
          const riskIncrease = Math.max(0, sourceNode.riskScore - currentNode.riskScore) * (current.score / 100);

          affected.push({
            imageName: current.imageName,
            propagationScore: current.score,
            path: [...current.path],
            riskIncrease: Math.round(riskIncrease),
          });
        }
      }

      // Komşuları bul
      const neighbors = graph.edges
        .filter(e => e.from === current.imageName)
        .map(e => ({
          imageName: e.to,
          weight: e.weight,
          type: e.type,
        }));

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.imageName)) {
          const newScore = current.score * neighbor.weight;
          queue.push({
            imageName: neighbor.imageName,
            path: [...current.path, neighbor.imageName],
            depth: current.depth + 1,
            score: newScore,
          });
        }
      }
    }

    return affected.sort((a, b) => b.propagationScore - a.propagationScore);
  }

  /**
   * Critical paths bulur
   */
  private findCriticalPaths(
    sourceImageName: string,
    graph: DependencyGraph,
    affectedImages: RiskPropagation["affectedImages"]
  ): string[][] {
    // En yüksek propagation score'a sahip yolları al
    const critical = affectedImages
      .filter(a => a.propagationScore > 50)
      .slice(0, 5)
      .map(a => a.path);

    return critical;
  }

  /**
   * Recommendations oluşturur
   */
  private generateRecommendations(
    sourceImage: ImageRiskDocument,
    affectedImages: RiskPropagation["affectedImages"],
    criticalPaths: string[][]
  ): string[] {
    const recommendations: string[] = [];

    if (affectedImages.length > 10) {
      recommendations.push(`${affectedImages.length} image etkilenebilir, toplu remediation önerilir`);
    }

    if (criticalPaths.length > 0) {
      recommendations.push(`${criticalPaths.length} kritik yayılım yolu tespit edildi, öncelikli ele alınmalı`);
    }

    if (sourceImage.riskLevel === "CRITICAL") {
      recommendations.push("Kritik riskli image, acil müdahale gerekli");
    }

    const highPropagation = affectedImages.filter(a => a.propagationScore > 70);
    if (highPropagation.length > 0) {
      recommendations.push(`${highPropagation.length} image yüksek risk yayılımına maruz kalıyor`);
    }

    return recommendations;
  }

  /**
   * Toplu risk yayılım analizi
   */
  async analyzeBulkPropagation(
    imageNames: string[],
    clusterId?: string
  ): Promise<Map<string, RiskPropagation>> {
    const results = new Map<string, RiskPropagation>();

    for (const imageName of imageNames) {
      try {
        const propagation = await this.analyzePropagation(imageName, clusterId);
        results.set(imageName, propagation);
      } catch (error) {
        logger.error(`Propagation analizi hatası (${imageName}):`, error);
      }
    }

    return results;
  }
}

