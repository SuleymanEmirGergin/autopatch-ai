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
    const path = req.url?.split("?")[0] || "";
    let endpoint = `${BACKEND_URL}/api/reports/risk-summary`;
    
    if (path.includes("/html")) {
      endpoint = `${BACKEND_URL}/api/reports/risk-summary/html`;
    } else if (path.includes("/markdown")) {
      endpoint = `${BACKEND_URL}/api/reports/risk-summary/markdown`;
    }

    const backendRes = await fetch(`${endpoint}${queryString ? `?${queryString}` : ""}`, {
      method: req.method,
      headers: getHeaders(),
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    // HTML veya markdown ise text olarak döndür
    if (path.includes("/html") || path.includes("/markdown")) {
      const text = await backendRes.text();
      res.setHeader("Content-Type", path.includes("/html") ? "text/html" : "text/markdown");
      return res.status(backendRes.status).send(text);
    }

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}
