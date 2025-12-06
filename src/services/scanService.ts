import { CCEScanner, ImageUsage, PodSummary } from "../types/cce";
import { RiskEngine, ImageRiskResult } from "../risk/riskEngine";
import {
  ImageRiskRepository,
  MongoImageRiskRepository,
} from "../persistence/imageRisk.repository";
import { ScanRunModel } from "../persistence/scanRun.model";
import { RiskAllowlistRepository } from "../persistence/riskAllowlist.repository";
import {
  NotificationService,
  NotificationConfig,
} from "./notificationService";
import { AlertService } from "./alertService";
import { WebSocketService } from "./websocketService";
import { CustomRuleEvaluator } from "./customRuleEvaluator";
import { CustomRiskRuleRepository } from "../persistence/customRiskRule.repository";
import { AuditService } from "./auditService";
import { AnomalyDetectionService } from "./anomalyDetectionService";
import { WebhookEventService } from "./webhookEventService";

export class ScanService {
  private readonly customRuleRepo = new CustomRiskRuleRepository();
  private readonly customRuleEvaluator = new CustomRuleEvaluator();
  private readonly auditService = new AuditService();
  private readonly anomalyDetectionService = new AnomalyDetectionService();
  private readonly webhookEventService = new WebhookEventService();

  constructor(
    private readonly scanner: CCEScanner,
    private readonly riskEngine: RiskEngine,
    private readonly repository: ImageRiskRepository = new MongoImageRiskRepository(),
    private readonly allowlistRepo: RiskAllowlistRepository = new RiskAllowlistRepository(),
    private readonly notificationService?: NotificationService,
    private readonly alertService?: AlertService,
    private readonly wsService?: WebSocketService
  ) {}

