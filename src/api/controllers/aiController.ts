import { Request, Response } from "express";
import { MLRiskPredictionService, RiskPrediction } from "../../services/mlRiskPredictionService";
import { AIAnomalyDetectionService, AIAnomalyResult } from "../../services/aiAnomalyDetectionService";
import { IntelligentRecommendationService, IntelligentRecommendation } from "../../services/intelligentRecommendationService";
import { NLPCVEAnalysisService, NLPImageAnalysis } from "../../services/nlpCveAnalysisService";
import { ImageSimilarityService, ImageCluster, SimilarImage } from "../../services/imageSimilarityService";
import { PredictiveMaintenanceService, MaintenanceSchedule } from "../../services/predictiveMaintenanceService";
import { RiskCorrelationService, CorrelationMatrix } from "../../services/riskCorrelationService";
import { RemediationSuccessPredictionService, SuccessPrediction, RemediationScript } from "../../services/remediationSuccessPredictionService";
import { ImageHealthScoreService, HealthScore } from "../../services/imageHealthScoreService";
import { SmartAlertPrioritizationService, Alert, PrioritizedAlert } from "../../services/smartAlertPrioritizationService";
import { BehavioralPatternAnalysisService, BehavioralPattern, ClusterBehavior } from "../../services/behavioralPatternAnalysisService";
import { AutoRemediationDecisionService, RemediationDecision } from "../../services/autoRemediationDecisionService";
import { RiskPropagationService, RiskPropagation } from "../../services/riskPropagationService";
import { CostBenefitAnalysisService, CostBenefitAnalysis } from "../../services/costBenefitAnalysisService";
import { SecurityPostureService, SecurityPosture, ClusterSecurityPosture } from "../../services/securityPostureService";
import { AnomalyRootCauseService, RootCauseAnalysis } from "../../services/anomalyRootCauseService";
import { PredictiveRiskModelingService, RiskForecast, ClusterRiskForecast } from "../../services/predictiveRiskModelingService";
import { IntelligentWorkloadOptimizationService, WorkloadOptimization, ClusterOptimization } from "../../services/intelligentWorkloadOptimizationService";
import { ZeroDayDetectionService, ZeroDayDetection } from "../../services/zeroDayDetectionService";
import { ThreatIntelligenceService, ThreatMatch } from "../../services/threatIntelligenceService";
import { IntelligentPatchPrioritizationService, Patch, PrioritizedPatch } from "../../services/intelligentPatchPrioritizationService";
import { GenerativeAIService } from "../../services/generativeAIService";
import { AnomalyModel } from "../../persistence/anomaly.model";
import { ImageRiskModel } from "../../persistence/imageRisk.model";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../../utils/logger";

export class AIController {
  private mlPredictionService: MLRiskPredictionService;
  private aiAnomalyService: AIAnomalyDetectionService;
  private intelligentRecommendationService: IntelligentRecommendationService;
  private nlpCveService: NLPCVEAnalysisService;
  private similarityService: ImageSimilarityService;
  private maintenanceService: PredictiveMaintenanceService;
  private correlationService: RiskCorrelationService;
  private remediationSuccessService: RemediationSuccessPredictionService;
  private healthScoreService: ImageHealthScoreService;
  private alertPrioritizationService: SmartAlertPrioritizationService;
  private behavioralPatternService: BehavioralPatternAnalysisService;
  private autoRemediationService: AutoRemediationDecisionService;
  private riskPropagationService: RiskPropagationService;
  private costBenefitService: CostBenefitAnalysisService;
  private securityPostureService: SecurityPostureService;
  private rootCauseService: AnomalyRootCauseService;
  private predictiveRiskService: PredictiveRiskModelingService;
  private workloadOptimizationService: IntelligentWorkloadOptimizationService;
  private zeroDayService: ZeroDayDetectionService;
  private threatIntelligenceService: ThreatIntelligenceService;
  private patchPrioritizationService: IntelligentPatchPrioritizationService;
  private generativeAIService: GenerativeAIService;

