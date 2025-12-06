/**
 * IoT Device Service
 * IoT device'larından container image'leri çeker ve analiz eder
 */

import { ImageRiskResult } from "../risk/riskEngine";
import { ImageRiskRepository } from "../persistence/imageRisk.repository";
import { RiskEngine } from "../risk/riskEngine";
import { logger } from "../utils/logger";

export interface IoTDevice {
  deviceId: string;
  deviceName: string;
  deviceType: "edge" | "gateway" | "sensor" | "actuator" | "other";
  location?: string;
  clusterId?: string;
  projectId?: string;
  containers: Array<{
    containerId: string;
    imageName: string;
    status: "running" | "stopped" | "error";
    lastUpdated: Date;
  }>;
  metadata?: {
    firmwareVersion?: string;
    osVersion?: string;
    connectivity?: "wifi" | "ethernet" | "cellular" | "other";
  };
}

export interface IoTScanResult {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  totalContainers: number;
  runningContainers: number;
  images: ImageRiskResult[];
  scanTimestamp: Date;
  connectivityStatus: "online" | "offline" | "unknown";
}

export class IoTDeviceService {
  private imageRiskRepo: ImageRiskRepository;
  private riskEngine: RiskEngine;

  constructor() {
    this.imageRiskRepo = new ImageRiskRepository();
    this.riskEngine = new RiskEngine();
  }

  /**
   * IoT device'ından container image'lerini tarar
   */
  async scanIoTDevice(device: IoTDevice): Promise<IoTScanResult> {
    logger.info(`IoT device taranıyor: ${device.deviceId} (${device.deviceName})`);

    const images: ImageRiskResult[] = [];
    const runningContainers = device.containers.filter(c => c.status === "running");

    for (const container of runningContainers) {
      try {
        // Image risk analizi
        const usage = {
          imageName: container.imageName,
          pods: [
            {
              namespace: `iot-${device.deviceType}`,
              name: `${device.deviceId}-${container.containerId}`,
            },
          ],
        };

        const metadata = {
          usesRootUser: false, // IoT device'lar genelde non-root kullanır
          baseImageKnown: true,
        };

        const riskResult = this.riskEngine.calculateRisk(usage, metadata, [], []);

        // IoT-specific risk faktörleri ekle
        const iotRiskFactors = this.identifyIoTRiskFactors(device, container);
        riskResult.riskFactors = [...riskResult.riskFactors, ...iotRiskFactors];

        // IoT-specific risk skoru artırımı
        if (iotRiskFactors.length > 0) {
          riskResult.riskScore = Math.min(100, riskResult.riskScore + iotRiskFactors.length * 5);
          if (riskResult.riskScore >= 75) {
            riskResult.riskLevel = "CRITICAL";
          } else if (riskResult.riskScore >= 50) {
            riskResult.riskLevel = "HIGH";
          }
        }

        images.push({
          ...riskResult,
          clusterId: device.clusterId || `iot-cluster-${device.deviceType}`,
          projectId: device.projectId || `iot-project-${device.deviceId}`,
        });
      } catch (error) {
        logger.error(`Container analiz hatası (${container.containerId}):`, error);
      }
    }

    // Veritabanına kaydet
    if (images.length > 0) {
      await this.imageRiskRepo.upsertMany(images);
    }

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      totalContainers: device.containers.length,
      runningContainers: runningContainers.length,
      images,
      scanTimestamp: new Date(),
      connectivityStatus: device.metadata?.connectivity ? "online" : "unknown",
    };
  }

  /**
   * Birden fazla IoT device'ı toplu olarak tarar
   */
  async scanMultipleIoTDevices(devices: IoTDevice[]): Promise<IoTScanResult[]> {
    logger.info(`${devices.length} IoT device toplu olarak taranıyor`);

    const results: IoTScanResult[] = [];

    for (const device of devices) {
      try {
        const result = await this.scanIoTDevice(device);
        results.push(result);
      } catch (error) {
        logger.error(`IoT device tarama hatası (${device.deviceId}):`, error);
        results.push({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          totalContainers: 0,
          runningContainers: 0,
          images: [],
          scanTimestamp: new Date(),
          connectivityStatus: "offline",
        });
      }
    }

    return results;
  }

  /**
   * IoT device'lar için özel risk faktörleri tespit eder
   */
  private identifyIoTRiskFactors(device: IoTDevice, container: any): string[] {
    const factors: string[] = [];

    // Edge device'lar genelde daha riskli
    if (device.deviceType === "edge" || device.deviceType === "gateway") {
      factors.push("IoT Edge/Gateway device");
    }

    // Eski firmware versiyonları
    if (device.metadata?.firmwareVersion) {
      const firmwareVersion = device.metadata.firmwareVersion;
      if (this.isOldFirmware(firmwareVersion)) {
        factors.push("Outdated IoT firmware");
      }
    }

    // Offline/limited connectivity
    if (device.metadata?.connectivity === "cellular" || !device.metadata?.connectivity) {
      factors.push("Limited connectivity device");
    }

    // Production IoT device'lar kritik
    if (device.location?.toLowerCase().includes("production") || 
        device.location?.toLowerCase().includes("prod")) {
      factors.push("Production IoT device");
    }

    return factors;
  }

  /**
   * Firmware versiyonunun eski olup olmadığını kontrol eder
   */
  private isOldFirmware(version: string): boolean {
    // Basit kontrol: 2 yıldan eski versiyonlar
    const yearMatch = version.match(/20(\d{2})/);
    if (yearMatch) {
      const year = parseInt(`20${yearMatch[1]}`);
      const currentYear = new Date().getFullYear();
      return currentYear - year > 2;
    }
    return false;
  }

  /**
   * IoT device'ların container image'lerini listeler
   */
  async getIoTDeviceImages(deviceId?: string, deviceType?: string): Promise<ImageRiskResult[]> {
    const query: any = {};

    if (deviceId) {
      query.clusterId = `iot-cluster-${deviceId}`;
    }

    if (deviceType) {
      query.clusterId = { $regex: `iot-cluster-${deviceType}` };
    }

    return await this.imageRiskRepo.findMany(query);
  }

  /**
   * IoT device istatistikleri
   */
  async getIoTStatistics(): Promise<{
    totalDevices: number;
    totalContainers: number;
    deviceTypes: Record<string, number>;
    riskDistribution: Record<string, number>;
  }> {
    const iotImages = await this.imageRiskRepo.findMany({
      clusterId: { $regex: /^iot-cluster-/ },
    });

    const deviceTypes: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const image of iotImages) {
      // Device type'ı clusterId'den çıkar
      const match = image.clusterId?.match(/iot-cluster-(.+)/);
      if (match) {
        const deviceType = match[1];
        deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1;
      }

      // Risk dağılımı
      riskDistribution[image.riskLevel] = (riskDistribution[image.riskLevel] || 0) + 1;
    }

    return {
      totalDevices: Object.keys(deviceTypes).length,
      totalContainers: iotImages.length,
      deviceTypes,
      riskDistribution,
    };
  }
}

