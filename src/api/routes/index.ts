import { Router } from "express";
import { ScanController } from "../controllers/scanController";
import { ImageController } from "../controllers/imageController";
import { RecommendationController } from "../controllers/recommendationController";
import { RemediationController } from "../controllers/remediationController";
import { AllowlistController } from "../controllers/allowlistController";
import { AlertController } from "../controllers/alertController";
import { CustomRuleController } from "../controllers/customRuleController";
import { AuditController } from "../controllers/auditController";
import { DependencyController } from "../controllers/dependencyController";
import { ComplianceController } from "../controllers/complianceController";
import { ScorecardController } from "../controllers/scorecardController";
import { StatsController } from "../controllers/statsController";
import { ApiTokenController } from "../controllers/apiTokenController";
import { JiraController } from "../controllers/jiraController";
import { RunbookController } from "../controllers/runbookController";
import { ClusterController } from "../controllers/clusterController";
import { RiskBudgetController } from "../controllers/riskBudgetController";
import { SBOMController } from "../controllers/sbomController";
import { AnomalyController } from "../controllers/anomalyController";
import { NotificationController } from "../controllers/notificationController";
import { WebhookController } from "../controllers/webhookController";
import { WidgetController } from "../controllers/widgetController";
import { ImageComparisonController } from "../controllers/imageComparisonController";
import { ReportController } from "../controllers/reportController";
import { ScheduledReportController } from "../controllers/scheduledReportController";
import { ReportTemplateController } from "../controllers/reportTemplateController";
import { ReportHistoryController } from "../controllers/reportHistoryController";
import { AutoActionController } from "../controllers/autoActionController";
import { AIController } from "../controllers/aiController";
import { IoTController } from "../controllers/iotController";
import { ComputerVisionController } from "../controllers/computerVisionController";
import { ComplianceService } from "../../services/complianceService";
import { ScanService } from "../../services/scanService";
import { ReportTemplateService } from "../../services/reportTemplateService";
import { ReportHistoryService } from "../../services/reportHistoryService";
import { RiskEngine } from "../../risk/riskEngine";
import { MockCCEScanner } from "../../scanner/MockCCEScanner";
import { RealCCEScanner } from "../../scanner/RealCCEScanner";
import { config } from "../../config";
import { apiKeyAuth, requireRole } from "../middleware/apiKeyAuth";
import { NotificationService } from "../../services/notificationService";
import { AlertService } from "../../services/alertService";
import { WebSocketService } from "../../services/websocketService";
import { uploadLogo } from "../middleware/upload";
import express from "express";
import path from "path";

