import ExcelJS from "exceljs";
import { ImageRiskDocument } from "../persistence/imageRisk.model";
import { ComplianceAssessmentDocument } from "../persistence/compliance.model";
import { ReportTemplateDocument } from "../persistence/reportTemplate.model";

export type ExportFormat = "CSV" | "XLSX" | "JSON";

export interface ExportOptions {
  format: ExportFormat;
  filters?: {
    riskLevel?: string;
    namespace?: string;
    clusterId?: string;
    projectId?: string;
  };
  includePods?: boolean;
  includeRiskFactors?: boolean;
  includeHistory?: boolean;
  sortBy?: "riskScore" | "imageName" | "lastScannedAt";
  sortOrder?: "asc" | "desc";
  template?: ReportTemplateDocument; // Şablon desteği
}

export class ExportService {
  /**
   * CSV formatında export oluşturur
   */
  async exportToCSV(
    images: ImageRiskDocument[],
    options: ExportOptions
  ): Promise<string> {
    const filtered = this.applyFilters(images, options.filters);
    const sorted = this.applySorting(filtered, options);

    // CSV başlıkları
    const headers = [
      "Image Name",
      "Risk Score",
      "Risk Level",
      "Pod Count",
      "Prod Pod Count",
      "Non-Prod Pod Count",
      "Last Scanned At",
      "Cluster ID",
      "Project ID",
    ];

    if (options.includeRiskFactors) {
      headers.push("Risk Factors");
    }

    if (options.includePods) {
      headers.push("Pods (Namespace:Name)");
    }

    // CSV satırları
    const rows: string[][] = [headers];

    sorted.forEach((img) => {
      const { prod, nonProd } = this.countProdPods(img);
      const row: string[] = [
        this.escapeCSV(img.imageName),
        img.riskScore.toString(),
        img.riskLevel,
        img.pods.length.toString(),
        prod.toString(),
        nonProd.toString(),
        new Date(img.lastScannedAt).toISOString(),
        img.clusterId || "",
        img.projectId || "",
      ];

      if (options.includeRiskFactors) {
        row.push(this.escapeCSV(img.riskFactors.join(" | ")));
      }

      if (options.includePods) {
        const podsStr = img.pods
          .map((p) => `${p.namespace}:${p.name}`)
          .join(" | ");
        row.push(this.escapeCSV(podsStr));
      }

      rows.push(row);
    });

    // CSV string'e dönüştür
    return rows.map((row) => row.join(",")).join("\n");
  }

  /**
   * Excel formatında export oluşturur
   */
  async exportToExcel(
    images: ImageRiskDocument[],
    options: ExportOptions
  ): Promise<ExcelJS.Buffer> {
    const template = options.template;
    const workbook = new ExcelJS.Workbook();
    
    // Şablon varsa şirket bilgilerini kullan
    workbook.creator = template?.companyName || "AutoPatch AI";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Şablon ayarlarına göre sayfa sırasını belirle
    const excelOptions = template?.excelOptions;
    const sheetOrder = excelOptions?.sheetOrder || [
      "Images",
      "Risk Summary",
      "Risk Factors",
      "Namespace Analysis",
    ];

    const sheets: { name: string; sheet: ExcelJS.Worksheet }[] = [];

    // Ana sayfa: Image Listesi
    if (sheetOrder.includes("Images")) {
      const imagesSheet = workbook.addWorksheet("Images");
      this.addImagesSheet(imagesSheet, images, options);
      sheets.push({ name: "Images", sheet: imagesSheet });
    }

    // Risk Özeti sayfası
    if (sheetOrder.includes("Risk Summary")) {
      const summarySheet = workbook.addWorksheet("Risk Summary");
      this.addSummarySheet(summarySheet, images, options);
      sheets.push({ name: "Risk Summary", sheet: summarySheet });
    }

    // Risk Faktörü Analizi sayfası
    if (sheetOrder.includes("Risk Factors")) {
      const riskFactorsSheet = workbook.addWorksheet("Risk Factors");
      this.addRiskFactorsSheet(riskFactorsSheet, images, options);
      sheets.push({ name: "Risk Factors", sheet: riskFactorsSheet });
    }

    // Namespace Analizi sayfası
    if (sheetOrder.includes("Namespace Analysis")) {
      const namespaceSheet = workbook.addWorksheet("Namespace Analysis");
      this.addNamespaceSheet(namespaceSheet, images, options);
      sheets.push({ name: "Namespace Analysis", sheet: namespaceSheet });
    }

    // Şablon sırasına göre sayfaları yeniden sırala
    if (template && sheetOrder.length > 0) {
      const orderedSheets: ExcelJS.Worksheet[] = [];
      sheetOrder.forEach((sheetName) => {
        const found = sheets.find((s) => s.name === sheetName);
        if (found) {
          orderedSheets.push(found.sheet);
        }
      });
      // Sıralanmamış sayfaları sona ekle
      sheets.forEach((s) => {
        if (!orderedSheets.includes(s.sheet)) {
          orderedSheets.push(s.sheet);
        }
      });
      // Workbook'taki sayfaları yeniden sırala (ExcelJS bu özelliği desteklemiyor, bu yüzden sadece not olarak bırakıyoruz)
    }

    // Buffer'a yaz
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  }

