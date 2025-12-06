/**
 * Risk faktörleri için runbook / playbook URL'lerini yönetir
 */
export interface RunbookMapping {
  riskFactor: string;
  url: string;
  description?: string;
}

export class RunbookService {
  private mappings: Map<string, string> = new Map();

  constructor(customMappings?: RunbookMapping[]) {
    // Varsayılan runbook mapping'leri
    const defaultMappings: RunbookMapping[] = [
      {
        riskFactor: "Uses latest tag",
        url: "https://docs.example.com/runbooks/latest-tag",
        description: "Latest tag kullanımı için runbook",
      },
      {
        riskFactor: "Uses non-production tag",
        url: "https://docs.example.com/runbooks/non-prod-tag",
        description: "Non-prod tag kullanımı için runbook",
      },
      {
        riskFactor: "Test image used in workload",
        url: "https://docs.example.com/runbooks/test-image",
        description: "Test image kullanımı için runbook",
      },
      {
        riskFactor: "Running in production namespace",
        url: "https://docs.example.com/runbooks/prod-namespace",
        description: "Prod namespace kullanımı için runbook",
      },
      {
        riskFactor: "Legacy image tag",
        url: "https://docs.example.com/runbooks/legacy-tag",
        description: "Legacy tag için runbook",
      },
      {
        riskFactor: "Image older than 180 days",
        url: "https://docs.example.com/runbooks/old-image",
        description: "Eski image için runbook",
      },
      {
        riskFactor: "Uses root user",
        url: "https://docs.example.com/runbooks/root-user",
        description: "Root user kullanımı için runbook",
      },
      {
        riskFactor: "Uses unknown base image",
        url: "https://docs.example.com/runbooks/unknown-base",
        description: "Bilinmeyen base image için runbook",
      },
    ];

    // Custom mapping'leri varsayılanlarla birleştir
    const allMappings = [...defaultMappings, ...(customMappings || [])];

    // Map'e ekle
    allMappings.forEach((mapping) => {
      this.mappings.set(mapping.riskFactor, mapping.url);
    });
  }

  /**
   * Risk faktörü için runbook URL'ini döndürür
   */
  getRunbookUrl(riskFactor: string): string | null {
    return this.mappings.get(riskFactor) || null;
  }

  /**
   * Tüm runbook mapping'lerini döndürür
   */
  getAllMappings(): RunbookMapping[] {
    const result: RunbookMapping[] = [];
    this.mappings.forEach((url, riskFactor) => {
      result.push({ riskFactor, url });
    });
    return result;
  }

  /**
   * Yeni bir runbook mapping ekler veya günceller
   */
  setMapping(riskFactor: string, url: string): void {
    this.mappings.set(riskFactor, url);
  }

  /**
   * Bir runbook mapping'i siler
   */
  removeMapping(riskFactor: string): void {
    this.mappings.delete(riskFactor);
  }
}

