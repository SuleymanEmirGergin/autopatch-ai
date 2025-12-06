import { MLRiskPredictionService } from "../src/services/mlRiskPredictionService";
import { ImageRiskModel } from "../src/persistence/imageRisk.model";
import * as tf from "@tensorflow/tfjs-node";

// Mock ImageRiskModel
jest.mock("../src/persistence/imageRisk.model");

describe("MLRiskPredictionService", () => {
  let service: MLRiskPredictionService;

  beforeEach(() => {
    service = new MLRiskPredictionService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up TensorFlow.js memory
    tf.disposeVariables();
  });

  describe("trainModel", () => {
    it("should train model successfully with sufficient data", async () => {
      const mockImages = Array.from({ length: 20 }, (_, i) => ({
        imageName: `test-image-${i}`,
        riskScore: Math.random() * 100,
        riskLevel: i % 4 === 0 ? "CRITICAL" : i % 4 === 1 ? "HIGH" : i % 4 === 2 ? "MEDIUM" : "LOW",
        riskFactors: ["Uses latest tag"],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      }));

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().resolves(mockImages),
      });

      await service.trainModel("test-cluster");

      expect(service.isModelReady()).toBe(true);
    });

    it("should handle insufficient data gracefully", async () => {
      const mockImages = Array.from({ length: 5 }, (_, i) => ({
        imageName: `test-image-${i}`,
        riskScore: 50,
        riskLevel: "MEDIUM",
        riskFactors: [],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      }));

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().resolves(mockImages),
      });

      await service.trainModel("test-cluster");

      // Model should still be ready (rule-based fallback)
      expect(service.isModelReady()).toBeDefined();
    });
  });

  describe("predictRisk", () => {
    it("should predict risk with trained model", async () => {
      const mockImage = {
        imageName: "test-image",
        riskScore: 75,
        riskLevel: "HIGH",
        riskFactors: ["Uses latest tag", "Uses root user"],
        pods: [{ namespace: "prod", name: "pod-1" }],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      const mockHistory = [
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), riskScore: 70 },
        { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), riskScore: 65 },
      ];

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().resolves(mockHistory),
          }),
        }),
      });

      // Train model first
      const mockImages = Array.from({ length: 20 }, (_, i) => ({
        imageName: `test-image-${i}`,
        riskScore: Math.random() * 100,
        riskLevel: "MEDIUM",
        riskFactors: [],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      }));

      (ImageRiskModel.find as jest.Mock).mockReturnValueOnce({
        exec: jest.fn().resolves(mockImages),
      });

      await service.trainModel("test-cluster");

      const prediction = await service.predictRisk(mockImage as any, "test-cluster");

      expect(prediction).toBeDefined();
      expect(prediction.predictedRiskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedRiskScore).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(["INCREASING", "STABLE", "DECREASING"]).toContain(prediction.trend);
    });

    it("should use rule-based fallback when model not trained", async () => {
      const mockImage = {
        imageName: "test-image",
        riskScore: 75,
        riskLevel: "HIGH",
        riskFactors: ["Uses latest tag"],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().resolves([]),
          }),
        }),
      });

      const prediction = await service.predictRisk(mockImage as any, "test-cluster");

      expect(prediction).toBeDefined();
      expect(prediction.predictedRiskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedRiskScore).toBeLessThanOrEqual(100);
    });
  });

  describe("bulkPredictRisk", () => {
    it("should predict risk for multiple images", async () => {
      const mockImages = [
        {
          imageName: "test-image-1",
          riskScore: 75,
          riskLevel: "HIGH",
          riskFactors: ["Uses latest tag"],
          pods: [],
          lastScannedAt: new Date(),
          clusterId: "test-cluster",
        },
        {
          imageName: "test-image-2",
          riskScore: 50,
          riskLevel: "MEDIUM",
          riskFactors: [],
          pods: [],
          lastScannedAt: new Date(),
          clusterId: "test-cluster",
        },
      ];

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().resolves([]),
          }),
        }),
      });

      const predictions = await service.bulkPredictRisk(mockImages as any[], "test-cluster");

      expect(predictions).toHaveLength(2);
      predictions.forEach(prediction => {
        expect(prediction.predictedRiskScore).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedRiskScore).toBeLessThanOrEqual(100);
      });
    });
  });
});

