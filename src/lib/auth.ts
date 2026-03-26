import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();

        // Validate email domain against allowed domains
        const domain = email.split("@")[1];
        if (!domain) return null;

        const allowedDomains = await prisma.allowedDomain.findMany({
          where: { isActive: true },
          select: { domain: true },
        });

        // If there are allowed domains configured, enforce them
        if (allowedDomains.length > 0) {
          const isAllowed = allowedDomains.some(
            (d) => d.domain.toLowerCase() === domain.toLowerCase()
          );
          if (!isAllowed) {
            throw new Error(`Email domain @${domain} is not permitted. Contact your administrator.`);
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          brandId: user.brandId,
        };
      },
    }),
  ],
});
