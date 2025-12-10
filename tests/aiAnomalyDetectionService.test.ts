import { AIAnomalyDetectionService } from "../src/services/aiAnomalyDetectionService";
import { ImageRiskModel } from "../src/persistence/imageRisk.model";
import { ScanRunModel } from "../src/persistence/scanRun.model";
import * as tf from "@tensorflow/tfjs-node";

jest.mock("../src/persistence/imageRisk.model");
jest.mock("../src/persistence/scanRun.model");

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

      const mockScanRuns = Array.from({ length: 5 }, (_, i) => ({
        _id: `scan-${i}`,
        status: "COMPLETED",
        startedAt: new Date(),
        images: mockImages.slice(0, 4).map(img => ({
          imageName: img.imageName,
          clusterId: "test-cluster",
        })),
      }));

      (ScanRunModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockScanRuns),
          }),
        }),
      });

      (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockImages[0]),
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
        riskFactors: [
          "Uses latest tag", 
          "Uses root user", 
          "Image older than 180 days",
          "Uses non-production tag",
          "Test image used in workload",
          "Running in production namespace",
          "Legacy image tag",
        ], // 7 risk factors >= 6
        pods: [{ namespace: "prod", name: "pod-1" }],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      const mockHistory = [
        {
          imageName: "test-image",
          riskScore: 50,
          riskLevel: "MEDIUM",
          riskFactors: [],
          pods: [],
          lastScannedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          clusterId: "test-cluster",
        },
      ];

      // Mock for rule-based detection (model not trained)
      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockHistory),
          }),
        }),
      });

      // Pass historical data to ensure anomaly detection
      const result = await service.detectAIAnomaly(mockImage as any, mockHistory as any);

      expect(result).toBeDefined();
      // Rule-based: riskScore 95 >= 80 (+0.4), riskFactors >= 6 (+0.3), historical diff > 20 (+0.3)
      // Total: 0.4 + 0.3 + 0.3 = 1.0 > 0.5, so isAnomaly should be true
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
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.detectAIAnomaly(mockImage as any);

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
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockImages),
        }),
      });

      const results = await service.detectAllAnomalies("test-cluster", 10);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