  /**
   * Images sayfasını oluşturur
   */
  private addImagesSheet(
    sheet: ExcelJS.Worksheet,
    images: ImageRiskDocument[],
    options: ExportOptions
  ): void {
    const filtered = this.applyFilters(images, options.filters);
    const sorted = this.applySorting(filtered, options);

    // Başlıklar
    const headers = [
      "Image Name",
      "Risk Score",
      "Risk Level",
      "Pod Count",
      "Prod Pod Count",
      "Non-Prod Pod Count",
      "Last Scanned At",
      "Cluster ID",
      "Project ID",
    ];

    if (options.includeRiskFactors) {
      headers.push("Risk Factors");
    }

    if (options.includePods) {
      headers.push("Pods");
    }

    sheet.addRow(headers);

    // Başlık satırını formatla (şablon renklerini kullan)
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";
    const headerColor = this.hexToArgb(primaryColor);
    
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: headerColor },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Veri satırları
    sorted.forEach((img) => {
      const { prod, nonProd } = this.countProdPods(img);
      const row: any[] = [
        img.imageName,
        img.riskScore,
        img.riskLevel,
        img.pods.length,
        prod,
        nonProd,
        new Date(img.lastScannedAt),
        img.clusterId || "",
        img.projectId || "",
      ];

      if (options.includeRiskFactors) {
        row.push(img.riskFactors.join(" | "));
      }

      if (options.includePods) {
        row.push(img.pods.map((p) => `${p.namespace}:${p.name}`).join(" | "));
      }

      const dataRow = sheet.addRow(row);

      // Risk seviyesine göre renklendir
      const riskLevelCell = dataRow.getCell(3);
      const riskScoreCell = dataRow.getCell(2);
      
      if (img.riskLevel === "CRITICAL") {
        riskLevelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE5E5" },
        };
        riskScoreCell.font = { color: { argb: "FFEF4444" }, bold: true };
      } else if (img.riskLevel === "HIGH") {
        riskLevelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF4E5" },
        };
        riskScoreCell.font = { color: { argb: "FFF87171" }, bold: true };
      } else if (img.riskLevel === "MEDIUM") {
        riskLevelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFBF0" },
        };
        riskScoreCell.font = { color: { argb: "FFFBBF24" } };
      } else {
        riskLevelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5F9F0" },
        };
        riskScoreCell.font = { color: { argb: "FF10B981" } };
      }
    });

    // Kolon genişliklerini ayarla
    sheet.columns.forEach((column) => {
      column.width = 15;
    });
    sheet.getColumn(1).width = 40; // Image Name
    if (options.includeRiskFactors) {
      sheet.getColumn(headers.indexOf("Risk Factors") + 1).width = 50;
    }
    if (options.includePods) {
      sheet.getColumn(headers.indexOf("Pods") + 1).width = 50;
    }

    // Auto-filter ekle
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sorted.length + 1, column: headers.length },
    };
  }

  /**
   * Risk Özeti sayfasını oluşturur
   */
  private addSummarySheet(
    sheet: ExcelJS.Worksheet,
    images: ImageRiskDocument[],
    options: ExportOptions
  ): void {
    const filtered = this.applyFilters(images, options.filters);

    // İstatistikler
    const totalImages = filtered.length;
    const critical = filtered.filter((img) => img.riskLevel === "CRITICAL").length;
    const high = filtered.filter((img) => img.riskLevel === "HIGH").length;
    const medium = filtered.filter((img) => img.riskLevel === "MEDIUM").length;
    const low = filtered.filter((img) => img.riskLevel === "LOW").length;
    const avgRiskScore =
      filtered.reduce((sum, img) => sum + img.riskScore, 0) / totalImages || 0;
    const totalPods = filtered.reduce((sum, img) => sum + img.pods.length, 0);
    const prodPods = filtered.reduce((sum, img) => {
      return (
        sum +
        img.pods.filter((p) => {
          const ns = p.namespace.toLowerCase();
          return ns === "prod" || ns.startsWith("prod-");
        }).length
      );
    }, 0);

    sheet.addRow(["Risk Summary", ""]);
    sheet.addRow(["Total Images", totalImages]);
    sheet.addRow(["Critical Risk", critical]);
    sheet.addRow(["High Risk", high]);
    sheet.addRow(["Medium Risk", medium]);
    sheet.addRow(["Low Risk", low]);
    sheet.addRow(["Average Risk Score", avgRiskScore.toFixed(2)]);
    sheet.addRow(["Total Pods", totalPods]);
    sheet.addRow(["Prod Pods", prodPods]);
    sheet.addRow(["Non-Prod Pods", totalPods - prodPods]);
    sheet.addRow([]);
    sheet.addRow(["Generated At", new Date().toISOString()]);

    // Başlık formatla (şablon renklerini kullan)
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";
    const headerColor = this.hexToArgb(primaryColor);
    
    const titleRow = sheet.getRow(1);
    titleRow.font = { bold: true, size: 14 };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: headerColor },
    };
    titleRow.getCell(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // Kolon genişlikleri
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 15;
  }

  /**
   * Risk Faktörü Analizi sayfasını oluşturur
   */
  private addRiskFactorsSheet(
    sheet: ExcelJS.Worksheet,
    images: ImageRiskDocument[],
    options: ExportOptions
  ): void {
    const riskFactorCounts = new Map<string, number>();
    images.forEach((img) => {
      img.riskFactors.forEach((factor) => {
        riskFactorCounts.set(factor, (riskFactorCounts.get(factor) || 0) + 1);
      });
    });

    const sortedFactors = Array.from(riskFactorCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    sheet.addRow(["Risk Factor", "Count", "Percentage"]);

    // Şablon renklerini kullan
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";
    const headerColor = this.hexToArgb(primaryColor);
    
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: headerColor },
    };

    const totalImages = images.length;
    sortedFactors.forEach(([factor, count]) => {
      const percentage = ((count / totalImages) * 100).toFixed(2);
      sheet.addRow([factor, count, `${percentage}%`]);
    });

    sheet.getColumn(1).width = 50;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 12;
  }

  /**
   * Namespace Analizi sayfasını oluşturur
   */
  private addNamespaceSheet(
    sheet: ExcelJS.Worksheet,
    images: ImageRiskDocument[],
    options: ExportOptions
  ): void {
    const namespaceCounts = new Map<
      string,
      { total: number; critical: number; high: number; medium: number; low: number }
    >();

    images.forEach((img) => {
      img.pods.forEach((pod) => {
        const ns = pod.namespace;
        if (!namespaceCounts.has(ns)) {
          namespaceCounts.set(ns, {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          });
        }
        const nsData = namespaceCounts.get(ns)!;
        nsData.total++;
        if (img.riskLevel === "CRITICAL") nsData.critical++;
        else if (img.riskLevel === "HIGH") nsData.high++;
        else if (img.riskLevel === "MEDIUM") nsData.medium++;
        else nsData.low++;
      });
    });

    sheet.addRow([
      "Namespace",
      "Total Pods",
      "Critical",
      "High",
      "Medium",
      "Low",
    ]);

    // Şablon renklerini kullan
    const template = options.template;
    const primaryColor = template?.primaryColor || "#4472C4";
    const headerColor = this.hexToArgb(primaryColor);
    
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: headerColor },
    };

    const sortedNamespaces = Array.from(namespaceCounts.entries()).sort(
      (a, b) => b[1].total - a[1].total
    );

    sortedNamespaces.forEach(([ns, data]) => {
      sheet.addRow([
        ns,
        data.total,
        data.critical,
        data.high,
        data.medium,
        data.low,
      ]);
    });

    sheet.columns.forEach((column, idx) => {
      column.width = idx === 0 ? 30 : 12;
    });
  }

  /**
   * Compliance assessment'ları Excel'e export eder
   */
  async exportComplianceToExcel(
    assessments: ComplianceAssessmentDocument[]
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AutoPatch AI";
    workbook.created = new Date();

    assessments.forEach((assessment) => {
      const sheet = workbook.addWorksheet(`${assessment.standard} ${assessment.version}`);

      // Başlık
      sheet.addRow([`${assessment.standard} ${assessment.version} - Compliance Assessment`]);
      const titleRow = sheet.getRow(1);
      titleRow.font = { bold: true, size: 14 };
      titleRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      titleRow.getCell(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

      sheet.addRow([]);
      sheet.addRow(["Compliance Score", `${assessment.complianceScore}%`]);
      sheet.addRow(["Overall Status", assessment.overallStatus]);
      sheet.addRow(["Assessed At", new Date(assessment.assessedAt).toISOString()]);
      sheet.addRow([]);

      // Gereksinimler
      sheet.addRow(["ID", "Title", "Status", "Severity", "Description", "Notes"]);
      const headerRow = sheet.getRow(8);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };

      assessment.requirements.forEach((req) => {
        const row = sheet.addRow([
          req.id,
          req.title,
          req.status,
          req.severity,
          req.description,
          req.notes || "",
        ]);

        // Status'a göre renklendir
        const statusCell = row.getCell(3);
        if (req.status === "PASS") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE5F9F0" },
          };
        } else if (req.status === "FAIL") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFE5E5" },
          };
        }
      });

      sheet.columns.forEach((column, idx) => {
        column.width = idx === 1 ? 30 : idx === 4 ? 50 : 15;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  }

  /**
   * Filtreleri uygular
   */
  applyFilters(
    images: ImageRiskDocument[],
    filters?: ExportOptions["filters"]
  ): ImageRiskDocument[] {
    if (!filters) return images;

    let filtered = images;

    if (filters.riskLevel && filters.riskLevel !== "ALL") {
      filtered = filtered.filter((img) => img.riskLevel === filters.riskLevel);
    }

    if (filters.namespace && filters.namespace !== "ALL") {
      filtered = filtered.filter((img) =>
        img.pods.some((p) => p.namespace === filters.namespace)
      );
    }

    if (filters.clusterId) {
      filtered = filtered.filter((img) => img.clusterId === filters.clusterId);
    }

    if (filters.projectId) {
      filtered = filtered.filter((img) => img.projectId === filters.projectId);
    }

    return filtered;
  }

  /**
   * Sıralamayı uygular
   */
  applySorting(
    images: ImageRiskDocument[],
    options: ExportOptions
  ): ImageRiskDocument[] {
    const sorted = [...images];
    const order = options.sortOrder || "desc";

    switch (options.sortBy) {
      case "riskScore":
        sorted.sort((a, b) =>
          order === "desc" ? b.riskScore - a.riskScore : a.riskScore - b.riskScore
        );
        break;
      case "imageName":
        sorted.sort((a, b) =>
          order === "desc"
            ? b.imageName.localeCompare(a.imageName)
            : a.imageName.localeCompare(b.imageName)
        );
        break;
      case "lastScannedAt":
        sorted.sort((a, b) => {
          const dateA = new Date(a.lastScannedAt).getTime();
          const dateB = new Date(b.lastScannedAt).getTime();
          return order === "desc" ? dateB - dateA : dateA - dateB;
        });
        break;
      default:
        // Varsayılan: risk skoruna göre azalan
        sorted.sort((a, b) => b.riskScore - a.riskScore);
    }

    return sorted;
  }

  /**
   * Prod pod sayısını hesaplar
   */
  private countProdPods(img: ImageRiskDocument): { prod: number; nonProd: number } {
    let prod = 0;
    let nonProd = 0;

    img.pods.forEach((pod) => {
      const ns = pod.namespace.toLowerCase();
      if (ns === "prod" || ns.startsWith("prod-")) {
        prod++;
      } else {
        nonProd++;
      }
    });

    return { prod, nonProd };
  }

  /**
   * CSV için string'i escape eder
   */
  private escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Hex renk kodunu ARGB formatına dönüştürür
   */
  private hexToArgb(hex: string): string {
    // # karakterini kaldır
    hex = hex.replace("#", "");
    
    // RGB değerlerini al
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // ARGB formatına dönüştür (FF = tam opak)
    return `FF${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }
}

