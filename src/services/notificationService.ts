import nodemailer from "nodemailer";
import axios from "axios";
import { ImageRiskResult } from "../risk/riskEngine";
import { NotificationGroupingService } from "./notificationGroupingService";

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    from?: string;
    to?: string[];
  };
  webhook?: {
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
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private config: NotificationConfig;
  private groupingService: NotificationGroupingService;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.groupingService = new NotificationGroupingService();

    // Email transporter'ı yapılandır
    if (config.email?.enabled && config.email.smtpHost) {
      this.emailTransporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort || 587,
        secure: false,
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPassword,
        },
      });
    }
  }

  /**
   * HIGH veya CRITICAL risk seviyesindeki image'ler için bildirim gönderir.
   */
  async notifyHighRiskImages(images: ImageRiskResult[]): Promise<void> {
    const highRiskImages = images.filter(
      (img) => img.riskLevel === "HIGH" || img.riskLevel === "CRITICAL"
    );

    if (highRiskImages.length === 0) {
      return;
    }

    const prodImages = highRiskImages.filter((img) =>
      img.pods.some((p) => {
        const ns = p.namespace.toLowerCase();
        return ns === "prod" || ns.startsWith("prod-");
      })
    );

    // Bildirimleri grupla ve rate limiting kontrolü yap
    const severity = prodImages.length > 0 ? "CRITICAL" : "HIGH";
    const groupKey = `RISK_DETECTED:${severity}`;

    // Rate limiting kontrolü (1 dakika içinde tekrar gönderme)
    const shouldThrottle = await this.groupingService.shouldThrottle(groupKey, 60000);
    if (shouldThrottle) {
      console.log("[Notification] Rate limit: Bildirim gönderilmedi (çok sık)");
      // Yine de gruplamaya ekle ama gönderme
      await this.groupingService.groupNotification({
        type: "RISK_DETECTED",
        severity,
        title: `${highRiskImages.length} Yüksek Riskli Image Tespit Edildi`,
        message: `${highRiskImages.length} HIGH/CRITICAL risk seviyesinde image bulundu${prodImages.length > 0 ? `. ${prodImages.length} image prod ortamında çalışıyor!` : ""}`,
        affectedImages: highRiskImages.map((img) => img.imageName),
        metadata: { prodCount: prodImages.length },
      });
      return;
    }

    // Gruplamaya ekle
    await this.groupingService.groupNotification({
      type: "RISK_DETECTED",
      severity,
      title: `${highRiskImages.length} Yüksek Riskli Image Tespit Edildi`,
      message: `${highRiskImages.length} HIGH/CRITICAL risk seviyesinde image bulundu${prodImages.length > 0 ? `. ${prodImages.length} image prod ortamında çalışıyor!` : ""}`,
      affectedImages: highRiskImages.map((img) => img.imageName),
      metadata: { prodCount: prodImages.length },
    });

    // Email bildirimi
    if (this.config.email?.enabled && this.emailTransporter) {
      await this.sendEmailNotification(highRiskImages, prodImages);
    }

    // Webhook bildirimi
    if (this.config.webhook?.enabled && this.config.webhook.url) {
      await this.sendWebhookNotification(highRiskImages, prodImages);
    }

    // Slack bildirimi
    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      await this.sendSlackNotification(highRiskImages, prodImages);
    }

    // Teams bildirimi
    if (this.config.teams?.enabled && this.config.teams.webhookUrl) {
      await this.sendTeamsNotification(highRiskImages, prodImages);
    }
  }

  private async sendEmailNotification(
    allHighRisk: ImageRiskResult[],
    prodHighRisk: ImageRiskResult[]
  ): Promise<void> {
    if (!this.emailTransporter || !this.config.email?.to) {
      return;
    }

    const subject = `🚨 AutoPatch AI: ${allHighRisk.length} Yüksek Riskli Image Tespit Edildi`;
    const prodWarning =
      prodHighRisk.length > 0
        ? `\n\n⚠️ KRİTİK: ${prodHighRisk.length} image prod ortamında çalışıyor!\n`
        : "";

    const body = `
AutoPatch AI Scanner Service tarafından yüksek riskli container image'leri tespit edildi.

Toplam HIGH/CRITICAL risk seviyesinde image sayısı: ${allHighRisk.length}
${prodWarning}
Detaylar:

${allHighRisk
  .map((img, idx) => {
    const prodPods = img.pods.filter((p) => {
      const ns = p.namespace.toLowerCase();
      return ns === "prod" || ns.startsWith("prod-");
    });
    return `
${idx + 1}. ${img.imageName}
   Risk Skoru: ${img.riskScore} (${img.riskLevel})
   Risk Faktörleri: ${img.riskFactors.join(", ")}
   Pod Sayısı: ${img.pods.length}${prodPods.length > 0 ? ` (${prodPods.length} prod)` : ""}
`;
  })
  .join("")}

Lütfen bu image'leri gözden geçirin ve gerekli güvenlik önlemlerini alın.
    `.trim();

    try {
      await this.emailTransporter.sendMail({
        from: this.config.email.from || "autopatch@example.com",
        to: this.config.email.to.join(", "),
        subject,
        text: body,
      });
    } catch (error) {
      console.error("Email gönderilemedi:", error);
    }
  }

  private async sendWebhookNotification(
    allHighRisk: ImageRiskResult[],
    prodHighRisk: ImageRiskResult[]
  ): Promise<void> {
    if (!this.config.webhook?.url) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      totalHighRisk: allHighRisk.length,
      prodHighRisk: prodHighRisk.length,
      images: allHighRisk.map((img) => ({
        imageName: img.imageName,
        riskScore: img.riskScore,
        riskLevel: img.riskLevel,
        riskFactors: img.riskFactors,
        pods: img.pods,
        prodPods: img.pods.filter((p) => {
          const ns = p.namespace.toLowerCase();
          return ns === "prod" || ns.startsWith("prod-");
        }).length,
      })),
    };

    try {
      const response = await fetch(this.config.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `Webhook bildirimi başarısız: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Webhook gönderilemedi:", error);
    }
  }

  private async sendSlackNotification(
    allHighRisk: ImageRiskResult[],
    prodHighRisk: ImageRiskResult[]
  ): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      return;
    }

    const color = prodHighRisk.length > 0 ? "danger" : "warning";
    const emoji = prodHighRisk.length > 0 ? "🚨" : "⚠️";

    const slackPayload = {
      channel: this.config.slack.channel || "#security",
      username: "AutoPatch AI",
      icon_emoji: ":shield:",
      attachments: [
        {
          color,
          title: `${emoji} ${allHighRisk.length} Yüksek Riskli Image Tespit Edildi`,
          text: `Toplam ${allHighRisk.length} HIGH/CRITICAL risk seviyesinde image bulundu.${
            prodHighRisk.length > 0
              ? `\n\n*KRİTİK:* ${prodHighRisk.length} image prod ortamında çalışıyor!`
              : ""
          }`,
          fields: allHighRisk.slice(0, 10).map((img) => {
            const prodPods = img.pods.filter((p) => {
              const ns = p.namespace.toLowerCase();
              return ns === "prod" || ns.startsWith("prod-");
            });
            return {
              title: img.imageName,
              value: `Risk: ${img.riskScore} (${img.riskLevel})\nFaktörler: ${img.riskFactors.slice(0, 3).join(", ")}\nPods: ${img.pods.length}${
                prodPods.length > 0 ? ` (${prodPods.length} prod)` : ""
              }`,
              short: false,
            };
          }),
          footer: "AutoPatch AI Scanner Service",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await axios.post(this.config.slack.webhookUrl, slackPayload);
      console.log("[Slack] Bildirim gönderildi");
    } catch (error) {
      console.error("[Slack] Bildirim gönderilemedi:", error);
    }
  }

  private async sendTeamsNotification(
    allHighRisk: ImageRiskResult[],
    prodHighRisk: ImageRiskResult[]
  ): Promise<void> {
    if (!this.config.teams?.webhookUrl) {
      return;
    }

    const color = prodHighRisk.length > 0 ? "FF0000" : "FFA500";
    const summary = allHighRisk
      .slice(0, 5)
      .map(
        (img) =>
          `- **${img.imageName}**: ${img.riskScore} (${img.riskLevel})`
      )
      .join("\n");

    const teamsPayload = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: `AutoPatch AI: ${allHighRisk.length} Yüksek Riskli Image`,
      themeColor: color,
      title: `🚨 ${allHighRisk.length} Yüksek Riskli Image Tespit Edildi`,
      sections: [
        {
          activityTitle: "AutoPatch AI Scanner Service",
          activitySubtitle: new Date().toLocaleString("tr-TR"),
          facts: [
            {
              name: "Toplam HIGH/CRITICAL",
              value: `${allHighRisk.length}`,
            },
            {
              name: "Prod Ortamında",
              value: `${prodHighRisk.length}`,
            },
            {
              name: "Risk Seviyesi",
              value: prodHighRisk.length > 0 ? "KRİTİK" : "YÜKSEK",
            },
          ],
          text: `**Riskli Image'ler:**\n${summary}${
            allHighRisk.length > 5 ? `\n\n... ve ${allHighRisk.length - 5} tane daha` : ""
          }`,
        },
      ],
      potentialAction: [
        {
          "@type": "OpenUri",
          name: "Dashboard'ı Aç",
          targets: [
            {
              os: "default",
              uri: "http://localhost:3002", // Frontend URL
            },
          ],
        },
      ],
    };

    try {
      await axios.post(this.config.teams.webhookUrl, teamsPayload);
      console.log("[Teams] Bildirim gönderildi");
    } catch (error) {
      console.error("[Teams] Bildirim gönderilemedi:", error);
    }
  }
}

