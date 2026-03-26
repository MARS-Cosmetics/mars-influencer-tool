import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

// Cache allowed domains for 5 minutes to avoid hitting DB on every login
let cachedDomains: { domains: string[]; cachedAt: number } | null = null;
const DOMAIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAllowedDomains(): Promise<string[]> {
  const now = Date.now();
  if (cachedDomains && now - cachedDomains.cachedAt < DOMAIN_CACHE_TTL) {
    return cachedDomains.domains;
  }

  const results = await prisma.allowedDomain.findMany({
    where: { isActive: true },
    select: { domain: true },
  });

  const domains = results.map((d) => d.domain.toLowerCase());
  cachedDomains = { domains, cachedAt: now };
  return domains;
}

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
        const domain = email.split("@")[1];
        if (!domain) return null;

        // Run domain check and user lookup in parallel
        const [allowedDomains, user] = await Promise.all([
          getAllowedDomains(),
          prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              brandId: true,
              isActive: true,
              mustChangePassword: true,
            },
          }),
        ]);

        // Check domain
        if (allowedDomains.length > 0) {
          if (!allowedDomains.includes(domain.toLowerCase())) {
            throw new Error(
              `Email domain @${domain} is not permitted. Contact your administrator.`
            );
          }
        }

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
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
