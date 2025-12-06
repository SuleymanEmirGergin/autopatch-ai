/**
 * Computer Vision Service
 * Container image'lerin görsel analizini yapar
 */

import { ImageRiskResult } from "../risk/riskEngine";
import { logger } from "../utils/logger";

export interface ImageLayerAnalysis {
  layerId: string;
  layerIndex: number;
  layerSize: number; // bytes
  commands: string[];
  vulnerabilities: Array<{
    type: "exposed_port" | "root_user" | "sensitive_file" | "weak_permission" | "other";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    confidence: number; // 0-1
  }>;
  suspiciousPatterns: Array<{
    pattern: string;
    description: string;
    riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export interface CVImageAnalysis {
  imageName: string;
  totalLayers: number;
  totalSize: number;
  layers: ImageLayerAnalysis[];
  visualRiskScore: number; // 0-100
  visualRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectedIssues: Array<{
    type: string;
    severity: string;
    layer: number;
    description: string;
  }>;
  recommendations: string[];
}

export class ComputerVisionService {
  /**
   * Container image'in layer'larını analiz eder (Computer Vision)
   */
  async analyzeImageLayers(imageName: string, imageManifest?: any): Promise<CVImageAnalysis> {
    logger.info(`Computer Vision analizi başlatılıyor: ${imageName}`);

    // Simüle edilmiş layer analizi (gerçek implementasyonda Docker API veya image inspection kullanılır)
    const layers = this.simulateLayerAnalysis(imageName, imageManifest);

    // Visual pattern recognition
    const visualIssues = this.detectVisualPatterns(layers);

    // Risk skoru hesaplama
    const visualRiskScore = this.calculateVisualRiskScore(layers, visualIssues);
    const visualRiskLevel = this.getRiskLevel(visualRiskScore);

    // Öneriler
    const recommendations = this.generateRecommendations(layers, visualIssues);

    return {
      imageName,
      totalLayers: layers.length,
      totalSize: layers.reduce((sum, layer) => sum + layer.layerSize, 0),
      layers,
      visualRiskScore,
      visualRiskLevel,
      detectedIssues: visualIssues,
      recommendations,
    };
  }

  /**
   * Layer analizini simüle eder (gerçek implementasyonda Docker API kullanılır)
   */
  private simulateLayerAnalysis(imageName: string, imageManifest?: any): ImageLayerAnalysis[] {
    const layers: ImageLayerAnalysis[] = [];

    // Basit simülasyon: Image name'den layer sayısını tahmin et
    const estimatedLayers = Math.max(3, Math.min(20, imageName.length % 15 + 5));

    for (let i = 0; i < estimatedLayers; i++) {
      const layer: ImageLayerAnalysis = {
        layerId: `layer-${i}`,
        layerIndex: i,
        layerSize: Math.floor(Math.random() * 50 * 1024 * 1024), // 0-50MB
        commands: this.generateLayerCommands(i),
        vulnerabilities: [],
        suspiciousPatterns: [],
      };

      // Vulnerability detection (simüle)
      if (i === 0) {
        // Base layer'da genelde root user var
        layer.vulnerabilities.push({
          type: "root_user",
          severity: "HIGH",
          description: "Base layer runs as root user",
          confidence: 0.85,
        });
      }

      if (i === 1) {
        // İkinci layer'da exposed port olabilir
        layer.vulnerabilities.push({
          type: "exposed_port",
          severity: "MEDIUM",
          description: "Port 8080 exposed without authentication",
          confidence: 0.70,
        });
      }

      // Suspicious patterns
      if (i % 3 === 0) {
        layer.suspiciousPatterns.push({
          pattern: "curl | bash",
          description: "Potential malicious script execution pattern",
          riskLevel: "HIGH",
        });
      }

      layers.push(layer);
    }

    return layers;
  }

  /**
   * Layer komutlarını simüle eder
   */
  private generateLayerCommands(layerIndex: number): string[] {
    const commands: string[] = [];

    if (layerIndex === 0) {
      commands.push("FROM ubuntu:20.04");
      commands.push("RUN apt-get update");
    } else if (layerIndex === 1) {
      commands.push("COPY . /app");
      commands.push("RUN chmod +x /app/start.sh");
    } else {
      commands.push(`RUN echo "Layer ${layerIndex}"`);
    }

    return commands;
  }

  /**
   * Visual pattern recognition
   */
  private detectVisualPatterns(layers: ImageLayerAnalysis[]): Array<{
    type: string;
    severity: string;
    layer: number;
    description: string;
  }> {
    const issues: Array<{
      type: string;
      severity: string;
      layer: number;
      description: string;
    }> = [];

    for (const layer of layers) {
      // Root user detection
      if (layer.vulnerabilities.some(v => v.type === "root_user")) {
        issues.push({
          type: "root_user",
          severity: "HIGH",
          layer: layer.layerIndex,
          description: "Layer runs as root user",
        });
      }

      // Exposed ports
      if (layer.vulnerabilities.some(v => v.type === "exposed_port")) {
        issues.push({
          type: "exposed_port",
          severity: "MEDIUM",
          layer: layer.layerIndex,
          description: "Port exposed without proper security",
        });
      }

      // Suspicious patterns
      for (const pattern of layer.suspiciousPatterns) {
        issues.push({
          type: "suspicious_pattern",
          severity: pattern.riskLevel,
          layer: layer.layerIndex,
          description: pattern.description,
        });
      }

      // Large layer size (potential bloat)
      if (layer.layerSize > 100 * 1024 * 1024) { // > 100MB
        issues.push({
          type: "large_layer",
          severity: "MEDIUM",
          layer: layer.layerIndex,
          description: `Large layer size: ${(layer.layerSize / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }

    return issues;
  }

  /**
   * Visual risk skoru hesaplar
   */
  private calculateVisualRiskScore(
    layers: ImageLayerAnalysis[],
    issues: Array<{ type: string; severity: string; layer: number; description: string }>
  ): number {
    let score = 0;

    // Vulnerability-based scoring
    for (const layer of layers) {
      for (const vuln of layer.vulnerabilities) {
        switch (vuln.severity) {
          case "CRITICAL":
            score += 20 * vuln.confidence;
            break;
          case "HIGH":
            score += 15 * vuln.confidence;
            break;
          case "MEDIUM":
            score += 10 * vuln.confidence;
            break;
          case "LOW":
            score += 5 * vuln.confidence;
            break;
        }
      }
    }

    // Issue-based scoring
    for (const issue of issues) {
      switch (issue.severity) {
        case "CRITICAL":
          score += 10;
          break;
        case "HIGH":
          score += 7;
          break;
        case "MEDIUM":
          score += 4;
          break;
        case "LOW":
          score += 2;
          break;
      }
    }

    // Layer count penalty (çok fazla layer = complexity)
    if (layers.length > 15) {
      score += 5;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Risk seviyesi belirler
   */
  private getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
  }

  /**
   * Öneriler oluşturur
   */
  private generateRecommendations(
    layers: ImageLayerAnalysis[],
    issues: Array<{ type: string; severity: string; layer: number; description: string }>
  ): string[] {
    const recommendations: string[] = [];

    // Root user önerisi
    if (issues.some(i => i.type === "root_user")) {
      recommendations.push("Use non-root user in Dockerfile (USER directive)");
    }

    // Exposed port önerisi
    if (issues.some(i => i.type === "exposed_port")) {
      recommendations.push("Implement authentication/authorization for exposed ports");
    }

    // Large layer önerisi
    if (issues.some(i => i.type === "large_layer")) {
      recommendations.push("Optimize layer size by removing unnecessary files");
    }

    // Suspicious pattern önerisi
    if (issues.some(i => i.type === "suspicious_pattern")) {
      recommendations.push("Review and validate all script executions");
    }

    // Layer count önerisi
    if (layers.length > 15) {
      recommendations.push("Reduce number of layers by combining RUN commands");
    }

    return recommendations;
  }

  /**
   * Image similarity için visual features çıkarır
   */
  async extractVisualFeatures(imageName: string): Promise<{
    features: number[];
    hash: string;
  }> {
    // Simüle edilmiş visual feature extraction
    // Gerçek implementasyonda image hash, layer structure, file tree gibi özellikler kullanılır
    const hash = this.generateImageHash(imageName);
    const features = this.generateFeatureVector(imageName);

    return {
      features,
      hash,
    };
  }

  /**
   * Image hash oluşturur
   */
  private generateImageHash(imageName: string): string {
    // Basit hash (gerçek implementasyonda SHA256 veya perceptual hash kullanılır)
    let hash = 0;
    for (let i = 0; i < imageName.length; i++) {
      const char = imageName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Feature vector oluşturur
   */
  private generateFeatureVector(imageName: string): number[] {
    // Simüle edilmiş feature vector (128 boyutlu)
    // Gerçek implementasyonda CNN features, layer structure features vb. kullanılır
    const features: number[] = [];
    for (let i = 0; i < 128; i++) {
      features.push(Math.random());
    }
    return features;
  }
}

