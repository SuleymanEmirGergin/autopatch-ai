import type { NextApiRequest, NextApiResponse } from "next";

// Server-side'da direkt backend'e bağlan (nginx üzerinden değil)
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const ADMIN_API_KEY = process.env.BACKEND_ADMIN_API_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const headers: HeadersInit = {};
    if (ADMIN_API_KEY) {
      headers["X-API-Key"] = ADMIN_API_KEY;
    }

    const backendRes = await fetch(`${BACKEND_URL}/scan`, {
      method: "POST",
      headers,
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    const data = await backendRes.json();
    return res.status(202).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Backend'e ulaşılamadı" });
  }
}


