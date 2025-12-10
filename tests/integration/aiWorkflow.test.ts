/**
 * Integration Tests - AI Workflow
 * 
 * Tests the complete AI workflow from image scanning to AI analysis
 */

import { MLRiskPredictionService } from "../../src/services/mlRiskPredictionService";
import { AIAnomalyDetectionService } from "../../src/services/aiAnomalyDetectionService";
import { IntelligentRecommendationService } from "../../src/services/intelligentRecommendationService";
import { ImageRiskModel } from "../../src/persistence/imageRisk.model";
import { ScanRunModel } from "../../src/persistence/scanRun.model";

jest.mock("../../src/persistence/imageRisk.model");
jest.mock("../../src/persistence/scanRun.model");

describe("AI Workflow Integration", () => {
  let predictionService: MLRiskPredictionService;
  let anomalyService: AIAnomalyDetectionService;
  let recommendationService: IntelligentRecommendationService;

  beforeEach(() => {
    predictionService = new MLRiskPredictionService();
    anomalyService = new AIAnomalyDetectionService();
    recommendationService = new IntelligentRecommendationService();
    jest.clearAllMocks();
  });

  it("should complete full AI workflow for an image", async () => {
    const mockImage = {
      imageName: "nginx:latest",
      riskScore: 85,
      riskLevel: "CRITICAL",
      riskFactors: ["Uses latest tag", "Uses root user"],
      pods: [{ namespace: "prod", name: "pod-1" }],
      lastScannedAt: new Date(),
      clusterId: "test-cluster",
    };

    const mockImages = Array.from({ length: 20 }, (_, i) => ({
      ...mockImage,
      imageName: `test-image-${i}`,
      riskScore: Math.random() * 100,
    }));

    // Mock ScanRunModel
    const mockScanRuns = Array.from({ length: 10 }, (_, i) => ({
      _id: `scan-${i}`,
      status: "COMPLETED",
      startedAt: new Date(),
      images: mockImages.slice(0, 2).map(img => ({
        imageName: img.imageName,
        clusterId: "test-cluster",
        riskScore: img.riskScore,
      })),
    }));

    (ScanRunModel.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockScanRuns),
        }),
      }),
    });

    // Mock ImageRiskModel
    (ImageRiskModel.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      exec: jest.fn().mockResolvedValue(mockImages),
    });

    (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockImages[0]),
    });

    // Train models
    await Promise.all([
      predictionService.trainModel("test-cluster"),
      anomalyService.trainModel("test-cluster"),
      recommendationService.trainPriorityModel(),
    ]);

    // Run AI workflow
    const [prediction, anomaly, recommendations] = await Promise.all([
      predictionService.predictRisk(mockImage as any),
      anomalyService.detectAIAnomaly(mockImage as any),
      recommendationService.scoreRecommendations(
        mockImage as any,
        [
          {
            id: "rec-1",
            type: "CRITICAL",
            title: "Versioned tag'e geç",
            riskFactor: "Uses latest tag",
            action: "Update tag",
            impact: "High",
            effort: "LOW" as const,
            estimatedRiskReduction: 30,
          },
        ] as any,
        "test-cluster"
      ),
    ]);

    // Assertions
    expect(prediction).toBeDefined();
    expect(prediction.predictedRiskScore).toBeGreaterThanOrEqual(0);
    expect(anomaly).toBeDefined();
    expect(anomaly.isAnomaly).toBeDefined();
    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

