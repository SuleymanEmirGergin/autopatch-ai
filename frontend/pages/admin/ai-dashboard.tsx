import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getAIModelStatus,
  trainAIModels,
  predictRisk,
  detectAIAnomaly,
  getIntelligentRecommendations,
  getImageHealthScore,
  getPredictiveMaintenanceSchedule,
  getRiskCorrelation,
  forecastRisk,
  getSecurityPosture,
  analyzeCostBenefit,
  optimizeWorkload,
  detectZeroDay,
  checkThreats,
  fetchImages,
  ImageRisk,
  AIModelStatusResponse,
  RiskPredictionResponse,
  AIAnomalyResponse,
  IntelligentRecommendationsResponse,
  ImageHealthScore,
  PredictiveMaintenanceSchedule,
  RiskCorrelationMatrix,
  RiskForecast,
  SecurityPosture,
  CostBenefitAnalysis,
  WorkloadOptimization,
  ZeroDayDetection,
  ThreatMatch,
} from "../../lib/api";

export default function AIDashboard() {
  const [modelStatus, setModelStatus] = useState<AIModelStatusResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [images, setImages] = useState<ImageRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis Results
  const [riskPrediction, setRiskPrediction] = useState<RiskPredictionResponse | null>(null);
  const [anomalyDetection, setAnomalyDetection] = useState<AIAnomalyResponse | null>(null);
  const [intelligentRecommendations, setIntelligentRecommendations] =
    useState<IntelligentRecommendationsResponse | null>(null);
  const [healthScore, setHealthScore] = useState<ImageHealthScore | null>(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<PredictiveMaintenanceSchedule[]>([]);
  const [riskCorrelation, setRiskCorrelation] = useState<RiskCorrelationMatrix | null>(null);
  const [riskForecast, setRiskForecast] = useState<RiskForecast | null>(null);
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture | null>(null);
  const [costBenefit, setCostBenefit] = useState<CostBenefitAnalysis | null>(null);
  const [workloadOptimization, setWorkloadOptimization] = useState<WorkloadOptimization | null>(null);
  const [zeroDayDetection, setZeroDayDetection] = useState<ZeroDayDetection | null>(null);
  const [threatMatches, setThreatMatches] = useState<ThreatMatch[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "prediction"
    | "anomaly"
    | "recommendations"
    | "health"
    | "maintenance"
    | "correlation"
    | "forecast"
    | "posture"
    | "cost-benefit"
    | "optimization"
    | "zero-day"
    | "threats"
  >("overview");

  useEffect(() => {
    loadModelStatus();
    loadImages();
  }, []);

  const loadModelStatus = async () => {
    try {
      const status = await getAIModelStatus();
      setModelStatus(status);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadImages = async () => {
    try {
      const data = await fetchImages();
      setImages(data);
      if (data.length > 0) {
        setSelectedImage(data[0].imageName);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTrainModels = async () => {
    setLoading(true);
    setError(null);
    try {
      await trainAIModels();
      await loadModelStatus();
      alert("AI modelleri eğitildi!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {
      // Run all AI analyses in parallel
      const [
        prediction,
        anomaly,
        recommendations,
        health,
        forecast,
        posture,
        zeroDay,
        threats,
      ] = await Promise.all([
        predictRisk(selectedImage).catch(() => null),
        detectAIAnomaly(selectedImage).catch(() => null),
        getIntelligentRecommendations(selectedImage).catch(() => null),
        getImageHealthScore(selectedImage).catch(() => null),
        forecastRisk(selectedImage, 30).catch(() => null),
        getSecurityPosture(selectedImage).catch(() => null),
        detectZeroDay(selectedImage).catch(() => null),
        checkThreats(selectedImage).catch(() => null),
      ]);

      if (prediction) setRiskPrediction(prediction);
      if (anomaly) setAnomalyDetection(anomaly);
      if (recommendations) setIntelligentRecommendations(recommendations);
      if (health) setHealthScore(health.healthScore);
      if (forecast) setRiskForecast(forecast.forecast);
      if (posture) setSecurityPosture(posture.posture);
      if (zeroDay) setZeroDayDetection(zeroDay.detection);
      if (threats) setThreatMatches(threats.threatMatches);

      setActiveTab("overview");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceSchedule = async () => {
    try {
      const result = await getPredictiveMaintenanceSchedule();
      setMaintenanceSchedule(result.schedule);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadRiskCorrelation = async () => {
    try {
      const result = await getRiskCorrelation();
      setRiskCorrelation(result.correlation);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCostBenefitAnalysis = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const result = await analyzeCostBenefit(selectedImage, 30, "MEDIUM");
      setCostBenefit(result.analysis);
      setActiveTab("cost-benefit");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkloadOptimization = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const result = await optimizeWorkload(selectedImage);
      setWorkloadOptimization(result.optimization);
      setActiveTab("optimization");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <Head>
        <title>AI Dashboard - AutoPatch AI</title>
      </Head>

      <header className="header">
        <div className="header-title">🤖 AI Dashboard</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="button"
            onClick={handleTrainModels}
            disabled={loading}
            style={{ backgroundColor: "#10b981" }}
          >
            {loading ? "Eğitiliyor..." : "Modelleri Eğit"}
          </button>
          <Link href="/">
            <button className="button button-secondary">Ana Sayfa</button>
          </Link>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Model Status */}
        <section style={{ marginBottom: 24 }}>
          <h2>AI Model Durumu</h2>
          {modelStatus ? (
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {Object.entries(modelStatus.models).map(([key, model]) => (
                <div
                  key={key}
                  style={{
                    padding: 16,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    backgroundColor: model.ready ? "#d1fae5" : "#fee2e2",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>{model.name}</div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>{model.description}</div>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        backgroundColor: model.ready ? "#10b981" : "#ef4444",
                        color: "white",
                        fontSize: 12,
                      }}
                    >
                      {model.ready ? "✅ Hazır" : "❌ Eğitilmemiş"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>Yükleniyor...</div>
          )}
        </section>

        {/* Image Selection */}
        <section style={{ marginBottom: 24 }}>
          <h2>Image Seçimi</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={selectedImage}
              onChange={(e) => setSelectedImage(e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #e5e7eb" }}
            >
              <option value="">Image seçin...</option>
              {images.map((img) => (
                <option key={img._id} value={img.imageName}>
                  {img.imageName} ({img.riskLevel})
                </option>
              ))}
            </select>
            <button
              className="button"
              onClick={handleAnalyzeImage}
              disabled={!selectedImage || loading}
            >
              {loading ? "Analiz ediliyor..." : "AI Analizi Yap"}
            </button>
          </div>
        </section>

        {/* Tabs */}
        <section>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "overview", label: "📊 Genel Bakış" },
              { id: "prediction", label: "🔮 Risk Tahmini" },
              { id: "anomaly", label: "⚠️ Anomali Tespiti" },
              { id: "recommendations", label: "💡 Akıllı Öneriler" },
              { id: "health", label: "🏥 Health Score" },
              { id: "forecast", label: "📈 Risk Forecast" },
              { id: "posture", label: "🛡️ Security Posture" },
              { id: "cost-benefit", label: "💰 Cost-Benefit" },
              { id: "optimization", label: "⚡ Optimization" },
              { id: "zero-day", label: "🔴 Zero-Day" },
              { id: "threats", label: "🎯 Threats" },
              { id: "maintenance", label: "🔧 Maintenance" },
              { id: "correlation", label: "🔗 Correlation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "1px solid #e5e7eb",
                  backgroundColor: activeTab === tab.id ? "#2563eb" : "white",
                  color: activeTab === tab.id ? "white" : "#374151",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, minHeight: 400 }}>
            {activeTab === "overview" && (
              <div>
                <h3>Genel Bakış</h3>
                {selectedImage && (
                  <div>
                    <p>Seçili Image: <strong>{selectedImage}</strong></p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginTop: 16 }}>
                      {riskPrediction && (
                        <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          <h4>Risk Tahmini</h4>
                          <p>Mevcut: {riskPrediction.currentRisk.score}</p>
                          <p>Tahmin: {riskPrediction.prediction.predictedRiskScore}</p>
                          <p>Güven: {(riskPrediction.prediction.confidence * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {healthScore && (
                        <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          <h4>Health Score</h4>
                          <p>Genel: {healthScore.overallScore}/100</p>
                          <p>Trend: {healthScore.trend}</p>
                        </div>
                      )}
                      {securityPosture && (
                        <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          <h4>Security Posture</h4>
                          <p>Skor: {securityPosture.overallScore}/100</p>
                          <p>Trend: {securityPosture.trend}</p>
                        </div>
                      )}
                      {anomalyDetection && anomalyDetection.anomaly.isAnomaly && (
                        <div style={{ padding: 16, border: "1px solid #ef4444", borderRadius: 8, backgroundColor: "#fee2e2" }}>
                          <h4>⚠️ Anomali Tespit Edildi</h4>
                          <p>Tip: {anomalyDetection.anomaly.anomalyType}</p>
                          <p>Severity: {anomalyDetection.anomaly.severity}</p>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                      <button className="button" onClick={handleCostBenefitAnalysis}>
                        Cost-Benefit Analizi
                      </button>
                      <button className="button" onClick={handleWorkloadOptimization}>
                        Workload Optimization
                      </button>
                      <button className="button" onClick={loadMaintenanceSchedule}>
                        Maintenance Schedule
                      </button>
                      <button className="button" onClick={loadRiskCorrelation}>
                        Risk Correlation
                      </button>
                    </div>
                  </div>
                )}
                {!selectedImage && <p>Lütfen bir image seçin ve analiz yapın.</p>}
              </div>
            )}

            {activeTab === "prediction" && riskPrediction && (
              <div>
                <h3>Risk Tahmini</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Mevcut Risk:</strong> {riskPrediction.currentRisk.score} ({riskPrediction.currentRisk.level})</p>
                  <p><strong>Tahmin Edilen Risk:</strong> {riskPrediction.prediction.predictedRiskScore} ({riskPrediction.prediction.predictedRiskLevel})</p>
                  <p><strong>Güven Skoru:</strong> {(riskPrediction.prediction.confidence * 100).toFixed(1)}%</p>
                  <p><strong>Trend:</strong> {riskPrediction.prediction.trend}</p>
                  <div style={{ marginTop: 16 }}>
                    <h4>Faktörler:</h4>
                    <ul>
                      {riskPrediction.prediction.factors.map((factor, idx) => (
                        <li key={idx}>
                          {factor.name}: {factor.impact.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "anomaly" && anomalyDetection && (
              <div>
                <h3>Anomali Tespiti</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Anomali:</strong> {anomalyDetection.anomaly.isAnomaly ? "✅ Tespit Edildi" : "❌ Yok"}</p>
                  {anomalyDetection.anomaly.isAnomaly && (
                    <>
                      <p><strong>Anomali Skoru:</strong> {anomalyDetection.anomaly.anomalyScore.toFixed(2)}</p>
                      <p><strong>Tip:</strong> {anomalyDetection.anomaly.anomalyType}</p>
                      <p><strong>Severity:</strong> {anomalyDetection.anomaly.severity}</p>
                      <p><strong>Açıklama:</strong> {anomalyDetection.anomaly.explanation}</p>
                      <p><strong>Güven:</strong> {(anomalyDetection.anomaly.confidence * 100).toFixed(1)}%</p>
                      <div style={{ marginTop: 16 }}>
                        <h4>Önerilen Aksiyonlar:</h4>
                        <ul>
                          {anomalyDetection.anomaly.suggestedActions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "recommendations" && intelligentRecommendations && (
              <div>
                <h3>Akıllı Öneriler</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Toplam:</strong> {intelligentRecommendations.summary.total}</p>
                  <p><strong>Kritik:</strong> {intelligentRecommendations.summary.critical}</p>
                  <p><strong>Yüksek:</strong> {intelligentRecommendations.summary.high}</p>
                  <p><strong>Ortalama AI Skoru:</strong> {intelligentRecommendations.summary.avgAIScore.toFixed(2)}</p>
                  <div style={{ marginTop: 16 }}>
                    {intelligentRecommendations.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: 16,
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <h4>{rec.title}</h4>
                            <p>{rec.description}</p>
                            <p><strong>AI Skoru:</strong> {rec.aiScore.toFixed(2)}</p>
                            <p><strong>Öncelik:</strong> {rec.priority}</p>
                            <p><strong>Urgency:</strong> {rec.urgency}</p>
                            <p><strong>Reasoning:</strong> {rec.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "health" && healthScore && (
              <div>
                <h3>Health Score</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Genel Skor:</strong> {healthScore.overallScore}/100</p>
                  <p><strong>Trend:</strong> {healthScore.trend}</p>
                  <div style={{ marginTop: 16 }}>
                    <h4>Kategori Skorları:</h4>
                    <ul>
                      <li>Security: {healthScore.categoryScores.security}</li>
                      <li>Freshness: {healthScore.categoryScores.freshness}</li>
                      <li>Compliance: {healthScore.categoryScores.compliance}</li>
                      <li>Stability: {healthScore.categoryScores.stability}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "forecast" && riskForecast && (
              <div>
                <h3>Risk Forecast</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Mevcut Risk:</strong> {riskForecast.currentRisk.score} ({riskForecast.currentRisk.level})</p>
                  <p><strong>Trajectory:</strong> {riskForecast.riskTrajectory}</p>
                  {riskForecast.criticalDate && (
                    <p><strong>Kritik Tarih:</strong> {new Date(riskForecast.criticalDate).toLocaleDateString()}</p>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <h4>Forecast'ler:</h4>
                    {riskForecast.forecasts.map((forecast, idx) => (
                      <div key={idx} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 4, marginBottom: 8 }}>
                        <p><strong>{new Date(forecast.date).toLocaleDateString()}:</strong> {forecast.predictedRiskScore} ({forecast.predictedRiskLevel})</p>
                        <p>Güven: {(forecast.confidence * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "posture" && securityPosture && (
              <div>
                <h3>Security Posture</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Genel Skor:</strong> {securityPosture.overallScore}/100</p>
                  <p><strong>Trend:</strong> {securityPosture.trend}</p>
                  <div style={{ marginTop: 16 }}>
                    <h4>Kategori Skorları:</h4>
                    <ul>
                      <li>Vulnerability Management: {securityPosture.categoryScores.vulnerabilityManagement}</li>
                      <li>Access Control: {securityPosture.categoryScores.accessControl}</li>
                      <li>Image Security: {securityPosture.categoryScores.imageSecurity}</li>
                      <li>Runtime Security: {securityPosture.categoryScores.runtimeSecurity}</li>
                      <li>Compliance: {securityPosture.categoryScores.compliance}</li>
                    </ul>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <h4>Strengths:</h4>
                    <ul>
                      {securityPosture.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <h4>Weaknesses:</h4>
                    <ul>
                      {securityPosture.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cost-benefit" && costBenefit && (
              <div>
                <h3>Cost-Benefit Analizi</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>ROI:</strong> {costBenefit.roi.toFixed(1)}%</p>
                  <p><strong>Payback Period:</strong> {costBenefit.paybackPeriod} gün</p>
                  <p><strong>Recommendation:</strong> {costBenefit.recommendation}</p>
                  <p><strong>Total Cost:</strong> ${costBenefit.remediationCost.totalCost.toLocaleString()}</p>
                  <p><strong>Total Benefit:</strong> ${costBenefit.benefit.totalBenefit.toLocaleString()}</p>
                  <p><strong>Reasoning:</strong> {costBenefit.reasoning}</p>
                </div>
              </div>
            )}

            {activeTab === "optimization" && workloadOptimization && (
              <div>
                <h3>Workload Optimization</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Mevcut Pod Sayısı:</strong> {workloadOptimization.currentState.podCount}</p>
                  <p><strong>Önerilen Pod Sayısı:</strong> {workloadOptimization.optimization.recommendedPodCount}</p>
                  <p><strong>CPU Azalma:</strong> {workloadOptimization.optimization.resourceOptimization.cpuReduction.toFixed(1)}%</p>
                  <p><strong>Memory Azalma:</strong> {workloadOptimization.optimization.resourceOptimization.memoryReduction.toFixed(1)}%</p>
                  <p><strong>Aylık Tasarruf:</strong> ${workloadOptimization.estimatedSavings.monthly.toLocaleString()}</p>
                  <p><strong>Yıllık Tasarruf:</strong> ${workloadOptimization.estimatedSavings.annual.toLocaleString()}</p>
                </div>
              </div>
            )}

            {activeTab === "zero-day" && zeroDayDetection && (
              <div>
                <h3>Zero-Day Detection</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Zero-Day Risk:</strong> {zeroDayDetection.hasZeroDayRisk ? "✅ Var" : "❌ Yok"}</p>
                  <p><strong>Risk Skoru:</strong> {zeroDayDetection.riskScore}</p>
                  <div style={{ marginTop: 16 }}>
                    <h4>Indicators:</h4>
                    {zeroDayDetection.indicators.map((indicator, idx) => (
                      <div key={idx} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 4, marginBottom: 8 }}>
                        <p><strong>{indicator.type}</strong> ({indicator.severity})</p>
                        <p>{indicator.description}</p>
                        <p>Güven: {(indicator.confidence * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "threats" && threatMatches.length > 0 && (
              <div>
                <h3>Threat Intelligence</h3>
                <div style={{ marginTop: 16 }}>
                  <p><strong>Toplam Eşleşme:</strong> {threatMatches.length}</p>
                  {threatMatches.map((match, idx) => (
                    <div key={idx} style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8 }}>
                      <p><strong>{match.threat.threatType}</strong> ({match.threat.severity})</p>
                      <p>{match.threat.description}</p>
                      <p><strong>Match Score:</strong> {match.matchScore}</p>
                      <p><strong>Risk Level:</strong> {match.riskLevel}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "maintenance" && (
              <div>
                <h3>Predictive Maintenance</h3>
                <button className="button" onClick={loadMaintenanceSchedule} style={{ marginBottom: 16 }}>
                  Schedule Yükle
                </button>
                {maintenanceSchedule.length > 0 && (
                  <div>
                    {maintenanceSchedule.map((schedule, idx) => (
                      <div key={idx} style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8 }}>
                        <p><strong>{schedule.imageName}</strong></p>
                        <p>Önerilen Güncelleme: {new Date(schedule.recommendedUpdateDate).toLocaleDateString()}</p>
                        <p>Kritik Seviyeye Kalan Gün: {schedule.daysUntilCritical}</p>
                        <p>Öncelik: {schedule.priority}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "correlation" && (
              <div>
                <h3>Risk Correlation</h3>
                <button className="button" onClick={loadRiskCorrelation} style={{ marginBottom: 16 }}>
                  Correlation Yükle
                </button>
                {riskCorrelation && (
                  <div>
                    <h4>Top Correlations:</h4>
                    {riskCorrelation.topCorrelations.map((corr, idx) => (
                      <div key={idx} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 4, marginBottom: 8 }}>
                        <p><strong>{corr.factor1}</strong> ↔ <strong>{corr.factor2}</strong></p>
                        <p>Correlation: {corr.correlation.toFixed(2)}</p>
                        <p>{corr.insight}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

