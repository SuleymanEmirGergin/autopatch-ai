import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { logger } from "../utils/logger";

export interface RiskCorrelation {
  factor1: string;
  factor2: string;
  correlation: number; // -1 to 1
  significance: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
  examples: string[]; // Image names that have both factors
}

export interface CorrelationMatrix {
  factors: string[];
  correlations: number[][];
  insights: string[];
  topCorrelations: RiskCorrelation[];
}

export class RiskCorrelationService {
  /**
   * Risk faktörleri arasındaki korelasyonu analiz eder
   */
  async analyzeCorrelations(
    clusterId?: string
  ): Promise<CorrelationMatrix> {
    const images = await ImageRiskModel.find({
      ...(clusterId && { clusterId }),
    }).exec();

    if (images.length < 10) {
      logger.warn("Korelasyon analizi için yeterli veri yok (minimum 10 image gerekli)");
      return this.getEmptyMatrix();
    }

    // Tüm risk faktörlerini topla
    const allFactors = new Set<string>();
    images.forEach(img => {
      img.riskFactors.forEach(factor => allFactors.add(factor));
    });

    const factors = Array.from(allFactors);
    const n = factors.length;

    // Correlation matrix oluştur
    const correlations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlations[i][j] = 1.0; // Self-correlation
        } else {
          correlations[i][j] = this.calculateCorrelation(
            images,
            factors[i],
            factors[j]
          );
        }
      }
    }

    // Top correlations bul
    const topCorrelations = this.findTopCorrelations(factors, correlations, images);

    // Insights oluştur
    const insights = this.generateInsights(topCorrelations, images);

    return {
      factors,
      correlations,
      insights,
      topCorrelations,
    };
  }

  /**
   * İki risk faktörü arasındaki korelasyonu hesaplar
   */
  private calculateCorrelation(
    images: ImageRiskDocument[],
    factor1: string,
    factor2: string
  ): number {
    let bothCount = 0;
    let factor1Only = 0;
    let factor2Only = 0;
    let neitherCount = 0;

    images.forEach(img => {
      const hasFactor1 = img.riskFactors.includes(factor1);
      const hasFactor2 = img.riskFactors.includes(factor2);

      if (hasFactor1 && hasFactor2) bothCount++;
      else if (hasFactor1 && !hasFactor2) factor1Only++;
      else if (!hasFactor1 && hasFactor2) factor2Only++;
      else neitherCount++;
    });

    // Pearson correlation coefficient (simplified for binary variables)
    const n = images.length;
    const p1 = (bothCount + factor1Only) / n;
    const p2 = (bothCount + factor2Only) / n;
    const p12 = bothCount / n;

    if (p1 === 0 || p2 === 0) return 0;

    const correlation = (p12 - p1 * p2) / Math.sqrt(p1 * (1 - p1) * p2 * (1 - p2));

    return isNaN(correlation) ? 0 : Math.max(-1, Math.min(1, correlation));
  }

  /**
   * En yüksek korelasyonları bulur
   */
  private findTopCorrelations(
    factors: string[],
    correlations: number[][],
    images: ImageRiskDocument[]
  ): RiskCorrelation[] {
    const correlationsList: RiskCorrelation[] = [];

    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const correlation = correlations[i][j];
        const absCorrelation = Math.abs(correlation);

        if (absCorrelation > 0.2) { // Minimum threshold
          // Examples bul
          const examples = images
            .filter(img =>
              img.riskFactors.includes(factors[i]) &&
              img.riskFactors.includes(factors[j])
            )
            .slice(0, 5)
            .map(img => img.imageName);

          const significance = this.determineSignificance(absCorrelation);

          const explanation = this.generateCorrelationExplanation(
            factors[i],
            factors[j],
            correlation
          );

          correlationsList.push({
            factor1: factors[i],
            factor2: factors[j],
            correlation,
            significance,
            explanation,
            examples,
          });
        }
      }
    }

    // Sort by absolute correlation (highest first)
    return correlationsList.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Significance belirler
   */
  private determineSignificance(absCorrelation: number): "HIGH" | "MEDIUM" | "LOW" {
    if (absCorrelation > 0.6) return "HIGH";
    if (absCorrelation > 0.4) return "MEDIUM";
    return "LOW";
  }

  /**
   * Correlation explanation oluşturur
   */
  private generateCorrelationExplanation(
    factor1: string,
    factor2: string,
    correlation: number
  ): string {
    const absCorr = Math.abs(correlation);
    const direction = correlation > 0 ? "pozitif" : "negatif";

    if (absCorr > 0.6) {
      return `${factor1} ve ${factor2} arasında güçlü ${direction} korelasyon var (${correlation.toFixed(2)}). Bu faktörler genellikle birlikte görülür.`;
    } else if (absCorr > 0.4) {
      return `${factor1} ve ${factor2} arasında orta düzeyde ${direction} korelasyon var (${correlation.toFixed(2)}).`;
    } else {
      return `${factor1} ve ${factor2} arasında zayıf ${direction} korelasyon var (${correlation.toFixed(2)}).`;
    }
  }

  /**
   * Insights oluşturur
   */
  private generateInsights(
    topCorrelations: RiskCorrelation[],
    images: ImageRiskDocument[]
  ): string[] {
    const insights: string[] = [];

    // En güçlü pozitif korelasyon
    const strongPositive = topCorrelations
      .filter(c => c.correlation > 0.6)
      .slice(0, 3);

    if (strongPositive.length > 0) {
      const top = strongPositive[0];
      insights.push(
        `En güçlü pozitif korelasyon: "${top.factor1}" ve "${top.factor2}" (${top.correlation.toFixed(2)}). Bu faktörler genellikle birlikte görülüyor.`
      );
    }

    // Risk faktör kombinasyonları
    const highRiskCombinations = images.filter(img => img.riskFactors.length >= 5);
    if (highRiskCombinations.length > 0) {
      insights.push(
        `${highRiskCombinations.length} image'de 5 veya daha fazla risk faktörü birlikte görülüyor. Bu image'ler öncelikli olarak ele alınmalı.`
      );
    }

    // Yaygın kombinasyonlar
    const commonPairs = topCorrelations
      .filter(c => c.correlation > 0.4 && c.examples.length >= 3)
      .slice(0, 2);

    if (commonPairs.length > 0) {
      const pair = commonPairs[0];
      insights.push(
        `"${pair.factor1}" ve "${pair.factor2}" kombinasyonu ${pair.examples.length} image'de görülüyor. Bu kombinasyon için toplu remediation stratejisi geliştirilebilir.`
      );
    }

    return insights;
  }

  /**
   * Boş matrix döndürür
   */
  private getEmptyMatrix(): CorrelationMatrix {
    return {
      factors: [],
      correlations: [],
      insights: ["Yeterli veri yok"],
      topCorrelations: [],
    };
  }

  /**
   * Belirli bir risk faktörü için en çok korele olan faktörleri bulur
   */
  async findCorrelatedFactors(
    targetFactor: string,
    clusterId?: string
  ): Promise<Array<{
    factor: string;
    correlation: number;
    significance: "HIGH" | "MEDIUM" | "LOW";
  }>> {
    const matrix = await this.analyzeCorrelations(clusterId);
    const targetIndex = matrix.factors.indexOf(targetFactor);

    if (targetIndex === -1) {
      return [];
    }

    const correlated: Array<{
      factor: string;
      correlation: number;
      significance: "HIGH" | "MEDIUM" | "LOW";
    }> = [];

    for (let i = 0; i < matrix.factors.length; i++) {
      if (i !== targetIndex) {
        const correlation = matrix.correlations[targetIndex][i];
        const absCorr = Math.abs(correlation);

        if (absCorr > 0.2) {
          correlated.push({
            factor: matrix.factors[i],
            correlation,
            significance: this.determineSignificance(absCorr),
          });
        }
      }
    }

    return correlated.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
}

