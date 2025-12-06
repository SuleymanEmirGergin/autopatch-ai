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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = req.url?.split("?")[1] || "";
    const backendRes = await fetch(
      `${BACKEND_URL}/audit-logs${query ? `?${query}` : ""}`,
      {
        headers: getHeaders(),
      }
    );

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e.message || "Backend'e ulaşılamadı" });
  }
}


