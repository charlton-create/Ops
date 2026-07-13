import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Local dev admin account (no DB required)
        if (
          credentials.email === "admin" &&
          credentials.password === "admin"
        ) {
          return {
            id: "0",
            name: "Admin",
            email: "admin@cat-i.ai",
            role: "admin",
            teamMemberId: null,
            color: "#A02195",
          };
        }

        try {
          const user = await prisma.appUser.findUnique({
            where: { email: credentials.email as string },
            include: { teamMember: true },
          });

          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            teamMemberId: user.teamMemberId,
            color: user.teamMember?.color ?? "#6B7280",
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.teamMemberId = (user as any).teamMemberId;
        token.color = (user as any).color;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).teamMemberId = token.teamMemberId;
        (session.user as any).color = token.color;
      }
      return session;
    },
  },
});
