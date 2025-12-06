import cron from "node-cron";
import { ScheduledReportModel, ScheduledReportDocument, ScheduleFrequency } from "../persistence/scheduledReport.model";
import { PdfService, ReportType } from "./pdfService";
import { ScanService } from "./scanService";
import { ComplianceService } from "./complianceService";
import { NotificationService } from "./notificationService";
import { ReportController } from "../api/controllers/reportController";
import { StatsController } from "../api/controllers/statsController";

export class ScheduledReportService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private pdfService: PdfService;
  private scanService: ScanService;
  private complianceService: ComplianceService;
  private notificationService?: NotificationService;
  private reportController: ReportController;

  constructor(
    scanService: ScanService,
    complianceService: ComplianceService,
    statsController: StatsController,
    notificationService?: NotificationService
  ) {
    this.pdfService = new PdfService();
    this.scanService = scanService;
    this.complianceService = complianceService;
    this.notificationService = notificationService;
    this.reportController = new ReportController(
      scanService,
      complianceService,
      statsController
    );
  }

  /**
   * Tüm aktif scheduled report'ları yükler ve cron job'ları başlatır
   */
  async initialize(): Promise<void> {
    const reports = await ScheduledReportModel.find({ enabled: true }).exec();
    
    for (const report of reports) {
      await this.scheduleReport(report);
    }

    console.log(`[ScheduledReports] ${reports.length} scheduled report yüklendi`);
  }

  /**
   * Bir scheduled report'u zamanlar
   */
  async scheduleReport(report: ScheduledReportDocument): Promise<void> {
    // Mevcut cron job'ı durdur
    const existingJob = this.cronJobs.get(report._id.toString());
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(report._id.toString());
    }

    if (!report.enabled) {
      return;
    }

    // Cron expression oluştur
    const cronExpression = this.buildCronExpression(report);
    
    // Cron job oluştur
    const job = cron.schedule(
      cronExpression,
      async () => {
        await this.executeReport(report);
      },
      {
        scheduled: true,
        timezone: report.timezone || "Europe/Istanbul",
      }
    );

    this.cronJobs.set(report._id.toString(), job);

    // Next run time'ı hesapla ve kaydet
    const nextRun = this.calculateNextRun(report);
    report.nextRunAt = nextRun;
    await report.save();

    console.log(`[ScheduledReports] Report "${report.name}" zamanlandı. Sonraki çalışma: ${nextRun.toLocaleString()}`);
  }

  /**
   * Cron expression oluşturur
   */
  private buildCronExpression(report: ScheduledReportDocument): string {
    const [hours, minutes] = report.time.split(":").map(Number);

    switch (report.frequency) {
      case "DAILY":
        return `${minutes} ${hours} * * *`; // Her gün belirtilen saatte
      case "WEEKLY":
        const dayOfWeek = report.dayOfWeek ?? 1; // Varsayılan Pazartesi
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      case "MONTHLY":
        const dayOfMonth = report.dayOfMonth ?? 1; // Varsayılan ayın 1'i
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      default:
        throw new Error(`Geçersiz frequency: ${report.frequency}`);
    }
  }

  /**
   * Sonraki çalışma zamanını hesaplar
   */
  private calculateNextRun(report: ScheduledReportDocument): Date {
    const now = new Date();
    const [hours, minutes] = report.time.split(":").map(Number);
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    switch (report.frequency) {
      case "DAILY":
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case "WEEKLY":
        const dayOfWeek = report.dayOfWeek ?? 1;
        const currentDay = now.getDay();
        const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7;
        nextRun.setDate(now.getDate() + daysUntilNext);
        if (nextRun <= now && daysUntilNext === 0) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
      case "MONTHLY":
        const dayOfMonth = report.dayOfMonth ?? 1;
        nextRun.setDate(dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Raporu çalıştırır ve e-posta gönderir
   * Public metod - manuel çalıştırma için
   */
  async executeReport(report: ScheduledReportDocument): Promise<void> {
    console.log(`[ScheduledReports] Rapor çalıştırılıyor: ${report.name}`);

    try {
      // PDF raporu oluştur
      const pdfBuffer = await this.generateReportPdf(report);

      // E-posta gönder
      if (this.notificationService && report.recipients.length > 0) {
        await this.sendReportEmail(report, pdfBuffer);
      }

      // Başarı durumunu kaydet
      report.lastRunAt = new Date();
      report.lastRunStatus = "success";
      report.lastRunError = undefined;
      report.totalRuns += 1;
      report.successfulRuns += 1;
      report.nextRunAt = this.calculateNextRun(report);
      await report.save();

      console.log(`[ScheduledReports] Rapor başarıyla gönderildi: ${report.name}`);
    } catch (error: any) {
      console.error(`[ScheduledReports] Rapor gönderilemedi: ${report.name}`, error);

      // Hata durumunu kaydet
      report.lastRunAt = new Date();
      report.lastRunStatus = "failed";
      report.lastRunError = error.message?.substring(0, 500);
      report.totalRuns += 1;
      report.failedRuns += 1;
      report.nextRunAt = this.calculateNextRun(report);
      await report.save();
    }
  }

  /**
   * PDF raporu oluşturur
   */
  private async generateReportPdf(report: ScheduledReportDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      // Mock request/response oluştur
      const mockReq = {
        query: {
          ...report.filters,
          standard: report.complianceStandard,
          clusterId: report.filters?.clusterId,
          projectId: report.filters?.projectId,
        },
      } as any;

      const mockRes = {
        setHeader: () => {},
        write: (chunk: Buffer) => chunks.push(chunk),
        end: () => {
          resolve(Buffer.concat(chunks));
        },
      } as any;

      // Rapor tipine göre PDF oluştur
      switch (report.reportType) {
        case "RISK_SUMMARY":
          this.reportController.generateRiskSummary(mockReq, mockRes, (err: any) => {
            if (err) reject(err);
          });
          break;
        case "EXECUTIVE":
          this.reportController.generateExecutiveSummary(mockReq, mockRes, (err: any) => {
            if (err) reject(err);
          });
          break;
        case "COMPLIANCE":
          this.reportController.generateComplianceReport(mockReq, mockRes, (err: any) => {
            if (err) reject(err);
          });
          break;
        case "DETAILED":
          this.reportController.generateDetailedReport(mockReq, mockRes, (err: any) => {
            if (err) reject(err);
          });
          break;
        default:
          reject(new Error(`Geçersiz rapor tipi: ${report.reportType}`));
      }
    });
  }

  /**
   * E-posta gönderir
   */
  private async sendReportEmail(
    report: ScheduledReportDocument,
    pdfBuffer: Buffer
  ): Promise<void> {
    if (!this.notificationService) {
      throw new Error("Notification service yapılandırılmamış");
    }

    const reportTypeLabels: Record<ReportType, string> = {
      RISK_SUMMARY: "Risk Özet Raporu",
      EXECUTIVE: "Executive Summary",
      COMPLIANCE: "Compliance Raporu",
      DETAILED: "Detaylı Analiz Raporu",
    };

    const subject = `AutoPatch AI - ${reportTypeLabels[report.reportType]} - ${new Date().toLocaleDateString("tr-TR")}`;
    const body = `
Merhaba,

${report.name} scheduled report'unuz hazır.

Rapor Tipi: ${reportTypeLabels[report.reportType]}
Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}

PDF raporu ekte bulunmaktadır.

AutoPatch AI
    `.trim();

    // E-posta gönderme için NotificationService'e ek metod gerekli
    // Şimdilik basit bir implementasyon
    const emailTransporter = (this.notificationService as any).emailTransporter;
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || "autopatch@example.com",
        to: report.recipients.join(", "),
        subject,
        text: body,
        attachments: [
          {
            filename: `autopatch-${report.reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    }
  }

  /**
   * Scheduled report'u günceller ve yeniden zamanlar
   */
  async updateReport(reportId: string): Promise<void> {
    const report = await ScheduledReportModel.findById(reportId).exec();
    if (report) {
      await this.scheduleReport(report);
    }
  }

  /**
   * Scheduled report'u durdurur
   */
  async stopReport(reportId: string): Promise<void> {
    const job = this.cronJobs.get(reportId);
    if (job) {
      job.stop();
      this.cronJobs.delete(reportId);
    }
  }

  /**
   * Tüm cron job'ları durdurur
   */
  stopAll(): void {
    this.cronJobs.forEach((job) => job.stop());
    this.cronJobs.clear();
  }
}

