/**
 * Comprehensive Demo Data Generator
 * 
 * Tüm demo verilerini oluşturur: images, anomalies, scheduled reports, webhooks, 
 * custom rules, risk budgets, allowlist, API tokens, audit logs, runbooks, etc.
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/autopatch";
const DB_NAME = process.env.MONGODB_DB || "autopatch";

// Demo image listesi
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

const CLUSTER_IDS = [
  "cluster-prod-01",
  "cluster-staging-01",
  "cluster-dev-01",
  "cluster-qa-01",
];

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

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRiskScore(riskLevel: string): number {
  switch (riskLevel) {
    case "CRITICAL": return Math.floor(Math.random() * 25) + 75;
    case "HIGH": return Math.floor(Math.random() * 25) + 50;
    case "MEDIUM": return Math.floor(Math.random() * 25) + 25;
    case "LOW": return Math.floor(Math.random() * 25);
    default: return 50;
  }
}

function generateRiskLevel(): string {
  const rand = Math.random();
  if (rand < 0.15) return "CRITICAL";
  if (rand < 0.35) return "HIGH";
  if (rand < 0.65) return "MEDIUM";
  return "LOW";
}

async function generateComprehensiveDemoData() {
  console.log("🚀 Kapsamlı demo verisi oluşturuluyor...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ MongoDB'ye bağlandı\n");

    const db = client.db(DB_NAME);

    // 1. Image Risks (zaten var, kontrol et)
    console.log("📦 1. Image Risk Verileri...");
    const imageRisksCollection = db.collection("imagerisks");
    const existingImages = await imageRisksCollection.countDocuments();
    if (existingImages === 0) {
      console.log("   ⚠️  Image risk verisi yok. Önce 'npm run generate-demo-data' çalıştırın.");
    } else {
      console.log(`   ✅ ${existingImages} image risk verisi mevcut`);
    }

    // 2. Anomalies
    console.log("\n🔍 2. Anomaly Verileri...");
    const anomaliesCollection = db.collection("anomalies");
    const anomalyTypes = [
      "RISK_SCORE_SPIKE",
      "RISK_SCORE_DROP",
      "NEW_RISK_FACTOR",
      "POD_COUNT_INCREASE",
      "CRITICAL_VULNERABILITY",
      "UNUSUAL_NAMESPACE",
    ];
    const anomalies = [];
    const imageNames = DEMO_IMAGES.slice(0, 15);
    
    for (let i = 0; i < 20; i++) {
      const imageName = getRandomElement(imageNames);
      const anomalyType = getRandomElement(anomalyTypes);
      const severity = generateRiskLevel();
      const daysAgo = Math.floor(Math.random() * 7);
      const detectedAt = new Date();
      detectedAt.setDate(detectedAt.getDate() - daysAgo);
      
      anomalies.push({
        imageName,
        clusterId: getRandomElement(CLUSTER_IDS),
        anomalyType,
        severity,
        description: `Anomaly detected: ${anomalyType} for ${imageName}`,
        previousValue: Math.floor(Math.random() * 50),
        currentValue: Math.floor(Math.random() * 100),
        changePercentage: Math.floor(Math.random() * 100),
        affectedPods: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, idx) => ({
          namespace: getRandomElement(NAMESPACES),
          name: `pod-${idx + 1}`,
        })),
        riskFactors: ["Uses latest tag", "Uses root user"],
        detectedAt: detectedAt.toISOString(),
        resolvedAt: Math.random() > 0.7 ? new Date().toISOString() : undefined,
        metadata: {},
        createdAt: detectedAt.toISOString(),
        updatedAt: detectedAt.toISOString(),
      });
    }
    
    await anomaliesCollection.insertMany(anomalies);
    console.log(`   ✅ ${anomalies.length} anomaly eklendi`);

    // 3. Scheduled Reports
    console.log("\n📅 3. Scheduled Reports...");
    const scheduledReportsCollection = db.collection("scheduledreports");
    const reportTypes = ["RISK_SUMMARY", "COMPLIANCE", "EXECUTIVE", "DETAILED"];
    const frequencies = ["DAILY", "WEEKLY", "MONTHLY"];
    const scheduledReports = [];
    
    for (let i = 0; i < 5; i++) {
      const reportType = getRandomElement(reportTypes);
      const frequency = getRandomElement(frequencies);
      const nextRun = new Date();
      nextRun.setHours(9, 0, 0, 0);
      if (frequency === "WEEKLY") nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
      if (frequency === "MONTHLY") nextRun.setDate(1);
      
      scheduledReports.push({
        name: `${reportType} - ${frequency} Report`,
        description: `Automated ${frequency.toLowerCase()} ${reportType.toLowerCase()} report`,
        reportType,
        complianceStandard: reportType === "COMPLIANCE" ? getRandomElement(["PCI-DSS", "SOC2", "ISO27001"]) : undefined,
        filters: {
          clusterId: getRandomElement(CLUSTER_IDS),
        },
        frequency,
        dayOfWeek: frequency === "WEEKLY" ? 1 : undefined,
        dayOfMonth: frequency === "MONTHLY" ? 1 : undefined,
        time: "09:00",
        timezone: "Europe/Istanbul",
        recipients: [`admin${i + 1}@example.com`, `team${i + 1}@example.com`],
        enabled: Math.random() > 0.2,
        lastRunAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        nextRunAt: nextRun.toISOString(),
        lastRunStatus: Math.random() > 0.3 ? "success" : undefined,
        totalRuns: Math.floor(Math.random() * 50) + 10,
        successfulRuns: Math.floor(Math.random() * 45) + 8,
        failedRuns: Math.floor(Math.random() * 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    await scheduledReportsCollection.insertMany(scheduledReports);
    console.log(`   ✅ ${scheduledReports.length} scheduled report eklendi`);

    // 4. Webhooks
    console.log("\n🔗 4. Webhooks...");
    const webhooksCollection = db.collection("webhooksubscriptions");
    const webhookEvents = [
      "scan.complete",
      "risk.new",
      "anomaly.detected",
      "budget.exceeded",
      "cve.detected",
      "*",
    ];
    const webhooks = [];
    
    for (let i = 0; i < 4; i++) {
      webhooks.push({
        name: `Webhook ${i + 1}`,
        description: `Integration webhook ${i + 1}`,
        url: `https://webhook.example.com/hook${i + 1}`,
        events: getRandomElements(webhookEvents, Math.floor(Math.random() * 3) + 1),
        secret: `secret-key-${i + 1}`,
        headers: { "X-Custom-Header": "value" },
        enabled: Math.random() > 0.2,
        active: Math.random() > 0.3,
        totalDeliveries: Math.floor(Math.random() * 200) + 50,
        successfulDeliveries: Math.floor(Math.random() * 180) + 45,
        failedDeliveries: Math.floor(Math.random() * 20),
        lastDeliveryAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        lastDeliveryStatus: Math.random() > 0.3 ? "success" : "failed",
        retryEnabled: true,
        maxRetries: 3,
        retryIntervalMs: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    await webhooksCollection.insertMany(webhooks);
    console.log(`   ✅ ${webhooks.length} webhook eklendi`);

    // 5. Custom Rules
    console.log("\n📐 5. Custom Rules...");
    const customRulesCollection = db.collection("customriskrules");
    const customRules = [
      {
        name: "Production Latest Tag Rule",
        description: "Flags images using 'latest' tag in production",
        enabled: true,
        condition: {
          type: "tag",
          operator: "equals",
          value: "latest",
        },
        riskScore: 15,
        riskFactor: "Uses latest tag in production",
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Root User Detection",
        description: "Detects images running as root user",
        enabled: true,
        condition: {
          type: "custom",
          operator: "contains",
          value: "root",
        },
        riskScore: 20,
        riskFactor: "Uses root user",
        priority: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Legacy Image Tag",
        description: "Flags images older than 180 days",
        enabled: true,
        condition: {
          type: "age",
          operator: "greaterThan",
          value: 180,
        },
        riskScore: 10,
        riskFactor: "Image older than 180 days",
        priority: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await customRulesCollection.insertMany(customRules);
    console.log(`   ✅ ${customRules.length} custom rule eklendi`);

    // 6. Risk Budgets
    console.log("\n💰 6. Risk Budgets...");
    const riskBudgetsCollection = db.collection("riskbudgets");
    const riskBudgets = [
      {
        name: "Production Cluster Budget",
        description: "Risk budget for production cluster",
        enabled: true,
        clusterId: CLUSTER_IDS[0],
        maxCritical: 5,
        maxHigh: 10,
        maxMedium: 20,
        maxTotalRiskScore: 500,
        alertOnExceed: true,
        alertChannels: ["email", "slack"],
        currentCritical: 6,
        currentHigh: 8,
        currentMedium: 15,
        currentTotalRiskScore: 450,
        lastCheckedAt: new Date().toISOString(),
        exceededAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Staging Cluster Budget",
        description: "Risk budget for staging cluster",
        enabled: true,
        clusterId: CLUSTER_IDS[1],
        maxCritical: 10,
        maxHigh: 20,
        maxMedium: 30,
        maxTotalRiskScore: 1000,
        alertOnExceed: true,
        alertChannels: ["email"],
        currentCritical: 3,
        currentHigh: 12,
        currentMedium: 18,
        currentTotalRiskScore: 650,
        lastCheckedAt: new Date().toISOString(),
        exceededAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await riskBudgetsCollection.insertMany(riskBudgets);
    console.log(`   ✅ ${riskBudgets.length} risk budget eklendi`);

    // 7. Allowlist
    console.log("\n✅ 7. Allowlist Entries...");
    const allowlistCollection = db.collection("riskallowlists");
    const allowlistEntries = [
      {
        imageName: "nginx:1.21.0",
        ignoredRiskFactors: ["Uses latest tag"],
        note: "Approved stable version",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        imageName: "postgres:13",
        ignoredRiskFactors: ["Image older than 180 days"],
        note: "LTS version, approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await allowlistCollection.insertMany(allowlistEntries);
    console.log(`   ✅ ${allowlistEntries.length} allowlist entry eklendi`);

    // 8. API Tokens
    console.log("\n🔑 8. API Tokens...");
    const apiTokensCollection = db.collection("apitokens");
    const apiTokens = [
      {
        name: "Admin Token",
        token: "apk_" + Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join(""),
        role: "admin",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: null,
      },
      {
        name: "Readonly Token",
        token: "apk_" + Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join(""),
        role: "readonly",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    
    await apiTokensCollection.insertMany(apiTokens);
    console.log(`   ✅ ${apiTokens.length} API token eklendi`);

    // 9. Audit Logs
    console.log("\n📝 9. Audit Logs...");
    const auditLogsCollection = db.collection("auditlogs");
    const actions = ["CREATE", "UPDATE", "DELETE", "SCAN", "EXPORT"];
    const resourceTypes = ["Image", "Rule", "Budget", "Webhook", "Token"];
    const auditLogs = [];
    
    for (let i = 0; i < 30; i++) {
      const action = getRandomElement(actions);
      const resourceType = getRandomElement(resourceTypes);
      const hoursAgo = Math.floor(Math.random() * 168); // Son 7 gün
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      
      auditLogs.push({
        action,
        resourceType,
        resourceId: `resource-${i + 1}`,
        user: getRandomElement(["admin", "user1", "user2", "system"]),
        timestamp: timestamp.toISOString(),
        details: {
          description: `${action} ${resourceType} resource-${i + 1}`,
        },
        success: Math.random() > 0.1,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: "Mozilla/5.0",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      });
    }
    
    await auditLogsCollection.insertMany(auditLogs);
    console.log(`   ✅ ${auditLogs.length} audit log eklendi`);

    // 10. Runbooks
    console.log("\n📖 10. Runbook Mappings...");
    const runbooksCollection = db.collection("runbookmappings");
    const riskFactors = [
      "Uses latest tag",
      "Uses root user",
      "Image older than 180 days",
      "Uses unknown base image",
      "Uses non-production tag",
      "Test image used in workload",
      "Legacy image tag",
      "No security scanning",
    ];
    const runbookUrls = [
      "https://wiki.example.com/runbook/latest-tag",
      "https://wiki.example.com/runbook/root-user",
      "https://wiki.example.com/runbook/legacy-images",
      "https://wiki.example.com/runbook/security-scanning",
      "https://wiki.example.com/runbook/production-tags",
    ];
    const runbooks = riskFactors.map((factor, idx) => ({
      riskFactor: factor,
      url: runbookUrls[idx % runbookUrls.length],
      description: `Runbook for ${factor}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    await runbooksCollection.insertMany(runbooks);
    console.log(`   ✅ ${runbooks.length} runbook mapping eklendi`);

    // 11. Report History
    console.log("\n📚 11. Report History...");
    const reportHistoryCollection = db.collection("reporthistories");
    const reportTypes2 = ["RISK_SUMMARY", "COMPLIANCE", "EXECUTIVE", "DETAILED"];
    const formats = ["PDF", "HTML", "MARKDOWN", "XLSX"];
    const reportHistory = [];
    
    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      reportHistory.push({
        reportType: getRandomElement(reportTypes2),
        templateId: `template-${Math.floor(Math.random() * 3) + 1}`,
        templateName: `Template ${Math.floor(Math.random() * 3) + 1}`,
        filters: {
          clusterId: getRandomElement(CLUSTER_IDS),
        },
        fileName: `report-${i + 1}.${getRandomElement(formats).toLowerCase()}`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        format: getRandomElement(formats),
        stats: {
          totalImages: Math.floor(Math.random() * 50) + 20,
          highOrCritical: Math.floor(Math.random() * 15) + 5,
          prodImpactedPods: Math.floor(Math.random() * 100) + 20,
          avgRiskScore: Math.floor(Math.random() * 50) + 30,
        },
        createdBy: getRandomElement(["admin", "user1", "system"]),
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
    }
    
    await reportHistoryCollection.insertMany(reportHistory);
    console.log(`   ✅ ${reportHistory.length} report history eklendi`);

    // 12. Compliance Assessments
    console.log("\n🛡️  12. Compliance Assessments...");
    const complianceCollection = db.collection("complianceassessments");
    const standards = ["PCI-DSS", "SOC2", "ISO27001"];
    const complianceAssessments = [];
    
    for (const standard of standards) {
      const daysAgo = Math.floor(Math.random() * 60);
      const assessedAt = new Date();
      assessedAt.setDate(assessedAt.getDate() - daysAgo);
      
      complianceAssessments.push({
        standard,
        clusterId: getRandomElement(CLUSTER_IDS),
        assessedAt: assessedAt.toISOString(),
        assessedBy: "system",
        version: standard === "PCI-DSS" ? "PCI-DSS v3.2.1" : standard === "SOC2" ? "SOC 2 Type II" : "ISO/IEC 27001:2022",
        requirements: [
          {
            id: `${standard}-1`,
            title: "Security Requirement 1",
            description: "First security requirement",
            standard,
            category: "Security",
            severity: "HIGH",
            status: Math.random() > 0.3 ? "PASS" : "FAIL",
            evidence: [],
            lastCheckedAt: assessedAt.toISOString(),
          },
          {
            id: `${standard}-2`,
            title: "Security Requirement 2",
            description: "Second security requirement",
            standard,
            category: "Security",
            severity: "MEDIUM",
            status: Math.random() > 0.5 ? "PASS" : "WARNING",
            evidence: [],
            lastCheckedAt: assessedAt.toISOString(),
          },
        ],
        totalRequirements: 2,
        passedRequirements: Math.floor(Math.random() * 2) + 1,
        failedRequirements: Math.floor(Math.random() * 1),
        warningRequirements: Math.floor(Math.random() * 1),
        notApplicableRequirements: 0,
        complianceScore: Math.floor(Math.random() * 30) + 70,
        overallStatus: Math.random() > 0.5 ? "PASS" : "WARNING",
        nextAssessmentDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: assessedAt.toISOString(),
        updatedAt: assessedAt.toISOString(),
      });
    }
    
    await complianceCollection.insertMany(complianceAssessments);
    console.log(`   ✅ ${complianceAssessments.length} compliance assessment eklendi`);

    // 13. Auto Action Policies
    console.log("\n⚡ 13. Auto Action Policies...");
    const autoActionsCollection = db.collection("autoactionpolicies");
    const autoActions = [
      {
        name: "Auto-block Critical Images",
        description: "Automatically block images with CRITICAL risk",
        enabled: true,
        riskLevel: "CRITICAL",
        minRiskScore: 75,
        actionType: "BLOCK",
        namespaces: ["prod", "production"],
        clusterId: CLUSTER_IDS[0],
        lastExecutedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        executionCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Auto-alert High Risk",
        description: "Send alert for HIGH risk images",
        enabled: true,
        riskLevel: "HIGH",
        minRiskScore: 50,
        actionType: "ALERT",
        namespaces: [],
        clusterId: undefined,
        lastExecutedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        executionCount: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await autoActionsCollection.insertMany(autoActions);
    console.log(`   ✅ ${autoActions.length} auto action policy eklendi`);

    // 14. Alert Rules
    console.log("\n🚨 14. Alert Rules...");
    const alertRulesCollection = db.collection("alertrules");
    const alertRules = [
      {
        name: "Critical Risk Alert",
        condition: "riskLevel === 'CRITICAL'",
        severity: "critical",
        enabled: true,
        channels: ["email", "slack"],
        lastTriggeredAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        triggerCount: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Production High Risk",
        condition: "riskLevel === 'HIGH' && namespace.includes('prod')",
        severity: "high",
        enabled: true,
        channels: ["email"],
        lastTriggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        triggerCount: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await alertRulesCollection.insertMany(alertRules);
    console.log(`   ✅ ${alertRules.length} alert rule eklendi`);

    // 15. Widgets
    console.log("\n🎨 15. Widgets...");
    const widgetsCollection = db.collection("widgets");
    const widgetTypes = ["RISK_CHART", "IMAGE_LIST", "STATS", "TRENDS"];
    const widgets = [];
    
    for (let i = 0; i < 6; i++) {
      widgets.push({
        name: `Widget ${i + 1}`,
        type: getRandomElement(widgetTypes),
        position: { x: (i % 3) * 350, y: Math.floor(i / 3) * 250 },
        size: { width: 300, height: 200 },
        enabled: Math.random() > 0.2,
        config: {
          refreshInterval: 30000,
          clusterId: getRandomElement(CLUSTER_IDS),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    await widgetsCollection.insertMany(widgets);
    console.log(`   ✅ ${widgets.length} widget eklendi`);

    // 16. Report Templates
    console.log("\n📋 16. Report Templates...");
    const reportTemplatesCollection = db.collection("reporttemplates");
    const reportTemplates = [
      {
        name: "Default Risk Summary",
        description: "Default risk summary template",
        category: "Risk",
        isDefault: true,
        config: {
          includeCharts: true,
          includeImages: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        name: "Executive Summary Template",
        description: "High-level executive summary",
        category: "Executive",
        isDefault: false,
        config: {
          includeCharts: true,
          includeImages: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    await reportTemplatesCollection.insertMany(reportTemplates);
    console.log(`   ✅ ${reportTemplates.length} report template eklendi`);

    console.log("\n🎉 Tüm demo verileri başarıyla oluşturuldu!");
    console.log("\n📊 Özet:");
    console.log(`   - Anomalies: ${anomalies.length}`);
    console.log(`   - Scheduled Reports: ${scheduledReports.length}`);
    console.log(`   - Webhooks: ${webhooks.length}`);
    console.log(`   - Custom Rules: ${customRules.length}`);
    console.log(`   - Risk Budgets: ${riskBudgets.length}`);
    console.log(`   - Allowlist Entries: ${allowlistEntries.length}`);
    console.log(`   - API Tokens: ${apiTokens.length}`);
    console.log(`   - Audit Logs: ${auditLogs.length}`);
    console.log(`   - Runbooks: ${runbooks.length}`);
    console.log(`   - Report History: ${reportHistory.length}`);
    console.log(`   - Compliance Assessments: ${complianceAssessments.length}`);
    console.log(`   - Auto Actions: ${autoActions.length}`);
    console.log(`   - Alert Rules: ${alertRules.length}`);
    console.log(`   - Widgets: ${widgets.length}`);
    console.log(`   - Report Templates: ${reportTemplates.length}`);

  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔌 MongoDB bağlantısı kapatıldı");
  }
}

// Script çalıştır
if (require.main === module) {
  generateComprehensiveDemoData().catch(console.error);
}

export { generateComprehensiveDemoData };
