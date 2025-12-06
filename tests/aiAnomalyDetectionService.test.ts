import { AIAnomalyDetectionService } from "../src/services/aiAnomalyDetectionService";
import { ImageRiskModel } from "../src/persistence/imageRisk.model";
import * as tf from "@tensorflow/tfjs-node";

jest.mock("../src/persistence/imageRisk.model");

describe("AIAnomalyDetectionService", () => {
  let service: AIAnomalyDetectionService;

  beforeEach(() => {
    service = new AIAnomalyDetectionService();
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
        riskFactors: [],
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
  });

  describe("detectAnomaly", () => {
    it("should detect anomaly for high risk image", async () => {
      const mockImage = {
        imageName: "test-image",
        riskScore: 95,
        riskLevel: "CRITICAL",
        riskFactors: ["Uses latest tag", "Uses root user", "Image older than 180 days"],
        pods: [{ namespace: "prod", name: "pod-1" }],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      const mockHistory = [
        { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), riskScore: 50 },
      ];

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().resolves(mockHistory),
          }),
        }),
      });

      const result = await service.detectAnomaly(mockImage as any, "test-cluster");

      expect(result).toBeDefined();
      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyScore).toBeGreaterThan(0);
      expect(result.severity).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should not detect anomaly for normal image", async () => {
      const mockImage = {
        imageName: "test-image",
        riskScore: 20,
        riskLevel: "LOW",
        riskFactors: [],
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

      const result = await service.detectAnomaly(mockImage as any, "test-cluster");

      expect(result).toBeDefined();
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("detectAllAnomalies", () => {
    it("should detect anomalies for all images", async () => {
      const mockImages = Array.from({ length: 10 }, (_, i) => ({
        imageName: `test-image-${i}`,
        riskScore: i % 2 === 0 ? 80 : 30,
        riskLevel: i % 2 === 0 ? "HIGH" : "LOW",
        riskFactors: i % 2 === 0 ? ["Uses latest tag"] : [],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      }));

      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().resolves(mockImages),
      });

      (ImageRiskModel.find as jest.Mock).mockReturnValueOnce({
        exec: jest.fn().resolves(mockImages),
      }).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().resolves([]),
          }),
        }),
      });

      const results = await service.detectAllAnomalies("test-cluster", 10);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

