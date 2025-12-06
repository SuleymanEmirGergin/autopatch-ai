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
    return res.status(400).json({ error: "Rule ID is required" });
  }

  try {
    let backendRes: Response;

    if (req.method === "DELETE") {
      backendRes = await fetch(`${BACKEND_URL}/custom-rules/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    } else if (req.method === "PUT") {
      backendRes = await fetch(`${BACKEND_URL}/custom-rules/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(req.body),
      });
    } else if (req.method === "POST" && req.url?.includes("/toggle")) {
      backendRes = await fetch(`${BACKEND_URL}/custom-rules/${id}/toggle`, {
        method: "POST",
        headers: getHeaders(),
      });
    } else {
      backendRes = await fetch(`${BACKEND_URL}/custom-rules/${id}`, {
        method: "GET",
        headers: getHeaders(),
      });
    }

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    if (req.method === "DELETE") {
      return res.status(204).end();
    }

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}

