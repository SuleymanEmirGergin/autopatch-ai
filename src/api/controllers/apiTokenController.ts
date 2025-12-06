import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiTokenModel } from "../../persistence/apiToken.model";

// Token değeri yalnızca oluşturma anında düz metin olarak döndürülür.
// Veritabanında da düz metin tutuluyor; istenirse ileride hash'e çevrilebilir.

export class ApiTokenController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await ApiTokenModel.find().sort({ createdAt: -1 }).exec();
      res.json(
        tokens.map((t) => ({
          id: t._id.toString(),
          label: t.label,
          role: t.role,
          scopes: t.scopes,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
          createdBy: t.createdBy,
          // Token değeri listede gösterilmez
        }))
      );
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { label, role, expiresAt } = req.body as {
        label?: string;
        role?: "admin" | "readonly";
        expiresAt?: string | null;
      };

      if (!label) {
        return res.status(400).json({ error: "label is required" });
      }

      const tokenValue = crypto.randomBytes(24).toString("hex");

      const doc = await ApiTokenModel.create({
        token: tokenValue,
        label,
        role: role === "admin" ? "admin" : "readonly",
        scopes: [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: null,
      });

      res.status(201).json({
        id: doc._id.toString(),
        token: tokenValue,
        label: doc.label,
        role: doc.role,
        scopes: doc.scopes,
        expiresAt: doc.expiresAt,
        createdAt: doc.createdAt,
      });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await ApiTokenModel.findByIdAndDelete(id).exec();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}


