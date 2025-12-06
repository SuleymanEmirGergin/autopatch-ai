import { AutoActionPolicyDocument, AutoActionPolicyModel, AutoActionType } from "../persistence/autoActionPolicy.model";
import { ImageRiskDocument, ImageRiskModel } from "../persistence/imageRisk.model";
import { RemediationExecutionService, RemediationExecutionResult } from "./remediationExecutionService";
import { RemediationScriptService, RemediationScript } from "./remediationScriptService";

export interface AutoActionExecutionItem {
  imageName: string;
  riskScore: number;
  riskLevel: string;
  matchedRiskFactors: string[];
  actionType: AutoActionType;
  dryRun: boolean;
  remediation?: {
    scriptId: string;
    scriptType: string;
    executed?: RemediationExecutionResult;
  };
  status: "EXECUTED" | "SKIPPED" | "NOTIFIED" | "FAILED";
  message: string;
}

export interface AutoActionExecutionResult {
  policyId: string;
  policyName: string;
  totalMatches: number;
  executedCount: number;
  skippedCount: number;
  items: AutoActionExecutionItem[];
}

export class AutoActionService {
  private remediationScriptService = new RemediationScriptService();
  private remediationExecutionService = new RemediationExecutionService();

  async listPolicies(clusterId?: string, projectId?: string) {
    const filter: any = {};
    if (clusterId) filter.clusterId = clusterId;
    if (projectId) filter.projectId = projectId;
    return AutoActionPolicyModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getPolicy(id: string) {
    return AutoActionPolicyModel.findById(id).exec();
  }

  async createPolicy(data: Partial<AutoActionPolicyDocument>) {
    return AutoActionPolicyModel.create(data);
  }

  async updatePolicy(id: string, data: Partial<AutoActionPolicyDocument>) {
    return AutoActionPolicyModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deletePolicy(id: string) {
    return AutoActionPolicyModel.findByIdAndDelete(id).exec();
  }

  /**
   * Policy'i çalıştırır: eşleşen image'leri bulur ve aksiyonu uygular
   */
  async executePolicy(
    policyId: string,
    options?: { maxActions?: number; dryRunOverride?: boolean }
  ): Promise<AutoActionExecutionResult> {
    const policy = await AutoActionPolicyModel.findById(policyId).exec();
    if (!policy || !policy.enabled) {
      throw new Error("Policy bulunamadı veya devre dışı");
    }

    const images = await this.findMatchingImages(policy);
    const maxActions = options?.maxActions || policy.maxActionsPerRun || 5;
    const dryRun = options?.dryRunOverride ?? policy.dryRun;

    const items: AutoActionExecutionItem[] = [];

    for (const image of images.slice(0, maxActions)) {
      const matchedFactors = this.matchingFactors(image, policy);

      if (policy.actionType === "NOTIFY") {
        items.push({
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
          matchedRiskFactors: matchedFactors,
          actionType: policy.actionType,
          dryRun,
          status: "NOTIFIED",
          message: "Bildirim simüle edildi (notification service bağlıysa gerçek gönderim yapılabilir).",
        });
        continue;
      }

      // Remediation aksiyonu
      const scripts = this.remediationScriptService.generateScripts(image, ["kubectl", "bash"]);
      const selectedScript = this.pickBestScript(scripts);

      if (!selectedScript) {
        items.push({
          imageName: image.imageName,
          riskScore: image.riskScore,
          riskLevel: image.riskLevel,
          matchedRiskFactors: matchedFactors,
          actionType: policy.actionType,
          dryRun,
          status: "SKIPPED",
          message: "Uygulanabilir remediation script bulunamadı",
        });
        continue;
      }

      const execResult = await this.remediationExecutionService.executeRemediation(image, selectedScript, {
        dryRun: policy.actionType === "REMEDIATE_DRY_RUN" ? true : dryRun,
      });

      items.push({
        imageName: image.imageName,
        riskScore: image.riskScore,
        riskLevel: image.riskLevel,
        matchedRiskFactors: matchedFactors,
        actionType: policy.actionType,
        dryRun: execResult.dryRun,
        remediation: {
          scriptId: selectedScript.id,
          scriptType: selectedScript.scriptType,
          executed: execResult,
        },
        status: execResult.success ? "EXECUTED" : "FAILED",
        message: execResult.message,
      });
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      totalMatches: images.length,
      executedCount: items.filter((i) => i.status === "EXECUTED" || i.status === "NOTIFIED").length,
      skippedCount: items.filter((i) => i.status === "SKIPPED" || i.status === "FAILED").length,
      items,
    };
  }

  /**
   * Policy kriterlerine uyan image'leri bulur
   */
  private async findMatchingImages(policy: AutoActionPolicyDocument): Promise<ImageRiskDocument[]> {
    const filter: any = {
      riskScore: { $gte: policy.riskScoreThreshold },
      riskLevel: { $in: policy.riskLevels },
    };
    if (policy.clusterId) filter.clusterId = policy.clusterId;
    if (policy.projectId) filter.projectId = policy.projectId;

    const images = await ImageRiskModel.find(filter).exec();

    return images.filter((img) => {
      // Namespace filtresi
      if (policy.namespaces.length > 0) {
        const matchNs = img.pods.some((p) => policy.namespaces.includes(p.namespace));
        if (!matchNs) return false;
      }

      // Risk faktör filtresi
      if (policy.riskFactors.length > 0) {
        const hasFactor = img.riskFactors.some((f) => policy.riskFactors.includes(f));
        if (!hasFactor) return false;
      }

      return true;
    });
  }

  private matchingFactors(image: ImageRiskDocument, policy: AutoActionPolicyDocument): string[] {
    if (policy.riskFactors.length === 0) return image.riskFactors;
    return image.riskFactors.filter((f) => policy.riskFactors.includes(f));
  }

  private pickBestScript(scripts: RemediationScript[]): RemediationScript | null {
    if (!scripts || scripts.length === 0) return null;
    return scripts.sort((a, b) => b.estimatedRiskReduction - a.estimatedRiskReduction)[0];
  }
}


