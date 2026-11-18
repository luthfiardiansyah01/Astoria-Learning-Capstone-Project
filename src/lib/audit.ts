// Pencatatan aksi admin untuk audit. Kegagalan menulis log tidak boleh
// menggagalkan aksi utama, tetapi tetap dicatat di logger.
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { logger } from "./logger";

export interface AdminAuditInput {
  adminId: string;
  action: string;
  targetType: "payment" | "document" | "user";
  targetId?: string | null;
  detail?: Prisma.InputJsonValue;
}

export async function logAdminAction(input: AdminAuditInput) {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        detail: input.detail,
      },
    });
  } catch (e) {
    logger.error("[audit] gagal mencatat aksi admin", { error: e, action: input.action });
  }
}
