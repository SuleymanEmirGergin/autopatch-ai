/**
 * Performance Tests - AI Services
 * 
 * Tests the performance of AI services to ensure they meet requirements
 */

import { MLRiskPredictionService } from "../../src/services/mlRiskPredictionService";
import { AIAnomalyDetectionService } from "../../src/services/aiAnomalyDetectionService";

describe("AI Performance Tests", () => {
  let predictionService: MLRiskPredictionService;
  let anomalyService: AIAnomalyDetectionService;

  beforeEach(() => {
    predictionService = new MLRiskPredictionService();
    anomalyService = new AIAnomalyDetectionService();
  });

  it("should predict risk within acceptable time", async () => {
    const mockImage = {
      imageName: "test-image",
      riskScore: 75,
      riskLevel: "HIGH",
      riskFactors: ["Uses latest tag"],
      pods: [],
      lastScannedAt: new Date(),
      clusterId: "test-cluster",
    };

    const startTime = Date.now();
    await predictionService.predictRisk(mockImage as any);
    const endTime = Date.now();

    const duration = endTime - startTime;
    // Should complete within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  it("should handle bulk predictions efficiently", async () => {
    const mockImages = Array.from({ length: 10 }, (_, i) => ({
      imageName: `test-image-${i}`,
      riskScore: 50,
      riskLevel: "MEDIUM",
      riskFactors: [],
      pods: [],
      lastScannedAt: new Date(),
      clusterId: "test-cluster",
    }));

    const startTime = Date.now();
    // Bulk prediction için her image'i tek tek predict et
    for (const image of mockImages) {
      await predictionService.predictRisk(image as any);
    }
    const endTime = Date.now();

    const duration = endTime - startTime;
    // 10 predictions should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it("should detect anomaly within acceptable time", async () => {
    const mockImage = {
      imageName: "test-image",
      riskScore: 85,
      riskLevel: "CRITICAL",
      riskFactors: ["Uses latest tag", "Uses root user"],
      pods: [],
      lastScannedAt: new Date(),
      clusterId: "test-cluster",
    };

    const startTime = Date.now();
    await anomalyService.detectAIAnomaly(mockImage as any);
    const endTime = Date.now();

    const duration = endTime - startTime;
    // Should complete within 2 seconds
    expect(duration).toBeLessThan(2000);
  });
});

