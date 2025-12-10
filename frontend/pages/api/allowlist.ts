import type { NextApiRequest, NextApiResponse } from "next";
import { AllowlistEntry } from "../../lib/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const ADMIN_API_KEY = process.env.BACKEND_ADMIN_API_KEY || "";

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  if (ADMIN_API_KEY) {
    headers["X-API-Key"] = ADMIN_API_KEY;
  }
  return headers;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/allowlist`, {
        headers: getHeaders(),
      });

      if (!backendRes.ok) {
        const text = await backendRes.text();
        return res.status(backendRes.status).json({ error: text });
      }

      const data = await backendRes.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: "Backend'e ulaşılamadı" });
    }
  }

  if (req.method === "POST") {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/allowlist`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!backendRes.ok) {
        const text = await backendRes.text();
        return res.status(backendRes.status).json({ error: text });
      }

      const data = await backendRes.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: "Backend'e ulaşılamadı" });
    }
  }

  return res.status(405).end();
}

