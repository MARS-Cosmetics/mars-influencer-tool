import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    brandId: string | null;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      brandId: string | null;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    brandId: string | null;
    mustChangePassword: boolean;
  }
}