  constructor() {
    this.mlPredictionService = new MLRiskPredictionService();
    this.aiAnomalyService = new AIAnomalyDetectionService();
    this.intelligentRecommendationService = new IntelligentRecommendationService();
    this.nlpCveService = new NLPCVEAnalysisService();
    this.similarityService = new ImageSimilarityService();
    this.maintenanceService = new PredictiveMaintenanceService();
    this.correlationService = new RiskCorrelationService();
    this.remediationSuccessService = new RemediationSuccessPredictionService();
    this.healthScoreService = new ImageHealthScoreService();
    this.alertPrioritizationService = new SmartAlertPrioritizationService();
    this.behavioralPatternService = new BehavioralPatternAnalysisService();
    this.autoRemediationService = new AutoRemediationDecisionService();
    this.riskPropagationService = new RiskPropagationService();
    this.costBenefitService = new CostBenefitAnalysisService();
    this.securityPostureService = new SecurityPostureService();
    this.rootCauseService = new AnomalyRootCauseService();
    this.predictiveRiskService = new PredictiveRiskModelingService();
    this.workloadOptimizationService = new IntelligentWorkloadOptimizationService();
    this.zeroDayService = new ZeroDayDetectionService();
    this.threatIntelligenceService = new ThreatIntelligenceService();
    this.patchPrioritizationService = new IntelligentPatchPrioritizationService();
    this.generativeAIService = new GenerativeAIService();
  }

  /**
   * ML modelini eğitir
   * POST /ai/train
   */
  trainModel = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.query;

    logger.info("ML model eğitimi başlatılıyor...");

