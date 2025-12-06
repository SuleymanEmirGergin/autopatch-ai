import { AutoActionService } from "../src/services/autoActionService";
import { AutoActionPolicyDocument } from "../src/persistence/autoActionPolicy.model";
import { ImageRiskDocument } from "../src/persistence/imageRisk.model";
import { ScanService } from "../src/services/scanService";

describe("AutoActionService", () => {
  let service: AutoActionService;
  let mockScanService: jest.Mocked<ScanService>;

  beforeEach(() => {
    mockScanService = {
      listImages: jest.fn(),
    } as any;

    service = new AutoActionService(mockScanService);
  });

  const mockPolicy: Partial<AutoActionPolicyDocument> = {
    name: "Test Policy",
    description: "Test policy description",
    enabled: true,
    riskScoreThreshold: 70,
    riskLevels: ["HIGH", "CRITICAL"],
    actionType: "NOTIFY",
    maxActions: 5,
    dryRun: true,
    clusterId: "cluster-1",
    projectId: "project-1",
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

      const policy = await service.createPolicy(minimalPolicy as any);

      expect(policy.dryRun).toBe(true);
      expect(policy.maxActions).toBe(5);
    });
  });

  describe("findMatchingImages", () => {
    it("Risk skoru threshold'una göre image'leri bulur", async () => {
      mockScanService.listImages.mockResolvedValue([
        mockImage,
        { ...mockImage, imageName: "app2:1.0.0", riskScore: 50 } as ImageRiskDocument,
      ]);

      const policy = await service.createPolicy(mockPolicy as any);
      const images = await service.findMatchingImages(policy._id.toString());

      expect(images.length).toBe(1);
      expect(images[0].riskScore).toBeGreaterThanOrEqual(70);
    });

    it("Risk seviyesine göre filtreler", async () => {
      mockScanService.listImages.mockResolvedValue([
        mockImage,
        { ...mockImage, imageName: "app2:1.0.0", riskLevel: "MEDIUM" } as ImageRiskDocument,
      ]);

      const policy = await service.createPolicy(mockPolicy as any);
      const images = await service.findMatchingImages(policy._id.toString());

      expect(images.every((img) => ["HIGH", "CRITICAL"].includes(img.riskLevel))).toBe(true);
    });

    it("Namespace filtresini uygular", async () => {
      const policyWithNamespace = {
        ...mockPolicy,
        namespaceFilter: "prod",
      };

      mockScanService.listImages.mockResolvedValue([
        { ...mockImage, pods: [{ namespace: "prod", name: "pod-1" }] },
        { ...mockImage, imageName: "app2:1.0.0", pods: [{ namespace: "dev", name: "pod-2" }] },
      ]);

      const policy = await service.createPolicy(policyWithNamespace as any);
      const images = await service.findMatchingImages(policy._id.toString());

      expect(images.every((img) => img.pods.some((p) => p.namespace === "prod"))).toBe(true);
    });
  });

  describe("executePolicy", () => {
    it("Dry-run modunda çalışır", async () => {
      mockScanService.listImages.mockResolvedValue([mockImage]);

      const policy = await service.createPolicy(mockPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBeGreaterThan(0);
      expect(result.dryRun).toBe(true);
    });

    it("Max actions limitini uygular", async () => {
      const limitedPolicy = {
        ...mockPolicy,
        maxActions: 2,
      };

      mockScanService.listImages.mockResolvedValue([
        mockImage,
        { ...mockImage, imageName: "app2:1.0.0" },
        { ...mockImage, imageName: "app3:1.0.0" },
      ]);

      const policy = await service.createPolicy(limitedPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.actionsExecuted).toBeLessThanOrEqual(2);
    });

    it("NOTIFY aksiyon tipini işler", async () => {
      mockScanService.listImages.mockResolvedValue([mockImage]);

      const policy = await service.createPolicy(mockPolicy as any);
      const result = await service.executePolicy(policy._id.toString());

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].actionType).toBe("NOTIFY");
      expect(result.items[0].status).toBe("NOTIFIED");
    });
  });

  describe("updatePolicy", () => {
    it("Policy'yi günceller", async () => {
      const policy = await service.createPolicy(mockPolicy as any);

      const updated = await service.updatePolicy(policy._id.toString(), {
        name: "Updated Policy",
        riskScoreThreshold: 80,
      });

      expect(updated?.name).toBe("Updated Policy");
      expect(updated?.riskScoreThreshold).toBe(80);
    });

    it("Olmayan policy için null döner", async () => {
      const updated = await service.updatePolicy("nonexistent-id", { name: "Test" });

      expect(updated).toBeNull();
    });
  });

  describe("deletePolicy", () => {
    it("Policy'yi siler", async () => {
      const policy = await service.createPolicy(mockPolicy as any);
      const deleted = await service.deletePolicy(policy._id.toString());

      expect(deleted).toBe(true);
    });

    it("Olmayan policy için false döner", async () => {
      const deleted = await service.deletePolicy("nonexistent-id");

      expect(deleted).toBe(false);
    });
  });
});

