/**
 * Jest Setup File
 * 
 * Global test setup and teardown
 */

// Mock TensorFlow.js for tests
jest.mock("@tensorflow/tfjs-node", () => {
  const mockTensor = {
    data: jest.fn().mockResolvedValue([0.5]),
    dispose: jest.fn(),
  };

  const mockModel = {
    predict: jest.fn().mockReturnValue(mockTensor),
    fit: jest.fn().mockResolvedValue({}),
    compile: jest.fn(),
  };

  return {
    sequential: jest.fn().mockReturnValue(mockModel),
    tensor2d: jest.fn().mockReturnValue(mockTensor),
    tensor: jest.fn().mockReturnValue(mockTensor),
    disposeVariables: jest.fn(),
    train: {
      adam: jest.fn().mockReturnValue({}),
    },
    layers: {
      dense: jest.fn().mockReturnValue({}),
      dropout: jest.fn().mockReturnValue({}),
      lstm: jest.fn().mockReturnValue({}),
    },
  };
});

// Increase timeout for AI model training
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

