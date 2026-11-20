// src/lib/auth.ts
// Konfigurasi NextAuth (Credentials provider) untuk Astoria Collab

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { clientIp, LIMITS, rateLimit } from "./rate-limit";
import { emailConfigured, sendEmail } from "./email";
import { newDeviceEmail } from "./security-email";
import { sessionMaxAgeSeconds } from "./session-policy";

export const authOptions: NextAuthOptions = {
  // Sesi JWT berlaku maksimal 12 jam. Ini batas absolut, bukan diperpanjang
  // setiap request, sehingga perangkat bersama tidak tertinggal dalam keadaan
  // login ketika pengguna lupa logout. Bisa diubah lewat SESSION_MAX_HOURS.
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAgeSeconds(),
    updateAge: sessionMaxAgeSeconds(),
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        deviceId: { label: "deviceId", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const ip = clientIp(req?.headers as Record<string, string | undefined> | undefined);

        // Batas per IP mencegah credential stuffing lintas banyak akun.
        const ipLimit = await rateLimit(
          "login-ip",
          ip,
          LIMITS.loginIp.max,
          LIMITS.loginIp.windowSec,
          { failClosed: true }
        );
        if (!ipLimit.ok) return null;

        const limit = await rateLimit(
          "login",
          `${ip}:${email}`,
          LIMITS.login.max,
          LIMITS.login.windowSec,
          { failClosed: true }
        );
        if (!limit.ok) return null;

        const user = await db.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Satu akun hanya boleh punya satu sesi aktif. Login baru mengakhiri sesi lama.
        const sessionId = randomUUID();
        const device =
          (req?.headers?.["user-agent"] as string | undefined)?.slice(0, 200) ??
          "Perangkat tidak dikenal";
        const deviceId =
          typeof credentials.deviceId === "string" && credentials.deviceId.trim()
            ? credentials.deviceId.trim().slice(0, 64)
            : null;
        const conflict = Boolean(user.activeSessionId && user.activeSessionId !== sessionId);
        const newDevice = Boolean(
          deviceId && user.activeDeviceId && user.activeDeviceId !== deviceId
        );

        await db.user.update({
          where: { id: user.id },
          data: {
            activeSessionId: sessionId,
            activeSessionAt: new Date(),
            activeDevice: device,
            ...(deviceId ? { activeDeviceId: deviceId } : {}),
            ...(conflict
              ? {
                  sessionConflictCount: { increment: 1 },
                  sessionConflictAt: new Date(),
                }
              : {}),
          },
        });

        if (newDevice && user.email && emailConfigured()) {
          void sendEmail({
            to: user.email,
            ...newDeviceEmail({
              name: user.name,
              device,
              time: new Date(),
            }),
          }).catch(() => null);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionId,
          deviceId: deviceId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "mahasiswa";
        token.name = user.name;
        token.sessionId = (user as { sessionId?: string }).sessionId;
        token.deviceId = (user as { deviceId?: string }).deviceId;
      }
      if (trigger === "update") {
        const nextName = (session as { name?: unknown } | null)?.name;
        if (typeof nextName === "string" && nextName.trim()) {
          token.name = nextName.trim().slice(0, 80);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.sessionId = token.sessionId as string | undefined;
        session.user.deviceId = token.deviceId as string | undefined;
      }
      return session;
    },
  },
};
