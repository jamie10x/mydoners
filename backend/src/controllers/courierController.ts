import type { Request, Response } from "express";
import { courierLocationService } from "../services/courierLocationService";
import { courierLocationSchema } from "../dto/courier.dto";
import { ForbiddenError, ValidationError } from "../errors/AppError";

function requireCourierBot(req: Request): void {
  if (!(req.actor?.type === "bot" && req.actor.bot === "courier")) {
    throw new ForbiddenError("Faqat kuryer boti joylashuv yubora oladi");
  }
}

export const courierController = {
  async reportLocation(req: Request, res: Response) {
    requireCourierBot(req);
    const parsed = courierLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Joylashuv ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    }
    await courierLocationService.report(parsed.data);
    res.status(204).send();
  },
};
