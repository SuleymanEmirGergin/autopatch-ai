/**
 * IoT Controller
 * IoT device'larından container image'leri tarama ve analiz endpoint'leri
 */

import { Request, Response, NextFunction } from "express";
import { IoTDeviceService, IoTDevice } from "../../services/iotDeviceService";

export class IoTController {
  private iotService: IoTDeviceService;

  constructor() {
    this.iotService = new IoTDeviceService();
  }

  /**
   * Tek bir IoT device'ı tarar
   * POST /iot/scan
   */
  scanDevice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device: IoTDevice = req.body;

      if (!device.deviceId || !device.deviceName) {
        return res.status(400).json({
          success: false,
          error: "deviceId ve deviceName gereklidir",
        });
      }

      const result = await this.iotService.scanIoTDevice(device);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Birden fazla IoT device'ı toplu olarak tarar
   * POST /iot/scan/bulk
   */
  scanBulkDevices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { devices } = req.body;

      if (!Array.isArray(devices) || devices.length === 0) {
        return res.status(400).json({
          success: false,
          error: "devices array gereklidir",
        });
      }

      const results = await this.iotService.scanMultipleIoTDevices(devices);

      res.json({
        success: true,
        data: {
          total: results.length,
          results,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * IoT device image'lerini listeler
   * GET /iot/images
   */
  listImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deviceId, deviceType } = req.query;

      const images = await this.iotService.getIoTDeviceImages(
        deviceId as string,
        deviceType as string
      );

      res.json({
        success: true,
        data: images,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * IoT istatistikleri
   * GET /iot/statistics
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.iotService.getIoTStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  };
}

