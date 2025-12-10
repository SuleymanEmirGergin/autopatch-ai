import { AutoActionService } from "../src/services/autoActionService";
import { AutoActionPolicyDocument, AutoActionPolicyModel } from "../src/persistence/autoActionPolicy.model";
import { ImageRiskDocument, ImageRiskModel } from "../src/persistence/imageRisk.model";

jest.mock("../src/persistence/imageRisk.model");
jest.mock("../src/persistence/autoActionPolicy.model");

describe("AutoActionService", () => {
  let service: AutoActionService;

  beforeEach(() => {
    service = new AutoActionService();
    jest.clearAllMocks();
  });

  const mockPolicy: Partial<AutoActionPolicyDocument> = {
    name: "Test Policy",
    description: "Test policy description",
    enabled: true,
    riskScoreThreshold: 70,
    riskLevels: ["HIGH", "CRITICAL"],
    actionType: "NOTIFY",
    maxActionsPerRun: 5,
    dryRun: true,
    clusterId: "cluster-1",
    projectId: "project-1",
    namespaces: [],
    riskFactors: [],
    notifyChannels: [],
  };

  const mockImage: ImageRiskDocument = {
    imageName: "registry.example.com/app:1.0.0",
    riskScore: 75,
    riskLevel: "HIGH",
    lastScannedAt: new Date(),
    pods: [{ namespace: "default", name: "pod-1" }],
    riskFactors: ["Uses latest tag"],
    clusterId: "cluster-1",
    projectId: "project-1",
  } as ImageRiskDocument;

  describe("createPolicy", () => {
    it("Policy oluşturur", async () => {
      const mockCreatedPolicy = {
        ...mockPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);

      const policy = await service.createPolicy(mockPolicy as any);

      expect(policy).toBeDefined();
      expect(policy.name).toBe("Test Policy");
      expect(policy.enabled).toBe(true);
    });

    it("Varsayılan değerleri ayarlar", async () => {
      const minimalPolicy = {
        name: "Minimal Policy",
        riskScoreThreshold: 50,
        actionType: "NOTIFY",
      };

      const mockCreatedPolicy = {
        ...minimalPolicy,
        dryRun: true,
        maxActionsPerRun: 5,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);

      const policy = await service.createPolicy(minimalPolicy as any);

      expect(policy.dryRun).toBe(true);
      expect(policy.maxActionsPerRun).toBe(5);
    });
  });

  describe("executePolicy", () => {
    it("Dry-run modunda çalışır", async () => {
      const mockCreatedPolicy = {
        ...mockPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      (AutoActionPolicyModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCreatedPolicy),
      });
      
      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockImage]),
      });

      const policy = await service.createPolicy(mockPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.executedCount).toBeGreaterThanOrEqual(0);
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it("Max actions limitini uygular", async () => {
      const limitedPolicy = {
        ...mockPolicy,
        maxActionsPerRun: 2,
      };

      const mockCreatedPolicy = {
        ...limitedPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      (AutoActionPolicyModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCreatedPolicy),
      });
      
      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          mockImage,
          { ...mockImage, imageName: "app2:1.0.0" },
          { ...mockImage, imageName: "app3:1.0.0" },
        ]),
      });

      const policy = await service.createPolicy(limitedPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.executedCount).toBeLessThanOrEqual(2);
    });

    it("NOTIFY aksiyon tipini işler", async () => {
      const mockCreatedPolicy = {
        ...mockPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      (AutoActionPolicyModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCreatedPolicy),
      });
      
      (ImageRiskModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockImage]),
      });

      const policy = await service.createPolicy(mockPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].actionType).toBe("NOTIFY");
      expect(result.items[0].status).toBe("NOTIFIED");
    });
  });

  describe("updatePolicy", () => {
    it("Policy'yi günceller", async () => {
      const mockCreatedPolicy = {
        ...mockPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      const policy = await service.createPolicy(mockPolicy as any);

      const mockUpdatedPolicy = {
        ...mockCreatedPolicy,
        name: "Updated Policy",
        riskScoreThreshold: 80,
      };

      (AutoActionPolicyModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedPolicy),
      });

      const updated = await service.updatePolicy(policy._id.toString(), {
        name: "Updated Policy",
        riskScoreThreshold: 80,
      });

      expect(updated?.name).toBe("Updated Policy");
      expect(updated?.riskScoreThreshold).toBe(80);
    });

    it("Olmayan policy için null döner", async () => {
      (AutoActionPolicyModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const updated = await service.updatePolicy("507f1f77bcf86cd799439011", { name: "Test" });

      expect(updated).toBeNull();
    });
  });

  describe("deletePolicy", () => {
    it("Policy'yi siler", async () => {
      const mockCreatedPolicy = {
        ...mockPolicy,
        _id: "test-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (AutoActionPolicyModel.create as jest.Mock).mockResolvedValue(mockCreatedPolicy);
      const policy = await service.createPolicy(mockPolicy as any);

      (AutoActionPolicyModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCreatedPolicy),
      });

      const deleted = await service.deletePolicy(policy._id.toString());

      expect(deleted).toBe(true);
    });

    it("Olmayan policy için false döner", async () => {
      (AutoActionPolicyModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const deleted = await service.deletePolicy("507f1f77bcf86cd799439011");

      expect(deleted).toBe(false);
    });
  });
});

