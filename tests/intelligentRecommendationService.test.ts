import { IntelligentRecommendationService } from "../src/services/intelligentRecommendationService";
import { ImageRiskModel } from "../src/persistence/imageRisk.model";
import * as tf from "@tensorflow/tfjs-node";

jest.mock("../src/persistence/imageRisk.model");

describe("IntelligentRecommendationService", () => {
  let service: IntelligentRecommendationService;

  beforeEach(() => {
    service = new IntelligentRecommendationService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    tf.disposeVariables();
  });

  describe("trainModel", () => {
    it("should train model successfully", async () => {
      const mockImages = Array.from({ length: 20 }, (_, i) => ({
        imageName: `test-image-${i}`,
        riskScore: Math.random() * 100,
        riskLevel: "MEDIUM",
        riskFactors: ["Uses latest tag"],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      }));

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockImages),
      });

      await service.trainPriorityModel();

      expect(service.isModelReady()).toBe(true);
    });
  });

  describe("scoreRecommendations", () => {
    it("should score recommendations intelligently", async () => {
      const mockImage = {
        imageName: "test-image",
        riskScore: 85,
        riskLevel: "CRITICAL",
        riskFactors: ["Uses latest tag", "Uses root user"],
        pods: [{ namespace: "prod", name: "pod-1" }],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      const mockRecommendations = [
        {
          id: "rec-1",
          type: "CRITICAL",
          title: "Versioned tag'e geç",
          description: "Latest tag yerine versioned tag kullan",
          riskFactor: "Uses latest tag",
          action: "Update image tag",
          impact: "High",
          effort: "LOW" as const,
          estimatedRiskReduction: 30,
        },
        {
          id: "rec-2",
          type: "HIGH",
          title: "Root user kaldır",
          description: "Non-root user kullan",
          riskFactor: "Uses root user",
          action: "Rebuild image",
          impact: "High",
          effort: "MEDIUM" as const,
          estimatedRiskReduction: 25,
        },
      ];

      const scored = await service.scoreRecommendations(
        mockImage as any,
        mockRecommendations as any,
        "test-cluster"
      );

      expect(scored).toBeDefined();
      expect(scored.length).toBe(2);
      scored.forEach(rec => {
        expect(rec.aiScore).toBeGreaterThanOrEqual(0);
        expect(rec.aiScore).toBeLessThanOrEqual(10);
        expect(rec.mlConfidence).toBeGreaterThanOrEqual(0);
        expect(rec.mlConfidence).toBeLessThanOrEqual(1);
        expect(rec.reasoning).toBeDefined();
      });
    });
  });
});

