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
    const { id } = req.query;
    let endpoint = `${BACKEND_URL}/api/scheduled-reports/${id}`;
    
    if (req.url?.includes("/run-now")) {
      endpoint = `${BACKEND_URL}/api/scheduled-reports/${id}/run-now`;
    } else if (req.url?.includes("/toggle")) {
      endpoint = `${BACKEND_URL}/api/scheduled-reports/${id}/toggle`;
    }

    const backendRes = await fetch(endpoint, {
      method: req.method,
      headers: getHeaders(),
      body: req.method === "POST" || req.method === "PUT" ? JSON.stringify(req.body) : undefined,
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
