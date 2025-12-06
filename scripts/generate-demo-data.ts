/**
 * Demo Data Generator
 * 
 * Bu script hackathon demo'su için gerçekçi image risk verileri oluşturur.
 * 
 * Kullanım:
 *   npx ts-node scripts/generate-demo-data.ts
 * 
 * Veya:
 *   npm run generate-demo-data
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/autopatch";
const DB_NAME = process.env.MONGODB_DB || "autopatch";

// Demo image listesi (gerçekçi image isimleri)
const DEMO_IMAGES = [
  "nginx:latest",
  "nginx:1.21.0",
  "nginx:1.20.2",
  "node:16-alpine",
  "node:16",
  "node:14",
  "python:3.9-slim",
  "python:3.9",
  "python:3.8",
  "redis:6.2",
  "redis:latest",
  "postgres:13",
  "postgres:12",
  "postgres:latest",
  "mysql:8.0",
  "mysql:5.7",
  "mongo:4.4",
  "mongo:latest",
  "elasticsearch:7.14.0",
  "elasticsearch:latest",
  "kafka:2.8.0",
  "kafka:latest",
  "grafana/grafana:8.0.0",
  "grafana/grafana:latest",
  "prometheus/prometheus:latest",
  "jenkins/jenkins:lts",
  "jenkins/jenkins:latest",
  "ubuntu:20.04",
  "ubuntu:latest",
  "alpine:3.14",
  "alpine:latest",
  "busybox:latest",
  "golang:1.17",
  "golang:latest",
  "ruby:3.0",
  "ruby:latest",
  "php:8.0-fpm",
  "php:7.4-fpm",
  "php:latest",
  "java:11-jdk",
  "java:8-jdk",
  "openjdk:11",
  "openjdk:latest",
];

// Risk faktörleri
const RISK_FACTORS = [
  "Uses latest tag",
  "Uses root user",
  "Image older than 180 days",
  "Uses unknown base image",
  "Uses non-production tag",
  "Test image used in workload",
  "Legacy image tag",
  "No security scanning",
];

// Namespace'ler
const NAMESPACES = [
  "prod",
  "production",
  "prod-api",
  "prod-web",
  "staging",
  "staging-api",
  "dev",
  "development",
  "test",
  "qa",
  "monitoring",
  "logging",
];

// Cluster ID'ler
const CLUSTER_IDS = [
  "cluster-prod-01",
  "cluster-staging-01",
  "cluster-dev-01",
  "cluster-qa-01",
];

// Risk seviyelerine göre risk faktörleri dağılımı
const RISK_FACTOR_DISTRIBUTION: Record<string, string[]> = {
  CRITICAL: [
    "Uses latest tag",
    "Uses root user",
    "Image older than 180 days",
    "Uses unknown base image",
    "Uses non-production tag",
    "Test image used in workload",
  ],
  HIGH: [
    "Uses latest tag",
    "Uses root user",
    "Image older than 180 days",
    "Uses non-production tag",
  ],
  MEDIUM: [
    "Uses latest tag",
    "Image older than 180 days",
  ],
  LOW: [
    "Image older than 180 days",
  ],
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRiskScore(riskLevel: string): number {
  switch (riskLevel) {
    case "CRITICAL":
      return Math.floor(Math.random() * 25) + 75; // 75-100
    case "HIGH":
      return Math.floor(Math.random() * 25) + 50; // 50-75
    case "MEDIUM":
      return Math.floor(Math.random() * 25) + 25; // 25-50
    case "LOW":
      return Math.floor(Math.random() * 25); // 0-25
    default:
      return 50;
  }
}

function generateRiskLevel(): string {
  const rand = Math.random();
  if (rand < 0.15) return "CRITICAL"; // 15%
  if (rand < 0.35) return "HIGH"; // 20%
  if (rand < 0.65) return "MEDIUM"; // 30%
  return "LOW"; // 35%
}

function generatePods(imageName: string, riskLevel: string): Array<{ namespace: string; name: string }> {
  const podCount = riskLevel === "CRITICAL" || riskLevel === "HIGH"
    ? Math.floor(Math.random() * 10) + 5 // 5-15 pods for high risk
    : Math.floor(Math.random() * 5) + 1; // 1-5 pods for low/medium risk

  const pods: Array<{ namespace: string; name: string }> = [];
  const usedNamespaces = new Set<string>();

  // Production namespace'lerde daha fazla pod olabilir
  const prodNamespaces = NAMESPACES.filter(ns => 
    ns.toLowerCase().includes("prod") || ns.toLowerCase() === "production"
  );
  const nonProdNamespaces = NAMESPACES.filter(ns => 
    !ns.toLowerCase().includes("prod") && ns.toLowerCase() !== "production"
  );

  for (let i = 0; i < podCount; i++) {
    // High risk image'ler production'da daha fazla olabilir
    const namespacePool = (riskLevel === "CRITICAL" || riskLevel === "HIGH") && Math.random() > 0.3
      ? prodNamespaces
      : nonProdNamespaces;

    const namespace = getRandomElement(namespacePool);
    usedNamespaces.add(namespace);

    const podName = `${imageName.split(":")[0].replace(/\//g, "-")}-${i + 1}`;
    pods.push({
      namespace,
      name: podName,
    });
  }

  return pods;
}

function generateImageRisk(imageName: string): any {
  const riskLevel = generateRiskLevel();
  const riskScore = generateRiskScore(riskLevel);
  const riskFactors = RISK_FACTOR_DISTRIBUTION[riskLevel] || [];
  
  // Bazı image'lere ek risk faktörleri ekle
  const additionalFactors = getRandomElements(
    RISK_FACTORS.filter(f => !riskFactors.includes(f)),
    Math.floor(Math.random() * 2)
  );
  const allRiskFactors = [...riskFactors, ...additionalFactors];

  const pods = generatePods(imageName, riskLevel);
  const clusterId = getRandomElement(CLUSTER_IDS);
  
  // Last scanned at (son 30 gün içinde)
  const daysAgo = Math.floor(Math.random() * 30);
  const lastScannedAt = new Date();
  lastScannedAt.setDate(lastScannedAt.getDate() - daysAgo);

  return {
    imageName,
    riskScore,
    riskLevel,
    riskFactors: allRiskFactors,
    pods,
    clusterId,
    projectId: `project-${Math.floor(Math.random() * 5) + 1}`,
    lastScannedAt: lastScannedAt.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function generateDemoData() {
  console.log("🚀 Demo verisi oluşturuluyor...");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ MongoDB'ye bağlandı");

    const db = client.db(DB_NAME);
    const collection = db.collection("imagerisks");

    // Mevcut demo verilerini temizle (opsiyonel)
    const shouldClear = process.env.CLEAR_EXISTING === "true";
    if (shouldClear) {
      console.log("🗑️  Mevcut demo verileri temizleniyor...");
      await collection.deleteMany({
        imageName: { $in: DEMO_IMAGES },
      });
    }

    // Her image için risk verisi oluştur
    const imageRisks = DEMO_IMAGES.map(imageName => generateImageRisk(imageName));

    // Veritabanına ekle
    console.log(`📝 ${imageRisks.length} image risk verisi ekleniyor...`);
    const result = await collection.insertMany(imageRisks);
    console.log(`✅ ${result.insertedCount} image risk verisi eklendi`);

    // İstatistikler
    const stats = {
      CRITICAL: imageRisks.filter(img => img.riskLevel === "CRITICAL").length,
      HIGH: imageRisks.filter(img => img.riskLevel === "HIGH").length,
      MEDIUM: imageRisks.filter(img => img.riskLevel === "MEDIUM").length,
      LOW: imageRisks.filter(img => img.riskLevel === "LOW").length,
    };

    console.log("\n📊 İstatistikler:");
    console.log(`   CRITICAL: ${stats.CRITICAL}`);
    console.log(`   HIGH: ${stats.HIGH}`);
    console.log(`   MEDIUM: ${stats.MEDIUM}`);
    console.log(`   LOW: ${stats.LOW}`);
    console.log(`   Toplam: ${imageRisks.length}`);

    // Scan run oluştur (opsiyonel)
    if (process.env.CREATE_SCAN_RUN === "true") {
      console.log("\n📸 Scan run oluşturuluyor...");
      const scanRunCollection = db.collection("scanruns");
      const scanRun = {
        status: "COMPLETED",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        images: imageRisks.map(img => ({
          imageName: img.imageName,
          riskScore: img.riskScore,
          riskLevel: img.riskLevel,
        })),
        totalImages: imageRisks.length,
        clusterId: CLUSTER_IDS[0],
      };
      await scanRunCollection.insertOne(scanRun);
      console.log("✅ Scan run oluşturuldu");
    }

    console.log("\n🎉 Demo verisi başarıyla oluşturuldu!");
    console.log("\n💡 İpucu: Frontend'de görüntülemek için:");
    console.log("   1. Backend'i başlatın: npm run dev (backend dizininde)");
    console.log("   2. Frontend'i başlatın: npm run dev (frontend dizininde)");
    console.log("   3. http://localhost:3000 adresine gidin");

  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 MongoDB bağlantısı kapatıldı");
  }
}

// Script çalıştır
if (require.main === module) {
  generateDemoData().catch(console.error);
}

export { generateDemoData };

