import axios, { AxiosInstance } from "axios";
import { ImageRiskResult } from "../risk/riskEngine";

export interface JiraConfig {
  enabled: boolean;
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
}

export interface CreateJiraTicketRequest {
  imageName: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  pods: { namespace: string; name: string }[];
  summary?: string;
  description?: string;
}

export interface CreateJiraTicketResponse {
  success: boolean;
  ticketKey?: string;
  ticketUrl?: string;
  error?: string;
}

export class JiraService {
  private client: AxiosInstance | null = null;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;

    if (config.enabled && config.baseUrl && config.email && config.apiToken) {
      // Basic auth için email:token formatında base64 encode
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

      this.client = axios.create({
        baseURL: config.baseUrl,
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    }
  }

  /**
   * Jira'da bir issue oluşturur
   */
  async createTicket(request: CreateJiraTicketRequest): Promise<CreateJiraTicketResponse> {
    if (!this.config.enabled || !this.client || !this.config.projectKey) {
      return {
        success: false,
        error: "Jira entegrasyonu yapılandırılmamış",
      };
    }

    try {
      // Prod pod sayısını hesapla
      const prodPods = request.pods.filter((p) => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      });

      // Summary oluştur
      const summary =
        request.summary ||
        `${request.riskLevel} Risk: ${request.imageName} (Score: ${request.riskScore})`;

      // Description oluştur
      const description =
        request.description ||
        this.buildDescription(request, prodPods.length);

      // Jira issue payload
      const issuePayload = {
        fields: {
          project: {
            key: this.config.projectKey,
          },
          summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: "Bug", // Veya "Task", "Security Issue" gibi
          },
          priority: {
            name: request.riskLevel === "CRITICAL" ? "Highest" : request.riskLevel === "HIGH" ? "High" : "Medium",
          },
          labels: ["autopatch", "security", `risk-${request.riskLevel.toLowerCase()}`],
        },
      };

      const response = await this.client.post("/rest/api/3/issue", issuePayload);

      const ticketKey = response.data.key;
      const ticketUrl = `${this.config.baseUrl}/browse/${ticketKey}`;

      return {
        success: true,
        ticketKey,
        ticketUrl,
      };
    } catch (error: any) {
      console.error("Jira ticket oluşturma hatası:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessages?.join(", ") || error.message || "Bilinmeyen hata",
      };
    }
  }

  private buildDescription(
    request: CreateJiraTicketRequest,
    prodPodCount: number
  ): string {
    const lines: string[] = [];

    lines.push(`*Image:* ${request.imageName}`);
    lines.push(`*Risk Score:* ${request.riskScore}`);
    lines.push(`*Risk Level:* ${request.riskLevel}`);
    lines.push(`*Prod Pods:* ${prodPodCount}`);
    lines.push(`*Total Pods:* ${request.pods.length}`);

    if (request.riskFactors.length > 0) {
      lines.push("");
      lines.push("*Risk Factors:*");
      request.riskFactors.forEach((factor) => {
        lines.push(`* ${factor}`);
      });
    }

    if (request.pods.length > 0) {
      lines.push("");
      lines.push("*Affected Pods:*");
      request.pods.forEach((pod) => {
        lines.push(`* ${pod.namespace}/${pod.name}`);
      });
    }

    lines.push("");
    lines.push("---");
    lines.push(`*Created by:* AutoPatch AI Scanner`);
    lines.push(`*Timestamp:* ${new Date().toISOString()}`);

    return lines.join("\n");
  }
}

