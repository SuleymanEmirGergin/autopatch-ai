import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  mongoUri: string;
  mockCce: boolean;
  cce: {
    endpoint: string;
    projectId: string;
    clusterId: string;
    token?: string;
    // AK/SK Authentication (token yerine veya token ile birlikte)
    accessKey?: string;
    secretKey?: string;
    region?: string; // Örn: "cn-north-1", "ap-southeast-1"
  };
  clusters?: Array<{
    clusterId: string;
    projectId: string;
    name: string;
    enabled: boolean;
  }>;
  notifications: {
    email: {
      enabled: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      from?: string;
      to?: string[];
    };
    webhook: {
      enabled: boolean;
      url?: string;
    };
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    teams?: {
      enabled: boolean;
      webhookUrl?: string;
    };
  };
  scheduler: {
    enabled: boolean;
    schedule?: string;
  };
  jira?: {
    enabled: boolean;
    baseUrl?: string;
    email?: string;
    apiToken?: string;
    projectKey?: string;
  };
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 5000,
  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb://mongo:27017/autopatch-scanner-service",
  mockCce: process.env.MOCK_CCE === "true",
  cce: {
    endpoint: process.env.CCE_ENDPOINT || "",
    projectId: process.env.CCE_PROJECT_ID || "",
    clusterId: process.env.CCE_CLUSTER_ID || "",
    token: process.env.CCE_TOKEN,
    accessKey: process.env.HUAWEI_ACCESS_KEY,
    secretKey: process.env.HUAWEI_SECRET_KEY,
    region: process.env.HUAWEI_REGION || "cn-north-1",
  },
  notifications: {
    email: {
      enabled: process.env.EMAIL_ENABLED === "true",
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT
        ? Number(process.env.SMTP_PORT)
        : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO
        ? process.env.EMAIL_TO.split(",").map((e) => e.trim())
        : undefined,
    },
    webhook: {
      enabled: process.env.WEBHOOK_ENABLED === "true",
      url: process.env.WEBHOOK_URL,
    },
    slack: {
      enabled: process.env.SLACK_ENABLED === "true",
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || "#security",
    },
    teams: {
      enabled: process.env.TEAMS_ENABLED === "true",
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    },
  },
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED === "true",
    schedule: process.env.SCHEDULER_CRON || "0 2 * * *", // Varsayılan: her gün saat 02:00
  },
  jira: {
    enabled: process.env.JIRA_ENABLED === "true",
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
  },
  clusters: (() => {
    if (process.env.CLUSTERS_CONFIG) {
      return JSON.parse(process.env.CLUSTERS_CONFIG);
    }
    const defaultClusterId = process.env.CCE_CLUSTER_ID || "default";
    const defaultProjectId = process.env.CCE_PROJECT_ID || "default";
    return [
      {
        clusterId: defaultClusterId,
        projectId: defaultProjectId,
        name: "Default Cluster",
        enabled: true,
      },
    ];
  })(),
};


