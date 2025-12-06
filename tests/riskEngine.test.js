"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const riskEngine_1 = require("../src/risk/riskEngine");
describe("RiskEngine", () => {
    const engine = new riskEngine_1.RiskEngine();
    const baseUsage = {
        imageName: "registry.example.com/app:1.0.0",
        pods: [
            { namespace: "default", name: "pod-1" },
            { namespace: "default", name: "pod-2" },
        ],
    };
    it("latest tag kullanan image için +40 risk ekler", () => {
        const usage = {
            ...baseUsage,
            imageName: "registry.example.com/app:latest",
        };
        const result = engine.calculateRisk(usage, {});
        expect(result.riskScore).toBeGreaterThanOrEqual(40);
        expect(result.riskFactors).toContain("Uses latest tag");
    });
    it("ignoredFactors içindeki bir faktörü hesaba katmaz", () => {
        const usage = {
            ...baseUsage,
            imageName: "registry.example.com/app:latest",
        };
        const result = engine.calculateRisk(usage, {}, ["Uses latest tag"]);
        expect(result.riskScore).toBe(0);
        expect(result.riskFactors).not.toContain("Uses latest tag");
    });
    it("180 günden eski image için +20 risk ekler", () => {
        const usage = {
            ...baseUsage,
        };
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - 181);
        const result = engine.calculateRisk(usage, { createdAt });
        expect(result.riskScore).toBeGreaterThanOrEqual(20);
        expect(result.riskFactors).toContain("Image older than 180 days");
    });
    it("root user kullanımı için +30 risk ekler", () => {
        const result = engine.calculateRisk(baseUsage, {
            usesRootUser: true,
        });
        expect(result.riskScore).toBeGreaterThanOrEqual(30);
        expect(result.riskFactors).toContain("Uses root user");
    });
    it("bilinmeyen base image için +10 risk ekler", () => {
        const result = engine.calculateRisk(baseUsage, {
            baseImageKnown: false,
        });
        expect(result.riskScore).toBeGreaterThanOrEqual(10);
        expect(result.riskFactors).toContain("Uses unknown base image");
    });
    it("skoru 100 ile sınırlar", () => {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - 365);
        const result = engine.calculateRisk({
            ...baseUsage,
            imageName: "registry.example.com/app:latest",
        }, {
            createdAt,
            usesRootUser: true,
            baseImageKnown: false,
        });
        expect(result.riskScore).toBeLessThanOrEqual(100);
    });
    it("non-production tag (dev/debug/snapshot) için +15 risk ekler", () => {
        const usage = {
            ...baseUsage,
            imageName: "registry.example.com/app:dev",
        };
        const result = engine.calculateRisk(usage, {});
        expect(result.riskScore).toBeGreaterThanOrEqual(15);
        expect(result.riskFactors).toContain("Uses non-production tag");
    });
    it("test imajları için +10 risk ekler", () => {
        const usage = {
            ...baseUsage,
            imageName: "registry.example.com/app-test:1.0.0",
        };
        const result = engine.calculateRisk(usage, {});
        expect(result.riskScore).toBeGreaterThanOrEqual(10);
        expect(result.riskFactors).toContain("Test image used in workload");
    });
    it("prod namespace'lerinde çalışan imajlar için +15 risk ekler", () => {
        const usage = {
            imageName: "registry.example.com/app:1.0.0",
            pods: [
                { namespace: "prod", name: "pod-1" },
                { namespace: "default", name: "pod-2" },
            ],
        };
        const result = engine.calculateRisk(usage, {});
        expect(result.riskScore).toBeGreaterThanOrEqual(15);
        expect(result.riskFactors).toContain("Running in production namespace");
    });
    it("legacy/canary imajları için +20 risk ekler", () => {
        const usage = {
            ...baseUsage,
            imageName: "registry.example.com/app-legacy:1.0.0",
        };
        const result = engine.calculateRisk(usage, {});
        expect(result.riskScore).toBeGreaterThanOrEqual(20);
        expect(result.riskFactors).toContain("Legacy image tag");
    });
});
