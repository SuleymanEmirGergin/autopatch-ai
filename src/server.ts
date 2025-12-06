import { createApp } from "./app";
import { config } from "./config";
import { ScanService } from "./services/scanService";
import { RiskEngine } from "./risk/riskEngine";
import { MockCCEScanner } from "./scanner/MockCCEScanner";
import { RealCCEScanner } from "./scanner/RealCCEScanner";
import { NotificationService } from "./services/notificationService";
import { SchedulerService } from "./services/schedulerService";
import { AlertService } from "./services/alertService";
import { ScheduledReportService } from "./services/scheduledReportService";
import { ComplianceService } from "./services/complianceService";
import { StatsController } from "./api/controllers/statsController";
import { ReportTemplateService } from "./services/reportTemplateService";

async function bootstrap() {
  const { app, httpServer, wsService } = await createApp();

  // Scheduler'ı başlat (eğer etkinse)
  if (config.scheduler.enabled) {
    const scanner = config.mockCce
      ? new MockCCEScanner()
      : new RealCCEScanner(config.cce);
    const riskEngine = new RiskEngine();

    const notificationService =
      config.notifications.email.enabled ||
      config.notifications.webhook.enabled
        ? new NotificationService(config.notifications)
        : undefined;

    const alertService = notificationService
      ? new AlertService(notificationService)
      : undefined;

    const scanService = new ScanService(
      scanner,
      riskEngine,
      undefined,
      undefined,
      notificationService,
      alertService,
      wsService // WebSocket servisini inject et
    );

    const scheduler = new SchedulerService(scanService, config.scheduler);
    scheduler.start();

    // Scheduled Report Service'i başlat
    let scheduledReportService: ScheduledReportService | undefined = undefined;
    if (notificationService) {
      const complianceService = new ComplianceService();
      const statsController = new StatsController();
      scheduledReportService = new ScheduledReportService(
        scanService,
        complianceService,
        statsController,
        notificationService
      );
      await scheduledReportService.initialize();
      console.log("[ScheduledReports] Scheduled report service başlatıldı");
      
      // App'e ekle (controller'lardan erişim için)
      (app as any).scheduledReportService = scheduledReportService;
    }

    // Report Template Service'i başlat (varsayılan şablonları oluştur)
    const reportTemplateService = new ReportTemplateService();
    await reportTemplateService.initializeDefaultTemplates();
    console.log("[ReportTemplates] Report template service başlatıldı");
  }

  httpServer.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Scanner Service listening on port ${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`WebSocket available at ws://localhost:${config.port}/socket.io`);
  });
}

// eslint-disable-next-line no-floating-promises
bootstrap();


