import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.brandId = (user as { brandId: string | null }).brandId;
        token.mustChangePassword = (
          user as { mustChangePassword: boolean }
        ).mustChangePassword;
      }
      // Allow updating the token when session is refreshed (after password change)
      if (trigger === "update") {
        token.mustChangePassword = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { brandId: string | null }).brandId =
          token.brandId as string | null;
        (session.user as { mustChangePassword: boolean }).mustChangePassword =
          token.mustChangePassword as boolean;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isChangePassword = nextUrl.pathname.startsWith("/change-password");

      if (isApiAuth) return true;
      if (isLoginPage) return true;
      if (isChangePassword && isLoggedIn) return true;
      if (!isLoggedIn) return false;

      // Check if user must change password
      const mustChange = (
        auth?.user as { mustChangePassword?: boolean } | undefined
      )?.mustChangePassword;
      if (mustChange && !isChangePassword) {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

      return true;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
  },
};
