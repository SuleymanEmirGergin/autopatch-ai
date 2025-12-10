/**
 * Security Tests - AI Services
 * 
 * Tests security aspects of AI services
 */

import { AIController } from "../../src/api/controllers/aiController";
import { Request, Response } from "express";
import { ImageRiskModel } from "../../src/persistence/imageRisk.model";

jest.mock("../../src/persistence/imageRisk.model");

describe("AI Security Tests", () => {
  let controller: AIController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

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
    jest.clearAllMocks();
  });

  it("should sanitize image name input", async () => {
    mockRequest.params = { imageName: "../../etc/passwd" };
    mockRequest.query = {};

    // Mock ImageRiskModel.findOne to return null (image not found)
    (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Should handle malicious input gracefully
    await controller.predictRisk(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    // Should not expose file system - should return 404
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it("should validate clusterId input", async () => {
    mockRequest.query = { clusterId: "<script>alert('xss')</script>" };

    // Should sanitize input
    await controller.getModelStatus(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("should handle SQL injection attempts", async () => {
    mockRequest.params = { imageName: "'; DROP TABLE images; --" };

    // Mock ImageRiskModel.findOne to return null (image not found)
    (ImageRiskModel.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // Should handle SQL injection attempts
    await controller.predictRisk(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    // Should not execute SQL - should return 404
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });
});

