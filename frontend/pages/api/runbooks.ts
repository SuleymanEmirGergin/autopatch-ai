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
    let endpoint = `${BACKEND_URL}/api/runbooks`;
    
    if (path.includes("/risk-factor")) {
      const riskFactor = req.query.riskFactor as string;
      if (riskFactor) {
        const encoded = encodeURIComponent(riskFactor);
        endpoint = `${BACKEND_URL}/api/runbooks/risk-factor/${encoded}`;
      }
    }

    const backendRes = await fetch(`${endpoint}${queryString ? `?${queryString}` : ""}`, {
      method: req.method,
      headers: getHeaders(),
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}
