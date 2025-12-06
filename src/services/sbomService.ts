import { SBOMModel, SBOMDocument, PackageInfo, PackageVulnerability } from "../persistence/sbom.model";

/**
 * Mock SBOM scanner - Gerçek bir scanner entegrasyonu için placeholder
 * Gerçek kullanımda Trivy, Grype veya Syft entegrasyonu yapılabilir
 */
export class MockSBOMScanner {
  /**
   * Bir image için SBOM oluşturur (mock data)
   */
  async scanImage(imageName: string): Promise<SBOMDocument> {
    // Mock package listesi oluştur
    const packages: PackageInfo[] = this.generateMockPackages(imageName);
    
    // İstatistikleri hesapla
    const totalPackages = packages.length;
    const vulnerablePackages = packages.filter((pkg) => pkg.vulnerabilities.length > 0).length;
    const criticalVulnerabilities = packages.reduce(
      (sum, pkg) => sum + pkg.vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
      0
    );
    const highVulnerabilities = packages.reduce(
      (sum, pkg) => sum + pkg.vulnerabilities.filter((v) => v.severity === "HIGH").length,
      0
    );
    const mediumVulnerabilities = packages.reduce(
      (sum, pkg) => sum + pkg.vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
      0
    );
    const lowVulnerabilities = packages.reduce(
      (sum, pkg) => sum + pkg.vulnerabilities.filter((v) => v.severity === "LOW").length,
      0
    );

    const sbom: Partial<SBOMDocument> = {
      imageName,
      scannedAt: new Date(),
      packages,
      totalPackages,
      vulnerablePackages,
      criticalVulnerabilities,
      highVulnerabilities,
      mediumVulnerabilities,
      lowVulnerabilities,
      format: "syft",
      scanner: "mock",
    };

    return sbom as SBOMDocument;
  }

  /**
   * Mock package listesi oluşturur
   */
  private generateMockPackages(imageName: string): PackageInfo[] {
    const packages: PackageInfo[] = [];

    // Base image'e göre farklı paketler ekle
    if (imageName.includes("node") || imageName.includes("npm")) {
      packages.push(
        {
          name: "express",
          version: "4.17.1",
          type: "npm",
          vulnerabilities: [
            {
              cveId: "CVE-2022-24999",
              severity: "HIGH",
              score: 7.5,
              description: "Prototype pollution vulnerability",
              fixedVersion: "4.18.0",
              publishedAt: new Date("2022-01-15"),
              references: ["https://nvd.nist.gov/vuln/detail/CVE-2022-24999"],
            },
          ],
        },
        {
          name: "lodash",
          version: "4.17.20",
          type: "npm",
          vulnerabilities: [
            {
              cveId: "CVE-2021-23337",
              severity: "CRITICAL",
              score: 9.8,
              description: "Command injection vulnerability",
              fixedVersion: "4.17.21",
              publishedAt: new Date("2021-02-20"),
              references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-23337"],
            },
          ],
        },
        {
          name: "axios",
          version: "0.21.1",
          type: "npm",
          vulnerabilities: [],
        }
      );
    }

    if (imageName.includes("python") || imageName.includes("pip")) {
      packages.push(
        {
          name: "requests",
          version: "2.25.1",
          type: "pip",
          vulnerabilities: [
            {
              cveId: "CVE-2021-33503",
              severity: "MEDIUM",
              score: 6.5,
              description: "Information disclosure vulnerability",
              fixedVersion: "2.26.0",
              publishedAt: new Date("2021-05-10"),
              references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-33503"],
            },
          ],
        },
        {
          name: "urllib3",
          version: "1.26.4",
          type: "pip",
          vulnerabilities: [],
        }
      );
    }

    // OS packages (her zaman ekle)
    packages.push(
      {
        name: "openssl",
        version: "1.1.1f",
        type: "os",
        vulnerabilities: [
          {
            cveId: "CVE-2021-3711",
            severity: "HIGH",
            score: 7.5,
            description: "Buffer overflow in SM2 decryption",
            fixedVersion: "1.1.1l",
            publishedAt: new Date("2021-08-24"),
            references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-3711"],
          },
        ],
      },
      {
        name: "curl",
        version: "7.68.0",
        type: "os",
        vulnerabilities: [
          {
            cveId: "CVE-2021-22946",
            severity: "CRITICAL",
            score: 9.1,
            description: "Heap buffer overflow in curl_easy_duphandle()",
            fixedVersion: "7.78.0",
            publishedAt: new Date("2021-07-21"),
            references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-22946"],
          },
        ],
      },
      {
        name: "bash",
        version: "5.0-6ubuntu1",
        type: "os",
        vulnerabilities: [],
      }
    );

    return packages;
  }
}

export class SBOMService {
  private scanner: MockSBOMScanner;

  constructor() {
    this.scanner = new MockSBOMScanner();
  }

  /**
   * Bir image için SBOM oluşturur veya mevcut olanı döndürür
   */
  async getOrCreateSBOM(imageName: string, clusterId?: string): Promise<SBOMDocument> {
    const query: any = { imageName };
    if (clusterId) query.clusterId = clusterId;

    let sbom = await SBOMModel.findOne(query).sort({ scannedAt: -1 }).exec();

    // Eğer SBOM yoksa veya 24 saatten eskiyse yeni scan yap
    if (!sbom || this.isSBOMStale(sbom)) {
      const scanned = await this.scanner.scanImage(imageName);
      
      // Cluster ID ekle
      if (clusterId) {
        scanned.clusterId = clusterId;
      }

      // MongoDB'ye kaydet
      sbom = await SBOMModel.findOneAndUpdate(
        query,
        scanned,
        { new: true, upsert: true }
      ).exec();
    }

    return sbom!;
  }

  /**
   * SBOM'un eski olup olmadığını kontrol eder (24 saat)
   */
  private isSBOMStale(sbom: SBOMDocument): boolean {
    const hoursSinceScan = (Date.now() - sbom.scannedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceScan > 24;
  }

  /**
   * Belirli bir image için SBOM'u zorla yeniden tarar
   */
  async rescanSBOM(imageName: string, clusterId?: string): Promise<SBOMDocument> {
    const scanned = await this.scanner.scanImage(imageName);
    if (clusterId) {
      scanned.clusterId = clusterId;
    }

    const query: any = { imageName };
    if (clusterId) query.clusterId = clusterId;

    return SBOMModel.findOneAndUpdate(query, scanned, { new: true, upsert: true }).exec() as Promise<SBOMDocument>;
  }

  /**
   * Tüm CVE'leri listeler (tüm SBOM'lardan)
   */
  async getAllCVEs(clusterId?: string): Promise<PackageVulnerability[]> {
    const query: any = {};
    if (clusterId) query.clusterId = clusterId;

    const sboms = await SBOMModel.find(query).exec();
    const cves = new Map<string, PackageVulnerability>();

    sboms.forEach((sbom) => {
      sbom.packages.forEach((pkg) => {
        pkg.vulnerabilities.forEach((vuln) => {
          if (!cves.has(vuln.cveId)) {
            cves.set(vuln.cveId, vuln);
          }
        });
      });
    });

    return Array.from(cves.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Belirli bir package için SBOM'ları bulur
   */
  async findByPackage(packageName: string, clusterId?: string): Promise<SBOMDocument[]> {
    const query: any = { "packages.name": packageName };
    if (clusterId) query.clusterId = clusterId;

    return SBOMModel.find(query).exec();
  }
}

