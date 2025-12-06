import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const ADMIN_API_KEY = process.env.BACKEND_ADMIN_API_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).end();
  }

  const { imageName } = req.query;
  if (!imageName || typeof imageName !== "string") {
    return res.status(400).json({ error: "imageName gerekli" });
  }

  try {
    const headers: HeadersInit = {};
    if (ADMIN_API_KEY) {
      headers["X-API-Key"] = ADMIN_API_KEY;
    }

    const encoded = encodeURIComponent(imageName);
    const backendRes = await fetch(`${BACKEND_URL}/allowlist/${encoded}`, {
      method: "DELETE",
      headers,
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    return res.status(204).end();
  } catch (e) {
    return res.status(500).json({ error: "Backend'e ulaşılamadı" });
  }
}

