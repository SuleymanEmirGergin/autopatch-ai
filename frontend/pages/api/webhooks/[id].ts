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
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Webhook ID is required" });
  }

  try {
    if (req.method === "PUT") {
      const backendRes = await fetch(`${BACKEND_URL}/webhooks/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(req.body),
      });

      if (!backendRes.ok) {
        const text = await backendRes.text();
        return res.status(backendRes.status).json({ error: text });
      }

      const data = await backendRes.json();
      return res.status(backendRes.status).json(data);
    } else if (req.method === "DELETE") {
      const backendRes = await fetch(`${BACKEND_URL}/webhooks/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!backendRes.ok) {
        const text = await backendRes.text();
        return res.status(backendRes.status).json({ error: text });
      }

      return res.status(204).end();
    } else if (req.method === "POST" && req.query.action === "test") {
      const backendRes = await fetch(`${BACKEND_URL}/webhooks/${id}/test`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!backendRes.ok) {
        const text = await backendRes.text();
        return res.status(backendRes.status).json({ error: text });
      }

      const data = await backendRes.json();
      return res.status(backendRes.status).json(data);
    } else {
      return res.status(405).end(); // Method Not Allowed
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}

