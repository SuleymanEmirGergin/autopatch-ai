import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const ADMIN_API_KEY = process.env.BACKEND_ADMIN_API_KEY;

const getHeaders = () => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (ADMIN_API_KEY) {
    headers["X-API-Key"] = ADMIN_API_KEY;
  }
  return headers;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const queryString = req.url?.split("?")[1] || "";
    const format = req.query.format as string || "csv";
    let endpoint = `${BACKEND_URL}/api/images/export`;
    
    if (format === "excel") {
      endpoint = `${BACKEND_URL}/api/images/export/excel`;
    } else if (format === "json") {
      endpoint = `${BACKEND_URL}/api/images/export/json`;
    } else {
      endpoint = `${BACKEND_URL}/api/images/export/csv`;
    }

    const backendRes = await fetch(`${endpoint}${queryString ? `?${queryString}` : ""}`, {
      method: req.method,
      headers: getHeaders(),
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    if (format === "excel") {
      const buffer = await backendRes.arrayBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=images-export.xlsx");
      return res.status(backendRes.status).send(Buffer.from(buffer));
    } else if (format === "json") {
      const data = await backendRes.json();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=images-export.json");
      return res.status(backendRes.status).json(data);
    } else {
      const text = await backendRes.text();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=images-export.csv");
      return res.status(backendRes.status).send(text);
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}