export function createRouter(wsService?: WebSocketService): Router {
  const router = Router();

  // Static file serving for uploaded logos
  router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const scanner = config.mockCce
    ? new MockCCEScanner()
    : new RealCCEScanner(config.cce);
  const riskEngine = new RiskEngine();

  // Notification service'i yapılandır
  const notificationService =
    config.notifications.email.enabled ||
    config.notifications.webhook.enabled ||
    config.notifications.slack?.enabled ||
    config.notifications.teams?.enabled
      ? new NotificationService(config.notifications)
      : undefined;

  // Alert service'i yapılandır
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
    wsService
  );

  // Report Template Service (diğer servislerden önce oluşturulmalı)
  const reportTemplateService = new ReportTemplateService();
  const reportHistoryService = new ReportHistoryService();
  const complianceService = new ComplianceService();

  const scanController = new ScanController(scanService);
  const imageController = new ImageController(scanService, undefined, reportTemplateService, reportHistoryService);
  const recommendationController = new RecommendationController(scanService);
  const remediationController = new RemediationController(scanService);
  const allowlistController = new AllowlistController();
  const alertController = new AlertController();
  const customRuleController = new CustomRuleController();
  const auditController = new AuditController();
  const dependencyController = new DependencyController();
  const complianceController = new ComplianceController();
  const scorecardController = new ScorecardController();
  const apiTokenController = new ApiTokenController();
  const jiraController = new JiraController();
  const runbookController = new RunbookController();
  const clusterController = new ClusterController();
  const riskBudgetController = new RiskBudgetController();
  const sbomController = new SBOMController();
  const anomalyController = new AnomalyController();
  const notificationController = new NotificationController();
  const webhookController = new WebhookController();
  const widgetController = new WidgetController();
  const imageComparisonController = new ImageComparisonController();
  const statsController = new StatsController();
  const autoActionController = new AutoActionController();
  
  // Report Controller (reportTemplateService ve complianceService zaten oluşturuldu)
  const reportController = new ReportController(
    scanService,
    complianceService,
    statsController,
    reportTemplateService,
    reportHistoryService
  );
  const scheduledReportController = new ScheduledReportController();
  const reportTemplateController = new ReportTemplateController(reportTemplateService);
  const reportHistoryController = new ReportHistoryController(reportHistoryService);
  const aiController = new AIController();
  const iotController = new IoTController();
  const cvController = new ComputerVisionController();

  // Health check
  router.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Trigger scan (protected)
  router.post("/scan", apiKeyAuth, scanController.triggerScan);

  // Scan status
  router.get("/scan/status", scanController.getScanStatus);

  // List images
  router.get("/images", imageController.listImages);
  
  // Image creation (güvenlik: rate limiting + validation + audit)
  const { imageCreationRateLimiter, bulkImageCreationRateLimiter } = require("../middleware/rateLimiter");
  router.post("/images", 
    apiKeyAuth, 
    requireRole("admin"), 
    imageCreationRateLimiter(),
    imageController.createImage
  );
  router.post("/images/bulk", 
    apiKeyAuth, 
    requireRole("admin"), 
    bulkImageCreationRateLimiter(),
    imageController.createBulkImages
  );

  // Top risk images
  router.get("/images/top", imageController.getTopImages);

  // Image detail
  router.get("/images/:imageName", imageController.getImage);

  // Image risk breakdown
  router.get("/images/:imageName/breakdown", imageController.getImageBreakdown);

  // Image tags (same repository, different tags)
  router.get("/images/:imageName/tags", imageController.getImageTags);

  // Image scan history
  router.get("/images/:imageName/history", imageController.getImageHistory);

  // Image recommendations
  router.get("/images/:imageName/recommendations", apiKeyAuth, recommendationController.getImageRecommendations);
  router.get("/images/:imageName/patch-recommendations", apiKeyAuth, recommendationController.getImagePatchRecommendations);
  router.get("/recommendations", apiKeyAuth, recommendationController.getBulkRecommendations);
  router.get("/recommendations/priority", apiKeyAuth, recommendationController.getPriorityRecommendations);
  router.get("/recommendations/patches", apiKeyAuth, recommendationController.getBulkPatchRecommendations);
  router.get("/images/:imageName/patch-recommendations", apiKeyAuth, recommendationController.getImagePatchRecommendations);
  router.get("/recommendations/patches", apiKeyAuth, recommendationController.getBulkPatchRecommendations);
  
  // Auto Actions (Risk skoru bazlı otomatik aksiyonlar)
  router.get("/auto-actions/policies", apiKeyAuth, requireRole("admin"), autoActionController.list);
  router.post("/auto-actions/policies", apiKeyAuth, requireRole("admin"), autoActionController.create);
  router.put("/auto-actions/policies/:id", apiKeyAuth, requireRole("admin"), autoActionController.update);
  router.delete("/auto-actions/policies/:id", apiKeyAuth, requireRole("admin"), autoActionController.delete);
  router.post("/auto-actions/policies/:id/execute", apiKeyAuth, requireRole("admin"), autoActionController.execute);

  // Remediation Scripts
  router.get("/images/:imageName/remediation-scripts", apiKeyAuth, remediationController.getImageRemediationScripts);
  router.post("/images/:imageName/remediation-scripts/:scriptId/execute", apiKeyAuth, requireRole("admin"), remediationController.executeRemediation);
  router.post("/remediation/batch-execute", apiKeyAuth, requireRole("admin"), remediationController.executeBatchRemediation);
  router.post("/remediation/batch-generate-execute", apiKeyAuth, requireRole("admin"), remediationController.bulkGenerateAndExecute);

  // List all repositories (grouped by base name)
  router.get("/repositories", imageController.getRepositories);

  // Stats
  router.get("/stats", imageController.getStats);
  router.get("/stats/trends", statsController.getTrends);

  // PDF Export (legacy - backward compatibility)
  router.get("/images/export/pdf", imageController.exportPdf);

  // CSV/Excel/JSON Export
  router.get("/images/export", apiKeyAuth, imageController.exportData);

  // Gelişmiş Raporlama
  router.get("/reports/risk-summary", apiKeyAuth, reportController.generateRiskSummary);
  router.get("/reports/executive-summary", apiKeyAuth, reportController.generateExecutiveSummary);
  router.get("/reports/compliance", apiKeyAuth, reportController.generateComplianceReport);
  router.get("/reports/detailed", apiKeyAuth, reportController.generateDetailedReport);
  router.get("/reports/compliance/export/excel", apiKeyAuth, reportController.exportComplianceToExcel);
  
  // HTML Raporlar
  router.get("/reports/risk-summary/html", apiKeyAuth, reportController.generateRiskSummaryHtml);
  router.get("/reports/executive-summary/html", apiKeyAuth, reportController.generateExecutiveSummaryHtml);
  router.get("/reports/compliance/html", apiKeyAuth, reportController.generateComplianceReportHtml);
  router.get("/reports/detailed/html", apiKeyAuth, reportController.generateDetailedReportHtml);
  
  // Markdown Raporlar
  router.get("/reports/risk-summary/markdown", apiKeyAuth, reportController.generateRiskSummaryMarkdown);
  router.get("/reports/executive-summary/markdown", apiKeyAuth, reportController.generateExecutiveSummaryMarkdown);
  router.get("/reports/compliance/markdown", apiKeyAuth, reportController.generateComplianceReportMarkdown);
  router.get("/reports/detailed/markdown", apiKeyAuth, reportController.generateDetailedReportMarkdown);

  // Risk allowlist yönetimi (protected)
  router.get("/allowlist", apiKeyAuth, allowlistController.list);
  router.post(
    "/allowlist",
    apiKeyAuth,
    requireRole("admin"),
    allowlistController.upsert
  );
  router.delete(
    "/allowlist/:imageName",
    apiKeyAuth,
    requireRole("admin"),
    allowlistController.remove
  );

  // Alert rules yönetimi (protected)
  router.get("/alerts", apiKeyAuth, alertController.listRules);
  router.post(
    "/alerts",
    apiKeyAuth,
    requireRole("admin"),
    alertController.createRule
  );
  router.put(
    "/alerts/:id",
    apiKeyAuth,
    requireRole("admin"),
    alertController.updateRule
  );
  router.delete(
    "/alerts/:id",
    apiKeyAuth,
    requireRole("admin"),
    alertController.deleteRule
  );

  // Custom risk rules yönetimi (protected)
  router.get("/custom-rules", apiKeyAuth, customRuleController.list);
  router.get("/custom-rules/:id", apiKeyAuth, customRuleController.getById);
  router.post(
    "/custom-rules",
    apiKeyAuth,
    requireRole("admin"),
    customRuleController.create
  );
  router.put(
    "/custom-rules/:id",
    apiKeyAuth,
    requireRole("admin"),
    customRuleController.update
  );
  router.delete(
    "/custom-rules/:id",
    apiKeyAuth,
    requireRole("admin"),
    customRuleController.delete
  );
  router.post(
    "/custom-rules/:id/toggle",
    apiKeyAuth,
    requireRole("admin"),
    customRuleController.toggleEnabled
  );

  // Audit log yönetimi (protected)
  router.get("/audit-logs", apiKeyAuth, auditController.list);
  router.get("/audit-logs/action/:action", apiKeyAuth, auditController.getByAction);
  router.get("/audit-logs/resource/:resourceType/:resourceId", apiKeyAuth, auditController.getByResource);

  // Dependency graph
  router.get("/dependency-graph", dependencyController.getGraph);
  router.get("/dependency-graph/image/:imageName", dependencyController.getImageDependencies);

  // Compliance reporting - TODO: Method'lar eklenecek
  // router.get("/compliance/:standard", complianceController.getReport);
  // router.get("/compliance", complianceController.getAllReports);

  // Remediation recommendations - TODO: Method'lar eklenecek
  // router.get("/remediation/image/:imageName", remediationController.getImageRecommendations);
  // router.get("/remediation/general", remediationController.getGeneralRecommendations);

  // Security scorecard
  router.get("/scorecard/:imageName", scorecardController.getImageScorecard);

  // API token yönetimi (sadece admin)
  router.get(
    "/tokens",
    apiKeyAuth,
    requireRole("admin"),
    apiTokenController.list
  );
  router.post(
    "/tokens",
    apiKeyAuth,
    requireRole("admin"),
    apiTokenController.create
  );
  router.delete(
    "/tokens/:id",
    apiKeyAuth,
    requireRole("admin"),
    apiTokenController.delete
  );

  // Jira ticket oluşturma (protected)
  router.post(
    "/tickets/jira",
    apiKeyAuth,
    jiraController.createTicket
  );

  // Runbook URL'leri (public, herkes erişebilir)
  router.get("/runbooks", runbookController.getAllMappings);
  router.get("/runbooks/:riskFactor", runbookController.getRunbookUrl);

  // Cluster yönetimi (public, herkes erişebilir)
  router.get("/clusters", clusterController.listClusters);
  router.get("/clusters/:clusterId/stats", clusterController.getClusterStats);

  // Risk Budget yönetimi (protected)
  router.get("/risk-budgets", apiKeyAuth, riskBudgetController.list);
  router.get("/risk-budgets/:id", apiKeyAuth, riskBudgetController.getById);
  router.post("/risk-budgets", apiKeyAuth, requireRole("admin"), riskBudgetController.create);
  router.put("/risk-budgets/:id", apiKeyAuth, requireRole("admin"), riskBudgetController.update);
  router.delete("/risk-budgets/:id", apiKeyAuth, requireRole("admin"), riskBudgetController.delete);
  router.post("/risk-budgets/:id/check", apiKeyAuth, riskBudgetController.check);
  router.post("/risk-budgets/check-all", apiKeyAuth, riskBudgetController.checkAll);

  // SBOM (Software Bill of Materials) endpoints
  router.get("/sbom/image/:imageName", apiKeyAuth, sbomController.getSBOM);
  router.post("/sbom/image/:imageName/rescan", apiKeyAuth, requireRole("admin"), sbomController.rescanSBOM);
  router.get("/sbom/cves", apiKeyAuth, sbomController.getAllCVEs);
  router.get("/sbom/package/:packageName", apiKeyAuth, sbomController.findByPackage);

  // Anomali tespiti endpoints
  router.get("/anomalies", apiKeyAuth, anomalyController.listUnresolved);
  router.get("/anomalies/image/:imageName", apiKeyAuth, anomalyController.getByImage);
  router.post("/anomalies/:id/resolve", apiKeyAuth, anomalyController.resolve);

  // Bildirim gruplama endpoints
  router.get("/notifications", apiKeyAuth, notificationController.listActive);
  router.post("/notifications/:id/acknowledge", apiKeyAuth, notificationController.acknowledge);
  router.post("/notifications/:id/dismiss", apiKeyAuth, notificationController.dismiss);

  // Webhook subscription yönetimi (protected)
  router.get("/webhooks", apiKeyAuth, webhookController.list);
  router.get("/webhooks/:id", apiKeyAuth, webhookController.getById);
  router.post("/webhooks", apiKeyAuth, requireRole("admin"), webhookController.create);
  router.put("/webhooks/:id", apiKeyAuth, requireRole("admin"), webhookController.update);
  router.delete("/webhooks/:id", apiKeyAuth, requireRole("admin"), webhookController.delete);
  router.post("/webhooks/:id/test", apiKeyAuth, requireRole("admin"), webhookController.test);

  // Widget yönetimi (protected)
  router.get("/widgets", apiKeyAuth, widgetController.list);
  router.get("/widgets/:id/data", apiKeyAuth, widgetController.getData);
  router.post("/widgets", apiKeyAuth, requireRole("admin"), widgetController.create);
  router.put("/widgets/:id", apiKeyAuth, requireRole("admin"), widgetController.update);
  router.delete("/widgets/:id", apiKeyAuth, requireRole("admin"), widgetController.delete);
  router.post("/widgets/positions", apiKeyAuth, requireRole("admin"), widgetController.updatePositions);

  // Image karşılaştırma endpoints
  router.get("/images/compare", apiKeyAuth, imageComparisonController.compare);
  router.get("/images/:imageName/history/analyze", apiKeyAuth, imageComparisonController.analyzeHistory);

  // Compliance endpoints
  router.get("/compliance", apiKeyAuth, complianceController.list);
  router.get("/compliance/:standard", apiKeyAuth, complianceController.getLatest);
  router.post("/compliance/:standard/assess", apiKeyAuth, requireRole("admin"), complianceController.assess);

  // Scheduled Reports endpoints
  router.get("/scheduled-reports", apiKeyAuth, scheduledReportController.list);
  router.get("/scheduled-reports/:id", apiKeyAuth, scheduledReportController.getById);
  router.post("/scheduled-reports", apiKeyAuth, requireRole("admin"), scheduledReportController.create);
  router.put("/scheduled-reports/:id", apiKeyAuth, requireRole("admin"), scheduledReportController.update);
  router.delete("/scheduled-reports/:id", apiKeyAuth, requireRole("admin"), scheduledReportController.delete);
  router.post("/scheduled-reports/:id/run-now", apiKeyAuth, requireRole("admin"), scheduledReportController.runNow);
  router.post("/scheduled-reports/:id/toggle", apiKeyAuth, requireRole("admin"), scheduledReportController.toggleEnabled);

  // Report Templates endpoints
  router.get("/report-templates", apiKeyAuth, reportTemplateController.list);
  router.get("/report-templates/categories", apiKeyAuth, reportTemplateController.getCategories);
  router.get("/report-templates/tags", apiKeyAuth, reportTemplateController.getTags);
  router.get("/report-templates/default", apiKeyAuth, reportTemplateController.getDefault);
  router.get("/report-templates/:id", apiKeyAuth, reportTemplateController.getById);
  router.get("/report-templates/:id/preview", apiKeyAuth, reportTemplateController.preview);
  router.post("/report-templates", apiKeyAuth, requireRole("admin"), reportTemplateController.create);
  router.put("/report-templates/:id", apiKeyAuth, requireRole("admin"), reportTemplateController.update);
  router.post("/report-templates/:id/upload-logo", apiKeyAuth, requireRole("admin"), uploadLogo.single("logo"), reportTemplateController.uploadLogo);
  router.post("/report-templates/:id/copy", apiKeyAuth, requireRole("admin"), reportTemplateController.copy);
  router.get("/report-templates/:id/export", apiKeyAuth, reportTemplateController.exportTemplate);
  router.post("/report-templates/import", apiKeyAuth, requireRole("admin"), reportTemplateController.importTemplate);
  router.get("/report-templates/:id/versions", apiKeyAuth, reportTemplateController.getVersions);
  router.get("/report-templates/:id/versions/:version", apiKeyAuth, reportTemplateController.getVersion);
  router.post("/report-templates/:id/versions/:version/restore", apiKeyAuth, requireRole("admin"), reportTemplateController.restoreVersion);
  router.delete("/report-templates/:id", apiKeyAuth, requireRole("admin"), reportTemplateController.delete);
  router.post("/report-templates/:id/set-default", apiKeyAuth, requireRole("admin"), reportTemplateController.setAsDefault);
  router.post("/report-templates/initialize", apiKeyAuth, requireRole("admin"), reportTemplateController.initialize);

  // Report History endpoints
  router.get("/report-history", apiKeyAuth, reportHistoryController.list);
  router.get("/report-history/statistics", apiKeyAuth, reportHistoryController.getStatistics);
  router.get("/report-history/:id", apiKeyAuth, reportHistoryController.getById);
  router.post("/report-history", apiKeyAuth, requireRole("admin"), reportHistoryController.create);
  router.delete("/report-history/:id", apiKeyAuth, requireRole("admin"), reportHistoryController.delete);

  // AI endpoints
  router.post("/ai/train", apiKeyAuth, requireRole("admin"), aiController.trainModel);
  router.get("/ai/status", apiKeyAuth, aiController.getModelStatus);
  router.get("/ai/predict/:imageName", apiKeyAuth, aiController.predictRisk);
  router.post("/ai/predict/bulk", apiKeyAuth, aiController.predictBulkRisk);
  router.get("/ai/anomaly/:imageName", apiKeyAuth, aiController.detectAnomaly);
  router.get("/ai/anomalies", apiKeyAuth, aiController.detectAllAnomalies);
  router.get("/ai/recommendations/:imageName", apiKeyAuth, aiController.getIntelligentRecommendations);
  router.get("/ai/nlp/:imageName", apiKeyAuth, aiController.analyzeCVE);
  router.get("/ai/similarity/clusters", apiKeyAuth, aiController.getImageClusters);
  router.get("/ai/similarity/:imageName", apiKeyAuth, aiController.findSimilarImages);
  router.get("/ai/maintenance/schedule", apiKeyAuth, aiController.getMaintenanceSchedule);
  router.get("/ai/correlation", apiKeyAuth, aiController.getCorrelations);
  router.post("/ai/remediation/predict-success", apiKeyAuth, aiController.predictRemediationSuccess);
  router.get("/ai/health/:imageName", apiKeyAuth, aiController.getHealthScore);
  router.post("/ai/alerts/prioritize", apiKeyAuth, aiController.prioritizeAlerts);
  router.get("/ai/behavior/:imageName", apiKeyAuth, aiController.analyzeBehavior);
  router.get("/ai/behavior/cluster/:clusterId", apiKeyAuth, aiController.analyzeClusterBehavior);
  router.post("/ai/remediation/decision", apiKeyAuth, aiController.makeRemediationDecision);
  router.get("/ai/propagation/:imageName", apiKeyAuth, aiController.analyzePropagation);
  router.post("/ai/cost-benefit", apiKeyAuth, aiController.analyzeCostBenefit);
  router.get("/ai/security-posture/:imageName", apiKeyAuth, aiController.getSecurityPosture);
  router.get("/ai/security-posture/cluster/:clusterId", apiKeyAuth, aiController.getClusterSecurityPosture);
  router.get("/ai/root-cause/:anomalyId", apiKeyAuth, aiController.analyzeRootCause);
  router.get("/ai/forecast/:imageName", apiKeyAuth, aiController.forecastRisk);
  router.get("/ai/forecast/cluster/:clusterId", apiKeyAuth, aiController.forecastClusterRisk);
  router.get("/ai/optimization/:imageName", apiKeyAuth, aiController.optimizeWorkload);
  router.get("/ai/optimization/cluster/:clusterId", apiKeyAuth, aiController.optimizeCluster);
  router.get("/ai/zero-day/:imageName", apiKeyAuth, aiController.detectZeroDay);
  router.get("/ai/threats/:imageName", apiKeyAuth, aiController.checkThreats);
  router.post("/ai/patches/prioritize", apiKeyAuth, aiController.prioritizePatches);
  
  // Generative AI endpoints
  router.post("/ai/generate/script", apiKeyAuth, aiController.generateRemediationScript);
  router.post("/ai/generate/report", apiKeyAuth, aiController.generateReport);
  router.post("/ai/generate/cve-description", apiKeyAuth, aiController.generateCVEDescription);

  // IoT endpoints
  router.post("/iot/scan", apiKeyAuth, requireRole("admin"), iotController.scanDevice);
  router.post("/iot/scan/bulk", apiKeyAuth, requireRole("admin"), iotController.scanBulkDevices);
  router.get("/iot/images", apiKeyAuth, iotController.listImages);
  router.get("/iot/statistics", apiKeyAuth, iotController.getStatistics);

  // Computer Vision endpoints
  router.get("/cv/analyze/:imageName", apiKeyAuth, cvController.analyzeImage);
  router.get("/cv/features/:imageName", apiKeyAuth, cvController.extractFeatures);

  return router;
}


