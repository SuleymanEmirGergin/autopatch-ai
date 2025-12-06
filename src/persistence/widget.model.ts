import { Schema, model, Document } from "mongoose";

export type WidgetType =
  | "STATS_CARD"
  | "RISK_CHART"
  | "TREND_CHART"
  | "TOP_IMAGES_LIST"
  | "ANOMALIES_LIST"
  | "RISK_BUDGET_STATUS"
  | "SCAN_HISTORY"
  | "CLUSTER_STATS";

export interface WidgetConfig {
  // Widget-specific configuration
  title?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  refreshInterval?: number; // seconds
  limit?: number; // for list widgets
  chartType?: "line" | "bar" | "pie" | "area";
  metric?: string; // which metric to display
  clusterId?: string; // filter by cluster
  projectId?: string; // filter by project
  [key: string]: any; // Allow custom config
}

export interface WidgetDocument extends Document {
  userId?: string; // User-specific widgets (future)
  name: string;
  type: WidgetType;
  config: WidgetConfig;
  
  // Layout
  position: {
    x: number; // Grid column
    y: number; // Grid row
    w: number; // Width (in grid units)
    h: number; // Height (in grid units)
  };
  
  // Display
  enabled: boolean;
  order: number; // Display order
  
  createdAt: Date;
  updatedAt: Date;
}

const WidgetConfigSchema = new Schema(
  {
    title: { type: String },
    size: { type: String, enum: ["small", "medium", "large", "xlarge"], default: "medium" },
    refreshInterval: { type: Number, default: 30 },
    limit: { type: Number, default: 10 },
    chartType: { type: String, enum: ["line", "bar", "pie", "area"] },
    metric: { type: String },
    clusterId: { type: String },
    projectId: { type: String },
  },
  { _id: false, strict: false }
);

const WidgetSchema = new Schema<WidgetDocument>(
  {
    userId: { type: String, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "STATS_CARD",
        "RISK_CHART",
        "TREND_CHART",
        "TOP_IMAGES_LIST",
        "ANOMALIES_LIST",
        "RISK_BUDGET_STATUS",
        "SCAN_HISTORY",
        "CLUSTER_STATS",
      ],
      required: true,
    },
    config: { type: WidgetConfigSchema, default: {} },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4 }, // Default: 4 grid units wide
      h: { type: Number, default: 3 }, // Default: 3 grid units high
    },
    enabled: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

// Indexes
WidgetSchema.index({ userId: 1, enabled: 1, order: 1 });

export const WidgetModel = model<WidgetDocument>("Widget", WidgetSchema);