    try {
      await this.mlPredictionService.trainModel(clusterId as string | undefined);
      await this.aiAnomalyService.trainAutoencoder(clusterId as string | undefined);
      await this.intelligentRecommendationService.trainPriorityModel();
      await this.nlpCveService.trainTextModel();
      await this.similarityService.trainClusteringModel(clusterId as string | undefined);
      await this.maintenanceService.trainModel(clusterId as string | undefined);
      await this.remediationSuccessService.trainModel();
      await this.healthScoreService.trainModel(clusterId as string | undefined);
      await this.alertPrioritizationService.trainModel(clusterId as string | undefined);
      await this.behavioralPatternService.trainModel(clusterId as string | undefined);
      await this.autoRemediationService.trainModel();
      await this.costBenefitService.trainModel();
      await this.securityPostureService.trainModel(clusterId as string | undefined);
      await this.rootCauseService.trainModel(clusterId as string | undefined);
      await this.predictiveRiskService.trainModel(clusterId as string | undefined);
      await this.workloadOptimizationService.trainModel(clusterId as string | undefined);
      await this.zeroDayService.trainModel(clusterId as string | undefined);
      await this.threatIntelligenceService.trainModel(clusterId as string | undefined);
      await this.patchPrioritizationService.trainModel(clusterId as string | undefined);

      res.json({
        success: true,
        message: "AI modelleri başarıyla eğitildi",
        models: {
          riskPrediction: this.mlPredictionService.isModelReady(),
          anomalyDetection: this.aiAnomalyService.isModelReady(),
          recommendationScoring: this.intelligentRecommendationService.isModelReady(),
        },
      });
    } catch (error: any) {
      logger.error("Model eğitimi sırasında hata:", error);
      res.status(500).json({
        success: false,
        message: "Model eğitimi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Image için risk tahmini yapar
   * GET /ai/predict/:imageName
   */
  predictRisk = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const prediction = await this.mlPredictionService.predictRisk(image);

      res.json({
        success: true,
        imageName: image.imageName,
        currentRisk: {
          score: image.riskScore,
          level: image.riskLevel,
        },
        prediction,
      });
    } catch (error: any) {
      logger.error("Risk tahmini sırasında hata:", error);
      res.status(500).json({
        success: false,
        message: "Risk tahmini sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Toplu risk tahmini yapar
   * POST /ai/predict/bulk
   */
  predictBulkRisk = asyncHandler(async (req: Request, res: Response) => {
    const { imageNames, clusterId } = req.body;

    if (!Array.isArray(imageNames) || imageNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "imageNames array olmalı ve boş olmamalı",
      });
    }

    const predictions: Array<{
      imageName: string;
      currentRisk: { score: number; level: string };
      prediction: RiskPrediction;
    }> = [];

    for (const imageName of imageNames) {
      const image = await ImageRiskModel.findOne({
        imageName,
        ...(clusterId && { clusterId }),
      }).exec();

      if (image) {
        try {
          const prediction = await this.mlPredictionService.predictRisk(image);
          predictions.push({
            imageName: image.imageName,
            currentRisk: {
              score: image.riskScore,
              level: image.riskLevel,
            },
            prediction,
          });
        } catch (error) {
          logger.error(`Risk tahmini hatası (${imageName}):`, error);
        }
      }
    }

    res.json({
      success: true,
      predictions,
      total: predictions.length,
    });
  });

  /**
   * AI ile anomali tespiti yapar
   * GET /ai/anomaly/:imageName
   */
  detectAnomaly = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    // Historical data çek
    const historicalImages = await ImageRiskModel.find({
      imageName: image.imageName,
      ...(clusterId && { clusterId }),
      _id: { $ne: image._id },
    })
      .sort({ lastScannedAt: -1 })
      .limit(10)
      .exec();

    try {
      const anomalyResult = await this.aiAnomalyService.detectAIAnomaly(
        image,
        historicalImages
      );

      res.json({
        success: true,
        imageName: image.imageName,
        currentRisk: {
          score: image.riskScore,
          level: image.riskLevel,
        },
        anomaly: anomalyResult,
      });
    } catch (error: any) {
      logger.error("Anomali tespiti sırasında hata:", error);
      res.status(500).json({
        success: false,
        message: "Anomali tespiti sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Tüm image'ler için anomali tespiti yapar
   * GET /ai/anomalies
   */
  detectAllAnomalies = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId, limit = 50 } = req.query;

    const images = await ImageRiskModel.find({
      ...(clusterId && { clusterId }),
    })
      .limit(Number(limit))
      .exec();

    const anomalies: Array<{
      imageName: string;
      currentRisk: { score: number; level: string };
      anomaly: AIAnomalyResult;
    }> = [];

    for (const image of images) {
      try {
        const historicalImages = await ImageRiskModel.find({
          imageName: image.imageName,
          ...(clusterId && { clusterId }),
          _id: { $ne: image._id },
        })
          .sort({ lastScannedAt: -1 })
          .limit(10)
          .exec();

        const anomalyResult = await this.aiAnomalyService.detectAIAnomaly(
          image,
          historicalImages
        );

        if (anomalyResult.isAnomaly) {
          anomalies.push({
            imageName: image.imageName,
            currentRisk: {
              score: image.riskScore,
              level: image.riskLevel,
            },
            anomaly: anomalyResult,
          });
        }
      } catch (error) {
        logger.error(`Anomali tespiti hatası (${image.imageName}):`, error);
      }
    }

    // Anomali skoruna göre sırala
    anomalies.sort((a, b) => b.anomaly.anomalyScore - a.anomaly.anomalyScore);

    res.json({
      success: true,
      anomalies,
      total: anomalies.length,
    });
  });

  /**
   * AI-powered intelligent recommendations
   * GET /ai/recommendations/:imageName
   */
  getIntelligentRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const recommendations = await this.intelligentRecommendationService.generateIntelligentRecommendations(
        image
      );

      res.json({
        success: true,
        imageName: image.imageName,
        currentRisk: {
          score: image.riskScore,
          level: image.riskLevel,
        },
        recommendations,
        summary: {
          total: recommendations.length,
          critical: recommendations.filter((r) => r.urgency === "CRITICAL").length,
          high: recommendations.filter((r) => r.urgency === "HIGH").length,
          avgAIScore: recommendations.reduce((sum, r) => sum + r.aiScore, 0) / recommendations.length,
        },
      });
    } catch (error: any) {
      logger.error("Intelligent recommendation oluşturma hatası:", error);
      res.status(500).json({
        success: false,
        message: "Intelligent recommendation oluşturma sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Model durumunu kontrol eder
   * GET /ai/status
   */
  getModelStatus = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      models: {
        riskPrediction: {
          ready: this.mlPredictionService.isModelReady(),
          name: "ML Risk Prediction Model",
          description: "Historical data'dan risk skoru tahmini yapar",
        },
        anomalyDetection: {
          ready: this.aiAnomalyService.isModelReady(),
          name: "AI Anomaly Detection Model",
          description: "Autoencoder ile anormal pattern tespiti yapar",
        },
        recommendationScoring: {
          ready: this.intelligentRecommendationService.isModelReady(),
          name: "Intelligent Recommendation Scoring",
          description: "ML-based priority scoring ile öneri önceliklendirme",
        },
        nlpCveAnalysis: {
          ready: this.nlpCveService.isModelReady(),
          name: "NLP CVE Analysis",
          description: "CVE description'larından risk analizi",
        },
        imageSimilarity: {
          ready: this.similarityService.isModelReady(),
          name: "Image Similarity Clustering",
          description: "Benzer image'leri gruplama",
        },
        predictiveMaintenance: {
          ready: this.maintenanceService.isModelReady(),
          name: "Predictive Maintenance",
          description: "Image güncelleme zamanı tahmini",
        },
        remediationSuccess: {
          ready: this.remediationSuccessService.isModelReady(),
          name: "Remediation Success Prediction",
          description: "Script başarı tahmini",
        },
        healthScore: {
          ready: this.healthScoreService.isModelReady(),
          name: "Image Health Score",
          description: "ML-based genel sağlık skoru",
        },
      },
    });
  });

  /**
   * NLP-based CVE analizi
   * GET /ai/nlp/:imageName
   */
  analyzeCVE = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const analysis = await this.nlpCveService.analyzeImage(image);

      res.json({
        success: true,
        imageName: image.imageName,
        analysis,
      });
    } catch (error: any) {
      logger.error("NLP CVE analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "NLP CVE analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Image similarity clustering
   * GET /ai/similarity/clusters?k=5&clusterId=xxx
   */
  getImageClusters = asyncHandler(async (req: Request, res: Response) => {
    const { k = 5, clusterId } = req.query;

    try {
      const clusters = await this.similarityService.clusterImages(
        Number(k),
        clusterId as string | undefined
      );

      res.json({
        success: true,
        clusters,
        total: clusters.length,
      });
    } catch (error: any) {
      logger.error("Clustering hatası:", error);
      res.status(500).json({
        success: false,
        message: "Clustering sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Benzer image'leri bul
   * GET /ai/similarity/:imageName?limit=10
   */
  findSimilarImages = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { limit = 10, clusterId } = req.query;

    try {
      const similar = await this.similarityService.findSimilarImages(
        decodeURIComponent(imageName),
        Number(limit),
        clusterId as string | undefined
      );

      res.json({
        success: true,
        imageName: decodeURIComponent(imageName),
        similarImages: similar,
        total: similar.length,
      });
    } catch (error: any) {
      logger.error("Similarity search hatası:", error);
      res.status(500).json({
        success: false,
        message: "Similarity search sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Predictive maintenance schedule
   * GET /ai/maintenance/schedule?clusterId=xxx&limit=50
   */
  getMaintenanceSchedule = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId, limit = 50 } = req.query;

    try {
      const schedule = await this.maintenanceService.generateMaintenanceSchedule(
        clusterId as string | undefined,
        Number(limit)
      );

      res.json({
        success: true,
        schedule,
        total: schedule.length,
      });
    } catch (error: any) {
      logger.error("Maintenance schedule hatası:", error);
      res.status(500).json({
        success: false,
        message: "Maintenance schedule oluşturma sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Risk correlation analysis
   * GET /ai/correlation?clusterId=xxx
   */
  getCorrelations = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.query;

    try {
      const matrix = await this.correlationService.analyzeCorrelations(
        clusterId as string | undefined
      );

      res.json({
        success: true,
        correlationMatrix: matrix,
      });
    } catch (error: any) {
      logger.error("Correlation analysis hatası:", error);
      res.status(500).json({
        success: false,
        message: "Correlation analysis sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Remediation success prediction
   * POST /ai/remediation/predict-success
   */
  predictRemediationSuccess = asyncHandler(async (req: Request, res: Response) => {
    const { imageName, script, clusterId } = req.body;

    if (!imageName || !script) {
      return res.status(400).json({
        success: false,
        message: "imageName ve script gerekli",
      });
    }

    const image = await ImageRiskModel.findOne({
      imageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const prediction = await this.remediationSuccessService.predictSuccess(
        image,
        script as RemediationScript
      );

      res.json({
        success: true,
        imageName,
        prediction,
      });
    } catch (error: any) {
      logger.error("Remediation success prediction hatası:", error);
      res.status(500).json({
        success: false,
        message: "Remediation success prediction sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Image health score
   * GET /ai/health/:imageName
   */
  getHealthScore = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const healthScore = await this.healthScoreService.calculateHealthScore(image);

      res.json({
        success: true,
        imageName: image.imageName,
        healthScore,
      });
    } catch (error: any) {
      logger.error("Health score hesaplama hatası:", error);
      res.status(500).json({
        success: false,
        message: "Health score hesaplama sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Smart alert prioritization
   * POST /ai/alerts/prioritize
   */
  prioritizeAlerts = asyncHandler(async (req: Request, res: Response) => {
    const { alerts, clusterId } = req.body;

    if (!Array.isArray(alerts) || alerts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "alerts array gerekli",
      });
    }

    try {
      const prioritized = await this.alertPrioritizationService.prioritizeAlerts(
        alerts as Alert[],
        clusterId
      );

      res.json({
        success: true,
        alerts: prioritized,
        total: prioritized.length,
      });
    } catch (error: any) {
      logger.error("Alert prioritization hatası:", error);
      res.status(500).json({
        success: false,
        message: "Alert prioritization sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Behavioral pattern analysis
   * GET /ai/behavior/:imageName
   */
  analyzeBehavior = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const pattern = await this.behavioralPatternService.analyzeBehavior(
        image,
        clusterId as string | undefined
      );

      res.json({
        success: true,
        imageName: image.imageName,
        pattern,
      });
    } catch (error: any) {
      logger.error("Behavioral pattern analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "Behavioral pattern analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Cluster behavior analysis
   * GET /ai/behavior/cluster/:clusterId
   */
  analyzeClusterBehavior = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;

    try {
      const behavior = await this.behavioralPatternService.analyzeClusterBehavior(clusterId);

      res.json({
        success: true,
        behavior,
      });
    } catch (error: any) {
      logger.error("Cluster behavior analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "Cluster behavior analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Auto-remediation decision
   * POST /ai/remediation/decision
   */
  makeRemediationDecision = asyncHandler(async (req: Request, res: Response) => {
    const { imageName, scripts, clusterId } = req.body;

    if (!imageName || !Array.isArray(scripts)) {
      return res.status(400).json({
        success: false,
        message: "imageName ve scripts array gerekli",
      });
    }

    const image = await ImageRiskModel.findOne({
      imageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const decision = await this.autoRemediationService.makeDecision(
        image,
        scripts as any as import("../../services/remediationScriptService").RemediationScript[]
      );

      res.json({
        success: true,
        imageName,
        decision,
      });
    } catch (error: any) {
      logger.error("Remediation decision hatası:", error);
      res.status(500).json({
        success: false,
        message: "Remediation decision sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Risk propagation analysis
   * GET /ai/propagation/:imageName?maxDepth=3
   */
  analyzePropagation = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId, maxDepth = 3 } = req.query;

    try {
      const propagation = await this.riskPropagationService.analyzePropagation(
        decodeURIComponent(imageName),
        clusterId as string | undefined,
        Number(maxDepth)
      );

      res.json({
        success: true,
        propagation,
      });
    } catch (error: any) {
      logger.error("Risk propagation analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "Risk propagation analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Cost-benefit analysis
   * POST /ai/cost-benefit
   */
  analyzeCostBenefit = asyncHandler(async (req: Request, res: Response) => {
    const { imageName, estimatedRiskReduction, estimatedEffort, clusterId } = req.body;

    if (!imageName || !estimatedRiskReduction || !estimatedEffort) {
      return res.status(400).json({
        success: false,
        message: "imageName, estimatedRiskReduction ve estimatedEffort gerekli",
      });
    }

    const image = await ImageRiskModel.findOne({
      imageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const analysis = await this.costBenefitService.analyze(
        image,
        estimatedRiskReduction,
        estimatedEffort
      );

      res.json({
        success: true,
        imageName,
        analysis,
      });
    } catch (error: any) {
      logger.error("Cost-benefit analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "Cost-benefit analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Security posture scoring
   * GET /ai/security-posture/:imageName
   */
  getSecurityPosture = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const posture = await this.securityPostureService.calculatePosture(image);

      res.json({
        success: true,
        imageName: image.imageName,
        posture,
      });
    } catch (error: any) {
      logger.error("Security posture hesaplama hatası:", error);
      res.status(500).json({
        success: false,
        message: "Security posture hesaplama sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Cluster security posture
   * GET /ai/security-posture/cluster/:clusterId
   */
  getClusterSecurityPosture = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;

    try {
      const posture = await this.securityPostureService.calculateClusterPosture(clusterId);

      res.json({
        success: true,
        posture,
      });
    } catch (error: any) {
      logger.error("Cluster security posture hatası:", error);
      res.status(500).json({
        success: false,
        message: "Cluster security posture hesaplama sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Anomaly root cause analysis
   * GET /ai/root-cause/:anomalyId
   */
  analyzeRootCause = asyncHandler(async (req: Request, res: Response) => {
    const { anomalyId } = req.params;
    const { clusterId } = req.query;

    const anomaly = await AnomalyModel.findById(anomalyId).exec();

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomali bulunamadı",
      });
    }

    const image = await ImageRiskModel.findOne({
      imageName: anomaly.imageName,
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const analysis = await this.rootCauseService.analyzeRootCause(
        anomaly,
        image,
        clusterId as string | undefined
      );

      res.json({
        success: true,
        analysis,
      });
    } catch (error: any) {
      logger.error("Root cause analizi hatası:", error);
      res.status(500).json({
        success: false,
        message: "Root cause analizi sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Predictive risk modeling
   * GET /ai/forecast/:imageName?days=30
   */
  forecastRisk = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId, days = 30 } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const forecast = await this.predictiveRiskService.forecastRisk(
        image,
        Number(days),
        clusterId as string | undefined
      );

      res.json({
        success: true,
        imageName: image.imageName,
        forecast,
      });
    } catch (error: any) {
      logger.error("Risk forecast hatası:", error);
      res.status(500).json({
        success: false,
        message: "Risk forecast sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Cluster risk forecast
   * GET /ai/forecast/cluster/:clusterId?days=30
   */
  forecastClusterRisk = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;
    const { days = 30 } = req.query;

    try {
      const forecast = await this.predictiveRiskService.forecastClusterRisk(
        clusterId,
        Number(days)
      );

      res.json({
        success: true,
        forecast,
      });
    } catch (error: any) {
      logger.error("Cluster risk forecast hatası:", error);
      res.status(500).json({
        success: false,
        message: "Cluster risk forecast sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Intelligent workload optimization
   * GET /ai/optimization/:imageName
   */
  optimizeWorkload = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const optimization = await this.workloadOptimizationService.optimizeWorkload(image);

      res.json({
        success: true,
        imageName: image.imageName,
        optimization,
      });
    } catch (error: any) {
      logger.error("Workload optimization hatası:", error);
      res.status(500).json({
        success: false,
        message: "Workload optimization sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Cluster workload optimization
   * GET /ai/optimization/cluster/:clusterId
   */
  optimizeCluster = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;

    try {
      const optimization = await this.workloadOptimizationService.optimizeCluster(clusterId);

      res.json({
        success: true,
        optimization,
      });
    } catch (error: any) {
      logger.error("Cluster optimization hatası:", error);
      res.status(500).json({
        success: false,
        message: "Cluster optimization sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Zero-day detection
   * GET /ai/zero-day/:imageName
   */
  detectZeroDay = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const detection = await this.zeroDayService.detectZeroDay(
        image,
        clusterId as string | undefined
      );

      res.json({
        success: true,
        imageName: image.imageName,
        detection,
      });
    } catch (error: any) {
      logger.error("Zero-day detection hatası:", error);
      res.status(500).json({
        success: false,
        message: "Zero-day detection sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Threat intelligence check
   * GET /ai/threats/:imageName
   */
  checkThreats = asyncHandler(async (req: Request, res: Response) => {
    const { imageName } = req.params;
    const { clusterId } = req.query;

    const image = await ImageRiskModel.findOne({
      imageName: decodeURIComponent(imageName),
      ...(clusterId && { clusterId }),
    }).exec();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image bulunamadı",
      });
    }

    try {
      const matches = await this.threatIntelligenceService.checkThreats(
        image,
        clusterId as string | undefined
      );

      res.json({
        success: true,
        imageName: image.imageName,
        threatMatches: matches,
        total: matches.length,
      });
    } catch (error: any) {
      logger.error("Threat intelligence check hatası:", error);
      res.status(500).json({
        success: false,
        message: "Threat intelligence check sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Intelligent patch prioritization
   * POST /ai/patches/prioritize
   */
  prioritizePatches = asyncHandler(async (req: Request, res: Response) => {
    const { patches, clusterId } = req.body;

    if (!Array.isArray(patches) || patches.length === 0) {
      return res.status(400).json({
        success: false,
        message: "patches array gerekli",
      });
    }

    try {
      const prioritized = await this.patchPrioritizationService.prioritizePatches(
        patches as Patch[],
        clusterId
      );

      res.json({
        success: true,
        patches: prioritized,
        total: prioritized.length,
      });
    } catch (error: any) {
      logger.error("Patch prioritization hatası:", error);
      res.status(500).json({
        success: false,
        message: "Patch prioritization sırasında hata oluştu",
        error: error.message,
      });
    }
  });

  /**
   * Generative AI: Remediation script oluşturur
   * POST /ai/generate/script
   */
  generateRemediationScript = asyncHandler(async (req: Request, res: Response) => {
    const request = req.body;

    const result = await this.generativeAIService.generateRemediationScript(request);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Generative AI: Natural language rapor oluşturur
   * POST /ai/generate/report
   */
  generateReport = asyncHandler(async (req: Request, res: Response) => {
    const request = req.body;

    const result = await this.generativeAIService.generateNaturalLanguageReport(request);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Generative AI: CVE açıklaması oluşturur
   * POST /ai/generate/cve-description
   */
  generateCVEDescription = asyncHandler(async (req: Request, res: Response) => {
    const request = req.body;

    const result = await this.generativeAIService.generateCVEDescription(request);

    res.json({
      success: true,
      data: result,
    });
  });
}

