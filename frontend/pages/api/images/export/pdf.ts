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

  try {
    const params = new URLSearchParams();
    if (req.query.riskLevel) {
      params.set("riskLevel", req.query.riskLevel as string);
    }
    if (req.query.namespace) {
      params.set("namespace", req.query.namespace as string);
    }

    const backendRes = await fetch(
      `${BACKEND_URL}/api/images/export/pdf?${params.toString()}`
    );

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return res.status(backendRes.status).json({ error: text });
    }

    const buffer = await backendRes.arrayBuffer();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="autopatch-report-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    return res.send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).json({ error: "Backend'e ulaşılamadı" });
  }
}

