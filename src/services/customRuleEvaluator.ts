import { ImageUsage } from "../types/cce";
import { ImageMetadata } from "../risk/riskEngine";
import {
  CustomRiskRuleDocument,
  CustomRuleCondition,
} from "../persistence/customRiskRule.model";

export interface CustomRuleMatch {
  rule: CustomRiskRuleDocument;
  matched: boolean;
  score: number;
  factor: string;
}

export class CustomRuleEvaluator {
  /**
   * Image için tüm custom rule'ları değerlendirir
   */
  evaluateRules(
    usage: ImageUsage,
    metadata: ImageMetadata,
    rules: CustomRiskRuleDocument[]
  ): CustomRuleMatch[] {
    const matches: CustomRuleMatch[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matched = this.evaluate(rule, usage, metadata);
      if (matched) {
        matches.push({
          rule,
          matched: true,
          score: rule.riskScore,
          factor: rule.riskFactor,
        });
      }
    }

    // Priority'ye göre sırala (düşük sayı = yüksek öncelik)
    matches.sort((a, b) => a.rule.priority - b.rule.priority);

    return matches;
  }

  /**
   * Çoklu koşul desteği:
   * - Eğer rule.conditions doluysa onları AND/OR ile değerlendirir
   * - Değilse eski tekil rule.condition alanına geri döner
   */
  private evaluate(
    rule: CustomRiskRuleDocument,
    usage: ImageUsage,
    metadata: ImageMetadata
  ): boolean {
    const conditions = (rule.conditions || []).filter(
      (c) => !!c && !!c.type && !!c.operator
    );

    if (conditions.length === 0) {
      // Geriye dönük: tek condition alanını kullan
      return this.evaluateCondition(rule.condition, usage, metadata);
    }

    let result: boolean | null = null;

    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const current = this.evaluateCondition(cond, usage, metadata);

      if (result === null) {
        result = current;
        continue;
      }

      const conj = cond.conj || "AND";
      if (conj === "AND") {
        result = result && current;
      } else {
        result = result || current;
      }
    }

    return result ?? false;
  }

  private evaluateCondition(
    condition: CustomRuleCondition,
    usage: ImageUsage,
    metadata: ImageMetadata
  ): boolean {
    const { type, operator, value } = condition;

    let targetValue: string | number | undefined;

    switch (type) {
      case "imageName":
        targetValue = usage.imageName;
        break;
      case "namespace":
        targetValue = usage.pods.map((p) => p.namespace).join(",");
        break;
      case "tag":
        const parts = usage.imageName.split(":");
        targetValue = parts.length > 1 ? parts[parts.length - 1] : "latest";
        break;
      case "age":
        if (metadata.createdAt) {
          const now = new Date();
          const diffMs = now.getTime() - metadata.createdAt.getTime();
          targetValue = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Gün cinsinden
        }
        break;
      case "baseImage":
        // Basit heuristik: image name'den base image çıkarma
        const knownBases = ["ubuntu", "alpine", "debian", "node", "nginx"];
        targetValue = knownBases.find((base) =>
          usage.imageName.includes(base)
        ) || "unknown";
        break;
      default:
        return false;
    }

    if (targetValue === undefined) return false;

    return this.compare(operator, targetValue, value);
  }

  private compare(
    operator: string,
    target: string | number,
    expected: string | number
  ): boolean {
    switch (operator) {
      case "contains":
        return String(target).toLowerCase().includes(String(expected).toLowerCase());
      case "equals":
        return String(target).toLowerCase() === String(expected).toLowerCase();
      case "startsWith":
        return String(target).toLowerCase().startsWith(String(expected).toLowerCase());
      case "endsWith":
        return String(target).toLowerCase().endsWith(String(expected).toLowerCase());
      case "regex":
        try {
          const regex = new RegExp(String(expected), "i");
          return regex.test(String(target));
        } catch {
          return false;
        }
      case "greaterThan":
        return Number(target) > Number(expected);
      case "lessThan":
        return Number(target) < Number(expected);
      default:
        return false;
    }
  }
}

