import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { isLockedOut, recordLoginAttempt } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Get IP for rate limiting
        let ip = "unknown";
        try {
          const hdrs = await headers();
          ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
            || hdrs.get("x-real-ip")
            || "unknown";
        } catch {
          // headers() may not be available in all contexts
        }

        // Check lockout by email and IP
        const emailKey = `email:${email}`;
        const ipKey = `ip:${ip}`;

        const [emailLocked, ipLocked] = await Promise.all([
          isLockedOut(emailKey),
          ip !== "unknown" ? isLockedOut(ipKey) : Promise.resolve(false),
        ]);

        if (emailLocked || ipLocked) {
          console.warn(
            `[auth] Login blocked: email=${email} ip=${ip} emailLocked=${emailLocked} ipLocked=${ipLocked}`
          );
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // Record failure but do not reveal whether the email exists
          await Promise.all([
            recordLoginAttempt(emailKey, false),
            ip !== "unknown" ? recordLoginAttempt(ipKey, false) : Promise.resolve(),
          ]);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          await Promise.all([
            recordLoginAttempt(emailKey, false),
            ip !== "unknown" ? recordLoginAttempt(ipKey, false) : Promise.resolve(),
          ]);
          return null;
        }

        // Record successful login (resets lockout window)
        await Promise.all([
          recordLoginAttempt(emailKey, true),
          ip !== "unknown" ? recordLoginAttempt(ipKey, true) : Promise.resolve(),
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
