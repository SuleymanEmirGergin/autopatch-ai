import { Request, Response, NextFunction } from "express";
import { RemediationScriptService, ScriptType } from "../../services/remediationScriptService";
import { RemediationExecutionService } from "../../services/remediationExecutionService";
import { ImageRiskDocument } from "../../persistence/imageRisk.model";
import { ScanService } from "../../services/scanService";

export class RemediationController {
  private scriptService: RemediationScriptService;
  private executionService: RemediationExecutionService;
  private scanService: ScanService;

  constructor(scanService: ScanService) {
    this.scriptService = new RemediationScriptService();
    this.executionService = new RemediationExecutionService();
    this.scanService = scanService;
  }

  /**
   * Belirli bir image için remediation script'lerini getirir
   */
  getImageRemediationScripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName } = req.params;
      const { clusterId, projectId, scriptTypes } = req.query;

      const images = await this.scanService.listImages(
        clusterId as string | undefined,
        projectId as string | undefined
      );

      const image = images.find((img) => img.imageName === imageName);
      if (!image) {
        return res.status(404).json({ error: "Image bulunamadı" });
      }

      const requestedTypes: ScriptType[] = scriptTypes
        ? (scriptTypes as string).split(",").map((t) => t.trim() as ScriptType)
        : ["bash", "kubectl", "github-actions", "gitlab-ci"];

      const scripts = this.scriptService.generateScripts(image, requestedTypes);

      res.json({
        image: {
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
          riskFactors: image.riskFactors,
        },
        scripts,
        totalScripts: scripts.length,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Remediation script'ini çalıştırır (dry-run veya gerçek)
   */
  executeRemediation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageName, scriptId } = req.params;
      const { dryRun, namespace, parameters } = req.body;

      const images = await this.scanService.listImages();
      const image = images.find((img) => img.imageName === imageName);
      if (!image) {
        return res.status(404).json({ error: "Image bulunamadı" });
      }

      // Script'i oluştur
      const scripts = this.scriptService.generateScripts(image);
      const script = scripts.find((s) => s.id === scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script bulunamadı" });
      }

      // Execution'ı çalıştır
      const result = await this.executionService.executeRemediation(image, script, {
        dryRun: dryRun !== false, // Varsayılan olarak dry-run
        namespace: namespace as string | undefined,
        parameters: parameters as Record<string, string> | undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Batch remediation execution
   */
  executeBatchRemediation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageNames, scriptIds, dryRun, namespace } = req.body;

      if (!imageNames || !Array.isArray(imageNames) || imageNames.length === 0) {
        return res.status(400).json({ error: "imageNames array gereklidir" });
      }

      if (!scriptIds || !Array.isArray(scriptIds) || scriptIds.length === 0) {
        return res.status(400).json({ error: "scriptIds array gereklidir" });
      }

      const images = await this.scanService.listImages();
      const targetImages = images.filter((img) => imageNames.includes(img.imageName));

      if (targetImages.length !== imageNames.length) {
        return res.status(404).json({ error: "Bazı image'ler bulunamadı" });
      }

      // Script'leri oluştur
      const allScripts: any[] = [];
      targetImages.forEach((image) => {
        const scripts = this.scriptService.generateScripts(image);
        const selectedScripts = scripts.filter((s) => scriptIds.includes(s.id));
        allScripts.push(...selectedScripts);
      });

      // Batch execution
      const results = await this.executionService.executeBatchRemediation(
        targetImages,
        allScripts,
        {
          dryRun: dryRun !== false,
          namespace: namespace as string | undefined,
        }
      );

      res.json({
        totalExecutions: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Seçilen image'ler için script üretip (opsiyonel riskFactor/scriptType filtresi), toplu çalıştırır
   */
  bulkGenerateAndExecute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        imageNames,
        scriptTypes,
        riskFactors,
        dryRun,
        namespace,
      }: {
        imageNames: string[];
        scriptTypes?: string[];
        riskFactors?: string[];
        dryRun?: boolean;
        namespace?: string;
      } = req.body;

      if (!imageNames || !Array.isArray(imageNames) || imageNames.length === 0) {
        return res.status(400).json({ error: "imageNames array gereklidir" });
      }

      const allImages = await this.scanService.listImages();
      const targetImages: ImageRiskDocument[] = allImages.filter((img) => imageNames.includes(img.imageName));

      if (targetImages.length !== imageNames.length) {
        return res.status(404).json({ error: "Bazı image'ler bulunamadı" });
      }

      const allScripts: any[] = [];

      targetImages.forEach((image) => {
        const scripts = this.scriptService.generateScripts(
          image,
          scriptTypes && scriptTypes.length > 0 ? (scriptTypes as any) : ["bash", "kubectl", "github-actions", "gitlab-ci"]
        );

        const filtered = scripts.filter((s) => {
          const riskMatch = !riskFactors || riskFactors.length === 0 || riskFactors.includes(s.riskFactor);
          return riskMatch;
        });

        // Her image için en yüksek risk azaltma etkili script'i seç
        if (filtered.length > 0) {
          const best = filtered.sort((a, b) => b.estimatedRiskReduction - a.estimatedRiskReduction)[0];
          allScripts.push(best);
        }
      });

      if (allScripts.length === 0) {
        return res.status(400).json({ error: "Uygulanabilir script bulunamadı" });
      }

      const results = await this.executionService.executeBatchRemediation(targetImages, allScripts, {
        dryRun: dryRun !== false,
        namespace: namespace as string | undefined,
      });

      res.json({
        totalExecutions: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } catch (err) {
      next(err);
    }
  };
}
