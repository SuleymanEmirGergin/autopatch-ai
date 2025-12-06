import { ImageRiskRepository, MongoImageRiskRepository } from "../persistence/imageRisk.repository";
import { ImageRiskDocument } from "../persistence/imageRisk.model";

export interface ImageComparisonResult {
  image1: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    pods: { namespace: string; name: string }[];
    lastScannedAt: Date;
    clusterId?: string;
    projectId?: string;
  };
  image2: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    pods: { namespace: string; name: string }[];
    lastScannedAt: Date;
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

export class ImageComparisonService {
  private imageRiskRepo: ImageRiskRepository;

  constructor() {
    this.imageRiskRepo = new MongoImageRiskRepository();
  }

  /**
   * İki image'ı karşılaştırır
   */
  async compareImages(
    imageName1: string,
    imageName2: string,
    clusterId1?: string,
    clusterId2?: string
  ): Promise<ImageComparisonResult> {
    const [image1, image2] = await Promise.all([
      this.imageRiskRepo.findByImageName(imageName1, clusterId1),
      this.imageRiskRepo.findByImageName(imageName2, clusterId2 || clusterId1),
    ]);

    if (!image1) {
      throw new Error(`Image bulunamadı: ${imageName1}`);
    }
    if (!image2) {
      throw new Error(`Image bulunamadı: ${imageName2}`);
    }

    return this.calculateDifferences(image1, image2);
  }

  /**
   * İki image arasındaki farkları hesaplar
   */
  private calculateDifferences(
    image1: ImageRiskDocument,
    image2: ImageRiskDocument
  ): ImageComparisonResult {
    // Risk faktörleri karşılaştırması
    const riskFactors1 = new Set(image1.riskFactors);
    const riskFactors2 = new Set(image2.riskFactors);

    const addedRiskFactors = Array.from(riskFactors2).filter(
      (f) => !riskFactors1.has(f)
    );
    const removedRiskFactors = Array.from(riskFactors1).filter(
      (f) => !riskFactors2.has(f)
    );
    const commonRiskFactors = Array.from(riskFactors1).filter((f) =>
      riskFactors2.has(f)
    );

    // Pod karşılaştırması
    const pods1Map = new Map(
      image1.pods.map((p) => [`${p.namespace}/${p.name}`, p])
    );
    const pods2Map = new Map(
      image2.pods.map((p) => [`${p.namespace}/${p.name}`, p])
    );

    const newPods = image2.pods.filter(
      (p) => !pods1Map.has(`${p.namespace}/${p.name}`)
    );
    const removedPods = image1.pods.filter(
      (p) => !pods2Map.has(`${p.namespace}/${p.name}`)
    );
    const commonPods = image1.pods.filter((p) =>
      pods2Map.has(`${p.namespace}/${p.name}`)
    );

    // Prod pod sayıları
    const prodPods1 = image1.pods.filter((p) =>
      p.namespace.toLowerCase().match(/^prod/i)
    ).length;
    const prodPods2 = image2.pods.filter((p) =>
      p.namespace.toLowerCase().match(/^prod/i)
    ).length;

    // Risk skoru farkı
    const riskScoreDiff = image2.riskScore - image1.riskScore;
    const riskScoreChangePercent =
      image1.riskScore > 0
        ? (riskScoreDiff / image1.riskScore) * 100
        : image2.riskScore > 0
        ? 100
        : 0;

    // Risk seviyesi değişimi
    const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const level1Index = riskLevels.indexOf(image1.riskLevel);
    const level2Index = riskLevels.indexOf(image2.riskLevel);

    let riskLevelChange: "improved" | "degraded" | "same" = "same";
    if (level2Index < level1Index) {
      riskLevelChange = "improved";
    } else if (level2Index > level1Index) {
      riskLevelChange = "degraded";
    }

    // Genel değişim özeti
    const totalChanges =
      addedRiskFactors.length +
      removedRiskFactors.length +
      newPods.length +
      removedPods.length;

    const overallChange =
      riskScoreDiff < 0
        ? "improved"
        : riskScoreDiff > 0
        ? "degraded"
        : totalChanges > 0
        ? "same"
        : "same";

    return {
      image1: {
        imageName: image1.imageName,
        riskScore: image1.riskScore,
        riskLevel: image1.riskLevel,
        riskFactors: image1.riskFactors,
        pods: image1.pods,
        lastScannedAt: image1.lastScannedAt,
        clusterId: image1.clusterId,
        projectId: image1.projectId,
      },
      image2: {
        imageName: image2.imageName,
        riskScore: image2.riskScore,
        riskLevel: image2.riskLevel,
        riskFactors: image2.riskFactors,
        pods: image2.pods,
        lastScannedAt: image2.lastScannedAt,
        clusterId: image2.clusterId,
        projectId: image2.projectId,
      },
      differences: {
        riskScoreDiff,
        riskLevelChanged: image1.riskLevel !== image2.riskLevel,
        riskLevelChange,
        addedRiskFactors,
        removedRiskFactors,
        commonRiskFactors,
        podCountDiff: image2.pods.length - image1.pods.length,
        prodPodCountDiff: prodPods2 - prodPods1,
        newPods,
        removedPods,
        commonPods,
      },
      summary: {
        overallChange,
        riskScoreChangePercent,
        totalChanges,
      },
    };
  }

  /**
   * Bir image'ın zaman içindeki değişimlerini analiz eder
   */
  async analyzeImageHistory(
    imageName: string,
    clusterId?: string,
    limit = 10
  ): Promise<{
    history: Array<{
      timestamp: Date;
      riskScore: number;
      riskLevel: string;
      riskFactors: string[];
      pods: { namespace: string; name: string }[];
    }>;
    trends: {
      riskScoreTrend: "increasing" | "decreasing" | "stable";
      riskScoreChange: number;
      riskLevelChanges: number;
      riskFactorChanges: number;
    };
  }> {
    // Bu metod için ScanRunModel'e ihtiyaç var
    // Şimdilik basit bir implementasyon
    const current = await this.imageRiskRepo.findByImageName(imageName, clusterId);
    if (!current) {
      throw new Error(`Image bulunamadı: ${imageName}`);
    }

    // Geçmiş veriler için ScanRunModel kullanılabilir
    // Şimdilik sadece mevcut veriyi döndürüyoruz
    return {
      history: [
        {
          timestamp: current.lastScannedAt,
          riskScore: current.riskScore,
          riskLevel: current.riskLevel,
          riskFactors: current.riskFactors,
          pods: current.pods,
        },
      ],
      trends: {
        riskScoreTrend: "stable",
        riskScoreChange: 0,
        riskLevelChanges: 0,
        riskFactorChanges: 0,
      },
    };
  }
}

