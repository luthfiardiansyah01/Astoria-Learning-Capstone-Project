// src/lib/auth.ts
// Konfigurasi NextAuth (Credentials provider) untuk Astoria Collab

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { clientIp, LIMITS, rateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "mahasiswa";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
