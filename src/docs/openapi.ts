export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "AutoPatch AI - Scanner Service",
    version: "2.0.0",
    description: "Container image risk scanning and automated remediation service with patch recommendations, auto actions, and bulk operations support.",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
          },
        },
      },
    },
    "/scan": {
      post: {
        summary: "Trigger scan (requires API key)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "202": {
            description: "Scan triggered",
          },
          "401": {
            description: "Unauthorized - API key required",
          },
        },
      },
    },
    "/scan/status": {
      get: {
        summary: "Get status of the latest scan",
        responses: {
          "200": {
            description: "Scan status",
          },
        },
      },
    },
    "/images": {
      get: {
        summary: "List all images with risk scores",
        responses: {
          "200": {
            description: "List of images",
          },
        },
      },
      post: {
        summary: "Create or update an image manually (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["imageName"],
                properties: {
                  imageName: { type: "string" },
                  riskScore: { type: "number", minimum: 0, maximum: 100 },
                  riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  riskFactors: {
                    type: "array",
                    items: { type: "string" },
                  },
                  pods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        namespace: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                  clusterId: { type: "string" },
                  projectId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Image created successfully" },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Admin access required" },
        },
      },
    },
    "/images/bulk": {
      post: {
        summary: "Create or update multiple images in bulk (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["images"],
                properties: {
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["imageName"],
                      properties: {
                        imageName: { type: "string" },
                        riskScore: { type: "number", minimum: 0, maximum: 100 },
                        riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                        riskFactors: {
                          type: "array",
                          items: { type: "string" },
                        },
                        pods: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              namespace: { type: "string" },
                              name: { type: "string" },
                            },
                          },
                        },
                        clusterId: { type: "string" },
                        projectId: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Images created successfully" },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Admin access required" },
        },
      },
    },
    "/images/top": {
      get: {
        summary: "Get top N images by risk score",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 5 },
          },
          {
            name: "prodOnly",
            in: "query",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Top images",
          },
        },
      },
    },
    "/images/{imageName}": {
      get: {
        summary: "Get details for a single image",
        parameters: [
          {
            name: "imageName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Image details",
          },
          "404": {
            description: "Image not found",
          },
        },
      },
    },
    "/images/{imageName}/history": {
      get: {
        summary: "Get scan history for a single image",
        parameters: [
          {
            name: "imageName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: {
          "200": {
            description: "Scan history entries (most recent first)",
          },
        },
      },
    },
    "/stats": {
      get: {
        summary: "Get overall statistics",
        responses: {
          "200": {
            description: "Statistics",
          },
        },
      },
    },
    "/allowlist": {
      get: {
        summary: "List risk allowlist entries (requires API key)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Allowlist entries",
          },
          "401": {
            description: "Unauthorized - API key required",
          },
        },
      },
      post: {
        summary: "Create or update an allowlist entry (requires API key)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  imageName: { type: "string" },
                  ignoredRiskFactors: {
                    type: "array",
                    items: { type: "string" },
                  },
                  note: { type: "string" },
                },
                required: ["imageName", "ignoredRiskFactors"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upserted entry",
          },
          "400": { description: "Validation error" },
        },
      },
    },
    "/allowlist/{imageName}": {
      delete: {
        summary: "Delete an allowlist entry (requires API key)",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "imageName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Deleted" },
          "401": {
            description: "Unauthorized - API key required",
          },
        },
      },
    },
    "/recommendations": {
      get: {
        summary: "Get bulk recommendations for all images",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "clusterId",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "projectId",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "riskLevel",
            in: "query",
            schema: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          },
        ],
        responses: {
          "200": { description: "Bulk recommendations" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/recommendations/priority": {
      get: {
        summary: "Get priority recommendations (high priority only)",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "minPriority",
            in: "query",
            schema: { type: "integer", default: 7 },
          },
        ],
        responses: {
          "200": { description: "Priority recommendations" },
        },
      },
    },
    "/recommendations/updates": {
      get: {
        summary: "Get image update recommendations",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Update recommendations" },
        },
      },
    },
    "/recommendations/patches": {
      get: {
        summary: "Get patch recommendations (CVE and risk factor based)",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "severity",
            in: "query",
            schema: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          },
          {
            name: "minPriority",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Patch recommendations" },
        },
      },
    },
    "/images/{imageName}/remediation-scripts": {
      get: {
        summary: "Get remediation scripts for an image",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "imageName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "scriptTypes",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated: bash,kubectl,github-actions,gitlab-ci",
          },
        ],
        responses: {
          "200": { description: "Remediation scripts" },
        },
      },
    },
    "/images/{imageName}/remediation-scripts/{scriptId}/execute": {
      post: {
        summary: "Execute a remediation script (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dryRun: { type: "boolean", default: true },
                  namespace: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Execution result" },
          "403": { description: "Admin access required" },
        },
      },
    },
    "/remediation/batch-execute": {
      post: {
        summary: "Execute batch remediation (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  imageNames: {
                    type: "array",
                    items: { type: "string" },
                  },
                  scriptIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                  dryRun: { type: "boolean", default: true },
                  namespace: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Batch execution results" },
        },
      },
    },
    "/remediation/batch-generate-execute": {
      post: {
        summary: "Generate and execute remediation scripts in bulk (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  imageNames: {
                    type: "array",
                    items: { type: "string" },
                  },
                  scriptType: {
                    type: "string",
                    enum: ["bash", "kubectl", "github-actions", "gitlab-ci"],
                  },
                  riskFactor: { type: "string" },
                  dryRun: { type: "boolean", default: true },
                  namespace: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Bulk execution results" },
        },
      },
    },
    "/auto-actions/policies": {
      get: {
        summary: "List auto action policies (admin only)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "List of policies" },
        },
      },
      post: {
        summary: "Create auto action policy (admin only)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  riskScoreThreshold: { type: "integer" },
                  riskLevels: {
                    type: "array",
                    items: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
                  },
                  actionType: {
                    type: "string",
                    enum: ["NOTIFY", "REMEDIATE_DRY_RUN", "REMEDIATE_EXECUTE"],
                  },
                  dryRun: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Policy created" },
        },
      },
    },
    "/auto-actions/policies/{id}": {
      put: {
        summary: "Update auto action policy (admin only)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Policy updated" },
        },
      },
      delete: {
        summary: "Delete auto action policy (admin only)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "204": { description: "Policy deleted" },
        },
      },
    },
    "/auto-actions/policies/{id}/execute": {
      post: {
        summary: "Execute auto action policy (admin only)",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": { description: "Execution result" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for protected endpoints",
      },
    },
  },
};