  /**
   * Tüm pod'ları çek, image bazında grupla, riskleri hesapla ve Mongo'ya upsert et.
   * @param clusterId - Tarama yapılacak cluster ID (opsiyonel)
   * @param projectId - Tarama yapılacak project ID (opsiyonel)
   */
  async runScan(clusterId?: string, projectId?: string): Promise<ImageRiskResult[]> {
    const startedAt = new Date();

    // Önce RUNNING status'ü ile kayıt oluştur
    const scanRun = await ScanRunModel.create({
      startedAt,
      status: "RUNNING",
      images: [],
    });

    try {
      const pods = await this.scanner.fetchPods();
      const usages = this.buildImageUsages(pods);

      // Custom rule'ları yükle
      const customRules = await this.customRuleRepo.findAll();

      const results: ImageRiskResult[] = [];

      for (const usage of usages) {
        const ignoredFactors = await this.allowlistRepo.getIgnoredFactorsForImage(
          usage.imageName
        );
        
        // Custom rule'ları değerlendir
        const metadata = this.deriveMetadataFromName(usage) || {};
        const customRuleMatches = this.customRuleEvaluator.evaluateRules(
          usage,
          metadata,
          customRules
        );

        const result = this.riskEngine.calculateRisk(
          usage,
          metadata,
          ignoredFactors,
          customRuleMatches
        );
        // Cluster ve project bilgilerini ekle
        if (clusterId) result.clusterId = clusterId;
        if (projectId) result.projectId = projectId;
        results.push(result);
      }

      await this.repository.upsertMany(results);

      // Anomali tespiti
      try {
        const anomalyResult = await this.anomalyDetectionService.detectAnomalies(
          results,
          clusterId
        );
        if (anomalyResult.totalDetected > 0) {
          console.log(`Anomali tespit edildi: ${anomalyResult.totalDetected} anomali`);
          // WebSocket üzerinden anomali bildirimi gönder
          this.wsService?.broadcastNotification(
            `${anomalyResult.totalDetected} anomali tespit edildi`,
            "warning"
          );
        }
      } catch (error) {
        console.error("Anomali tespiti başarısız:", error);
        // Anomali tespiti hatası scan'i başarısız yapmamalı
      }

      // Audit log
      await this.auditService.log({
        action: "SCAN_COMPLETED",
        details: { imagesScanned: results.length },
      });

      // Scan'i COMPLETED olarak güncelle
      scanRun.status = "COMPLETED";
      scanRun.finishedAt = new Date();
      scanRun.images = results.map((r) => ({
        imageName: r.imageName,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
      }));
      await scanRun.save();

      // Webhook event gönder
      try {
        await this.webhookEventService.emitEvent({
          type: "scan.complete",
          timestamp: scanRun.finishedAt.toISOString(),
          data: {
            scanId: scanRun._id.toString(),
            imagesScanned: results.length,
            highOrCriticalCount: results.filter(
              (r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL"
            ).length,
            startedAt: scanRun.startedAt.toISOString(),
            finishedAt: scanRun.finishedAt.toISOString(),
          },
        });
      } catch (error) {
        console.error("Webhook event gönderilemedi:", error);
        // Webhook hatası scan'i başarısız yapmamalı
      }

      // WebSocket ile scan tamamlandı bildirimi gönder
      if (this.wsService) {
        const highOrCritical = results.filter(
          (r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL"
        ).length;
        this.wsService.broadcastScanComplete({
          scanId: scanRun._id.toString(),
          imagesScanned: results.length,
          highOrCriticalCount: highOrCritical,
          completedAt: scanRun.finishedAt,
        });

        // Scan durumu güncellemesi
        this.wsService.broadcastScanStatus({
          status: "COMPLETED",
          startedAt: scanRun.startedAt,
          finishedAt: scanRun.finishedAt,
        });

        // HIGH/CRITICAL riskli image'ler için anlık bildirim
        const highCriticalImages = results.filter(
          (r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL"
        );
        for (const image of highCriticalImages) {
          this.wsService.broadcastNewRisk({
            image,
            isNew: true, // Basit implementasyon, gerçekte önceki scan ile karşılaştırılmalı
          });

          // Webhook event gönder (risk.new)
          try {
            await this.webhookEventService.emitEvent({
              type: "risk.new",
              timestamp: new Date().toISOString(),
              data: {
                imageName: image.imageName,
                riskScore: image.riskScore,
                riskLevel: image.riskLevel,
                riskFactors: image.riskFactors,
                pods: image.pods,
                clusterId: image.clusterId,
                projectId: image.projectId,
              },
            });
          } catch (webhookError) {
            console.error("Webhook event gönderilemedi:", webhookError);
          }
        }
      }

      // HIGH/CRITICAL riskli image'ler için bildirim gönder
      if (this.notificationService) {
        try {
          await this.notificationService.notifyHighRiskImages(results);
        } catch (error) {
          console.error("Bildirim gönderilemedi:", error);
          // Bildirim hatası scan'i başarısız yapmamalı
        }
      }

      // Alert rule'larını kontrol et
      if (this.alertService) {
        try {
          await this.alertService.checkAlerts(results);
        } catch (error) {
          console.error("Alert kontrolü başarısız:", error);
        }
      }

      return results;
    } catch (error) {
      // Hata durumunda FAILED olarak işaretle
      scanRun.status = "FAILED";
      scanRun.finishedAt = new Date();
      scanRun.errorMessage =
        error instanceof Error ? error.message : String(error);
      await scanRun.save();

      // Webhook event gönder (scan failed)
      try {
        await this.webhookEventService.emitEvent({
          type: "scan.failed",
          timestamp: scanRun.finishedAt.toISOString(),
          data: {
            scanId: scanRun._id.toString(),
            errorMessage: scanRun.errorMessage,
            startedAt: scanRun.startedAt.toISOString(),
            finishedAt: scanRun.finishedAt.toISOString(),
          },
        });
      } catch (webhookError) {
        console.error("Webhook event gönderilemedi:", webhookError);
      }

      // Audit log
      await this.auditService.log({
        action: "SCAN_FAILED",
        details: { error: scanRun.errorMessage },
      });

      // WebSocket ile hata bildirimi gönder
      if (this.wsService) {
        this.wsService.broadcastScanStatus({
          status: "FAILED",
          startedAt: scanRun.startedAt,
          finishedAt: scanRun.finishedAt,
          errorMessage: scanRun.errorMessage,
        });
        this.wsService.broadcastNotification(
          `Scan başarısız oldu: ${scanRun.errorMessage}`,
          "error"
        );
      }

      throw error;
    }
  }

  async listImages(clusterId?: string, projectId?: string) {
    return this.repository.findAll(clusterId, projectId);
  }

  async getImage(imageName: string, clusterId?: string) {
    return this.repository.findByImageName(imageName, clusterId);
  }

  async getTopImages(limit: number, prodOnly: boolean, clusterId?: string, projectId?: string) {
    return this.repository.findTop(limit, prodOnly, clusterId, projectId);
  }

  async getImageTags(imageName: string, clusterId?: string, projectId?: string) {
    const { parseImageName } = await import("../utils/imageParser");
    const parsed = parseImageName(imageName);
    return this.repository.findByRepositoryBase(parsed.baseName, clusterId, projectId);
  }

  /**
   * Manuel image ekleme veya güncelleme
   */
  async createOrUpdateImage(data: {
    imageName: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    pods: Array<{ namespace: string; name: string }>;
    clusterId?: string;
    projectId?: string;
    lastScannedAt: Date;
  }): Promise<ImageRiskDocument> {
    const result: ImageRiskResult = {
      imageName: data.imageName,
      riskScore: data.riskScore,
      riskLevel: data.riskLevel as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      riskFactors: data.riskFactors,
      pods: data.pods,
      clusterId: data.clusterId,
      projectId: data.projectId,
      lastScannedAt: data.lastScannedAt,
    };

    const docs = await this.repository.upsertMany([result]);
    return docs[0];
  }

  private buildImageUsages(pods: PodSummary[]): ImageUsage[] {
    const map = new Map<
      string,
      { imageName: string; pods: { namespace: string; name: string }[] }
    >();

    for (const pod of pods) {
      for (const container of pod.containers) {
        const key = container.image;
        if (!map.has(key)) {
          map.set(key, { imageName: key, pods: [] });
        }
        map.get(key)!.pods.push({
          namespace: pod.namespace,
          name: pod.name,
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Şu an için sadece isim bazlı deterministik metadata üretimi.
   * Gerçek sistemde registry'den image inspect bilgisi alınabilir.
   */
  private deriveMetadataFromName(
    usage: ImageUsage
  ): Partial<Parameters<RiskEngine["calculateRisk"]>[1]> {
    const image = usage.imageName;

    const usesRootUser =
      image.includes("root") || image.includes("privileged");

    const knownBaseImages = ["ubuntu", "alpine", "debian", "node", "nginx"];
    const baseImageKnown = knownBaseImages.some((base) =>
      image.startsWith(base + ":") || image.includes("/" + base + ":")
    );

    return {
      usesRootUser,
      baseImageKnown,
    };
  }
}


