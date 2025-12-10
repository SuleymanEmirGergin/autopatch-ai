import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { limit } = req.query;
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }

  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/api/images/top?${params.toString()}`
    );

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


