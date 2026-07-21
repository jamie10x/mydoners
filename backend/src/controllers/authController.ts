import type { Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/authService";
import { ValidationError } from "../errors/AppError";

const loginSchema = z.object({ initData: z.string().min(1) });

export const authController = {
  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("initData is required");

    const result = await authService.loginWithTelegram(parsed.data.initData);
    res.json(result);
  },
};
