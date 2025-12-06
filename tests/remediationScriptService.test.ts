import { RemediationScriptService } from "../src/services/remediationScriptService";
import { ImageRiskDocument } from "../src/persistence/imageRisk.model";

describe("RemediationScriptService", () => {
  const service = new RemediationScriptService();

  const mockImage: ImageRiskDocument = {
    imageName: "registry.example.com/app:latest",
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

  describe("generateScripts", () => {
    it("Risk faktörüne göre script'ler üretir", () => {
      const scripts = service.generateScripts(mockImage);

      expect(scripts.length).toBeGreaterThan(0);
      expect(scripts.some((s) => s.riskFactor === "Uses latest tag")).toBe(true);
      expect(scripts.some((s) => s.riskFactor === "Uses root user")).toBe(true);
    });

    it("Farklı script tipleri üretir", () => {
      const scripts = service.generateScripts(mockImage, ["bash", "kubectl"]);

      const bashScripts = scripts.filter((s) => s.scriptType === "bash");
      const kubectlScripts = scripts.filter((s) => s.scriptType === "kubectl");

      expect(bashScripts.length).toBeGreaterThan(0);
      expect(kubectlScripts.length).toBeGreaterThan(0);
    });

    it("Script içeriği üretir", () => {
      const scripts = service.generateScripts(mockImage, ["bash"]);

      expect(scripts.length).toBeGreaterThan(0);
      scripts.forEach((script) => {
        expect(script.script).toBeDefined();
        expect(script.script.length).toBeGreaterThan(0);
      });
    });

    it("Risk azalması tahmini içerir", () => {
      const scripts = service.generateScripts(mockImage);

      scripts.forEach((script) => {
        expect(script.estimatedRiskReduction).toBeGreaterThanOrEqual(0);
        expect(script.effort).toMatch(/^(LOW|MEDIUM|HIGH)$/);
      });
    });

    it("Latest tag için versiyon tag script'i üretir", () => {
      const scripts = service.generateScripts(mockImage, ["bash"]);

      const latestTagScript = scripts.find((s) => s.riskFactor === "Uses latest tag");
      expect(latestTagScript).toBeDefined();
      expect(latestTagScript?.script).toContain("v1.0.0");
    });

    it("Root user için SecurityContext script'i üretir", () => {
      const scripts = service.generateScripts(mockImage, ["kubectl"]);

      const rootUserScript = scripts.find((s) => s.riskFactor === "Uses root user");
      expect(rootUserScript).toBeDefined();
      expect(rootUserScript?.script).toContain("runAsNonRoot");
      expect(rootUserScript?.script).toContain("securityContext");
    });

    it("GitHub Actions script'i üretir", () => {
      const scripts = service.generateScripts(mockImage, ["github-actions"]);

      const githubScript = scripts.find((s) => s.scriptType === "github-actions");
      expect(githubScript).toBeDefined();
      expect(githubScript?.script).toContain("on:");
      expect(githubScript?.language).toBe("yaml");
    });

    it("GitLab CI script'i üretir", () => {
      const scripts = service.generateScripts(mockImage, ["gitlab-ci"]);

      const gitlabScript = scripts.find((s) => s.scriptType === "gitlab-ci");
      expect(gitlabScript).toBeDefined();
      expect(gitlabScript?.script).toContain("stages:");
      expect(gitlabScript?.language).toBe("yaml");
    });

    it("Prerequisites ve warnings içerir", () => {
      const scripts = service.generateScripts(mockImage);

      scripts.forEach((script) => {
        if (script.prerequisites) {
          expect(Array.isArray(script.prerequisites)).toBe(true);
        }
        if (script.warnings) {
          expect(Array.isArray(script.warnings)).toBe(true);
        }
      });
    });
  });

  describe("Farklı risk faktörleri", () => {
    it("Non-production tag için script üretir", () => {
      const imageWithDevTag: ImageRiskDocument = {
        ...mockImage,
        imageName: "registry.example.com/app:dev",
        riskFactors: ["Uses non-production tag"],
      } as ImageRiskDocument;

      const scripts = service.generateScripts(imageWithDevTag);
      const devTagScript = scripts.find((s) => s.riskFactor === "Uses non-production tag");

      expect(devTagScript).toBeDefined();
    });

    it("Eski image için güncelleme script'i üretir", () => {
      const oldImage: ImageRiskDocument = {
        ...mockImage,
        riskFactors: ["Image older than 180 days"],
      } as ImageRiskDocument;

      const scripts = service.generateScripts(oldImage);
      const updateScript = scripts.find((s) => s.riskFactor === "Image older than 180 days");

      expect(updateScript).toBeDefined();
    });
  });
});

