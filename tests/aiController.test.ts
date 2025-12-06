import { Request, Response } from "express";
import { AIController } from "../src/api/controllers/aiController";
import { ImageRiskModel } from "../src/persistence/imageRisk.model";

jest.mock("../src/persistence/imageRisk.model");
jest.mock("../src/services/mlRiskPredictionService");
jest.mock("../src/services/aiAnomalyDetectionService");
jest.mock("../src/services/intelligentRecommendationService");

describe("AIController", () => {
  let controller: AIController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new AIController();
    mockRequest = {
      params: {},
      query: {},
      body: {},
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("trainModel", () => {
    it("should train all AI models", async () => {
      mockRequest.query = { clusterId: "test-cluster" };

      await controller.trainModel(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe("getModelStatus", () => {
    it("should return model status", async () => {
      await controller.getModelStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          models: expect.any(Object),
        })
      );
    });
  });

  describe("predictRisk", () => {
    it("should predict risk for image", async () => {
      const mockImage = {
        _id: "test-id",
        imageName: "test-image",
        riskScore: 75,
        riskLevel: "HIGH",
        riskFactors: [],
        pods: [],
        lastScannedAt: new Date(),
        clusterId: "test-cluster",
      };

      mockRequest.params = { imageName: "test-image" };
      mockRequest.query = { clusterId: "test-cluster" };

      (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().resolves(mockImage),
      });

      await controller.predictRisk(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          imageName: "test-image",
        })
      );
    });

    it("should return 404 if image not found", async () => {
      mockRequest.params = { imageName: "non-existent" };

      (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().resolves(null),
      });

      await controller.predictRisk(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });
});

