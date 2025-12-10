import { PatchRecommendationService } from "../src/services/patchRecommendationService";
import { ImageRiskDocument } from "../src/persistence/imageRisk.model";
import { SBOMDocument } from "../src/persistence/sbom.model";

describe("PatchRecommendationService", () => {
  const service = new PatchRecommendationService();

  const mockImage: ImageRiskDocument = {
    imageName: "registry.example.com/app:1.0.0",
    riskScore: 75,
    riskLevel: "HIGH",
    lastScannedAt: new Date(),
    pods: [
      { namespace: "default", name: "pod-1" },
      { namespace: "prod", name: "pod-2" },
    ],
    riskFactors: ["Uses latest tag", "Uses root user"],
    clusterId: "cluster-1",
    projectId: "project-1",
  } as ImageRiskDocument;

  const mockSBOM: SBOMDocument = {
    imageName: "registry.example.com/app:1.0.0",
    scannedAt: new Date(),
    packages: [
      {
        name: "lodash",
        version: "4.17.20",
        type: "npm",
        vulnerabilities: [
          {
            cveId: "CVE-2021-23337",
            severity: "CRITICAL",
            score: 9.8,
            description: "Command injection vulnerability",
            fixedVersion: "4.17.21",
            publishedAt: new Date(),
            references: ["https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-23337"],
          },
        ],
      },
    ],
    totalPackages: 1,
    vulnerablePackages: 1,
    criticalVulnerabilities: 1,
    highVulnerabilities: 0,
    mediumVulnerabilities: 0,
    lowVulnerabilities: 0,
    format: "syft",
    scanner: "trivy",
  } as SBOMDocument;

  describe("generatePatchRecommendations", () => {
    it("CVE bazlı patch önerileri üretir", () => {
      const patches = service.generatePatchRecommendations(mockImage, mockSBOM);

      expect(patches.length).toBeGreaterThan(0);
      const cvePatch = patches.find((p) => p.cveId === "CVE-2021-23337");
      expect(cvePatch).toBeDefined();
      expect(cvePatch?.severity).toBe("CRITICAL");
      expect(cvePatch?.packageName).toBe("lodash");
      expect(cvePatch?.fixedVersion).toBe("4.17.21");
    });

    it("Risk faktörü bazlı patch önerileri üretir", () => {
      const patches = service.generatePatchRecommendations(mockImage);

      // Patch'ler risk faktörlerine göre üretilir, title veya description'da kontrol et
      const latestTagPatch = patches.find((p) => 
        p.title.toLowerCase().includes("latest") || p.description.toLowerCase().includes("latest tag")
      );
      expect(latestTagPatch).toBeDefined();
      expect(latestTagPatch?.patchType).toBe("SECURITY");

      const rootUserPatch = patches.find((p) => 
        p.title.toLowerCase().includes("root") || p.description.toLowerCase().includes("root user")
      );
      expect(rootUserPatch).toBeDefined();
      expect(rootUserPatch?.severity).toBe("CRITICAL");
    });

    it("Patch önerilerini önceliğe göre sıralar", () => {
      const patches = service.generatePatchRecommendations(mockImage, mockSBOM);

      expect(patches.length).toBeGreaterThan(1);
      for (let i = 0; i < patches.length - 1; i++) {
        expect(patches[i].priority).toBeGreaterThanOrEqual(patches[i + 1].priority);
      }
    });

    it("Etkilenen pod ve namespace bilgilerini içerir", () => {
      const patches = service.generatePatchRecommendations(mockImage);

      expect(patches.length).toBeGreaterThan(0);
      patches.forEach((patch) => {
        expect(patch.affectedPods).toBe(2);
        expect(patch.affectedNamespaces).toContain("default");
        expect(patch.affectedNamespaces).toContain("prod");
      });
    });

    it("Patch script'leri üretir", () => {
      const patches = service.generatePatchRecommendations(mockImage);

      const scriptPatch = patches.find((p) => p.patchScript);
      expect(scriptPatch).toBeDefined();
      expect(scriptPatch?.patchScript).toContain("kubectl");
    });
  });

  describe("generateBulkPatchRecommendations", () => {
    it("Toplu patch önerileri üretir", () => {
      const images: ImageRiskDocument[] = [
        mockImage,
        {
          ...mockImage,
          imageName: "registry.example.com/app2:2.0.0",
          riskScore: 50,
          riskLevel: "MEDIUM",
        } as ImageRiskDocument,
      ];

      const result = service.generateBulkPatchRecommendations(images);

      expect(result.patches.length).toBeGreaterThan(0);
      expect(result.summary.totalImages).toBe(2);
      expect(result.summary.totalPatches).toBeGreaterThan(0);
    });

    it("Severity bazlı istatistikler üretir", () => {
      const images: ImageRiskDocument[] = [mockImage];
      const result = service.generateBulkPatchRecommendations(images, new Map([["registry.example.com/app:1.0.0", mockSBOM]]));

      expect(result.summary.criticalPatches).toBeGreaterThanOrEqual(0);
      expect(result.summary.highPatches).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumPatches).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowPatches).toBeGreaterThanOrEqual(0);
    });

    it("Toplam risk azalması hesaplar", () => {
      const images: ImageRiskDocument[] = [mockImage];
      const result = service.generateBulkPatchRecommendations(images);

      expect(result.summary.totalRiskReduction).toBeGreaterThanOrEqual(0);
    });
  });
});

