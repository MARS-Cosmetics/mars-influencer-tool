import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Environment Config Tests
// ============================================================

const PROJECT_ROOT = path.resolve(__dirname, "../../../");

describe("Environment Configuration", () => {
  // --------------------------------------------------------
  // .env.example — Template Completeness
  // --------------------------------------------------------
  describe(".env.example template", () => {
    let exampleContent: string;

    beforeEach(() => {
      exampleContent = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.example"),
        "utf-8"
      );
    });

    it("should exist", () => {
      expect(
        fs.existsSync(path.join(PROJECT_ROOT, ".env.example"))
      ).toBe(true);
    });

    it("should contain NEXT_PUBLIC_APP_ENV", () => {
      expect(exampleContent).toContain("NEXT_PUBLIC_APP_ENV");
    });

    it("should contain DATABASE_URL", () => {
      expect(exampleContent).toContain("DATABASE_URL");
    });

    it("should contain NEXTAUTH_SECRET", () => {
      expect(exampleContent).toContain("NEXTAUTH_SECRET");
    });

    it("should contain NEXTAUTH_URL", () => {
      expect(exampleContent).toContain("NEXTAUTH_URL");
    });

    it("should contain SHOPIFY_STORE_URL", () => {
      expect(exampleContent).toContain("SHOPIFY_STORE_URL");
    });

    it("should contain SHOPIFY_ACCESS_TOKEN", () => {
      expect(exampleContent).toContain("SHOPIFY_ACCESS_TOKEN");
    });

    it("should contain SHOPIFY_API_KEY", () => {
      expect(exampleContent).toContain("SHOPIFY_API_KEY");
    });

    it("should contain SHOPIFY_API_SECRET", () => {
      expect(exampleContent).toContain("SHOPIFY_API_SECRET");
    });

    it("should contain SHOPIFY_API_VERSION", () => {
      expect(exampleContent).toContain("SHOPIFY_API_VERSION");
    });

    it("should contain CULTUREX_API_KEY", () => {
      expect(exampleContent).toContain("CULTUREX_API_KEY");
    });

    it("should contain META_APP_ID", () => {
      expect(exampleContent).toContain("META_APP_ID");
    });

    it("should contain RAPIDAPI_KEY", () => {
      expect(exampleContent).toContain("RAPIDAPI_KEY");
    });

    it("should contain BC_TENANT_ID (Business Central)", () => {
      expect(exampleContent).toContain("BC_TENANT_ID");
    });

    it("should NOT contain actual API keys or secrets", () => {
      // Shopify dev key pattern
      expect(exampleContent).not.toMatch(/shpat_[a-f0-9]{32}/);
      // Generic secret patterns
      expect(exampleContent).not.toMatch(/sk_live_/);
      expect(exampleContent).not.toMatch(/sk_test_/);
    });
  });

  // --------------------------------------------------------
  // .gitignore — Env files are protected
  // --------------------------------------------------------
  describe(".gitignore protects env files", () => {
    let gitignoreContent: string;

    beforeEach(() => {
      gitignoreContent = fs.readFileSync(
        path.join(PROJECT_ROOT, ".gitignore"),
        "utf-8"
      );
    });

    it("should ignore .env files", () => {
      expect(gitignoreContent).toContain(".env");
    });

    it("should ignore .env* pattern (covers .env.development, .env.uat, .env.production)", () => {
      expect(gitignoreContent).toMatch(/\.env\*/);
    });

    it("should ignore generated prisma files", () => {
      expect(gitignoreContent).toContain("generated/prisma");
    });
  });

  // --------------------------------------------------------
  // src/lib/env.ts — Config Module
  // --------------------------------------------------------
  describe("env.ts configuration module", () => {
    let envModule: string;

    beforeEach(() => {
      envModule = fs.readFileSync(
        path.join(PROJECT_ROOT, "src/lib/env.ts"),
        "utf-8"
      );
    });

    it("should define AppEnvironment type with 3 environments", () => {
      expect(envModule).toContain("development");
      expect(envModule).toContain("uat");
      expect(envModule).toContain("production");
    });

    it("should export IS_DEV, IS_UAT, IS_PROD flags", () => {
      expect(envModule).toContain("IS_DEV");
      expect(envModule).toContain("IS_UAT");
      expect(envModule).toContain("IS_PROD");
    });

    it("should have ENV_CONFIG for all 3 environments", () => {
      expect(envModule).toMatch(/ENV_CONFIG\s*=\s*\{/);
      expect(envModule).toContain("development:");
      expect(envModule).toContain("uat:");
      expect(envModule).toContain("production:");
    });

    it("should disable dev tools in production", () => {
      // Find the production config block and verify showDevTools is false
      const prodMatch = envModule.match(/production:\s*\{[\s\S]*?showDevTools:\s*(true|false)/);
      expect(prodMatch).toBeTruthy();
      expect(prodMatch![1]).toBe("false");
    });

    it("should disable seed data in production", () => {
      const prodMatch = envModule.match(/production:\s*\{[\s\S]*?allowSeedData:\s*(true|false)/);
      expect(prodMatch).toBeTruthy();
      expect(prodMatch![1]).toBe("false");
    });

    it("should disable DB reset in production", () => {
      const prodMatch = envModule.match(/production:\s*\{[\s\S]*?allowDbReset:\s*(true|false)/);
      expect(prodMatch).toBeTruthy();
      expect(prodMatch![1]).toBe("false");
    });

    it("should disable DB reset in UAT", () => {
      const uatMatch = envModule.match(/uat:\s*\{[\s\S]*?allowDbReset:\s*(true|false)/);
      expect(uatMatch).toBeTruthy();
      expect(uatMatch![1]).toBe("false");
    });

    it("should disable mock APIs in production", () => {
      const prodMatch = envModule.match(/production:\s*\{[\s\S]*?mockExternalApis:\s*(true|false)/);
      expect(prodMatch).toBeTruthy();
      expect(prodMatch![1]).toBe("false");
    });

    it("should have a validateEnvVars function", () => {
      expect(envModule).toContain("validateEnvVars");
    });

    it("should require DATABASE_URL in all environments", () => {
      expect(envModule).toContain('"DATABASE_URL"');
    });

    it("should require NEXTAUTH_SECRET in all environments", () => {
      expect(envModule).toContain('"NEXTAUTH_SECRET"');
    });

    it("should require SHOPIFY keys in production", () => {
      expect(envModule).toContain('"SHOPIFY_STORE_URL"');
      expect(envModule).toContain('"SHOPIFY_ACCESS_TOKEN"');
    });
  });

  // --------------------------------------------------------
  // Per-environment env files exist
  // --------------------------------------------------------
  describe("Environment-specific files", () => {
    it(".env.development should exist", () => {
      expect(
        fs.existsSync(path.join(PROJECT_ROOT, ".env.development"))
      ).toBe(true);
    });

    it(".env.uat should exist", () => {
      expect(
        fs.existsSync(path.join(PROJECT_ROOT, ".env.uat"))
      ).toBe(true);
    });

    it(".env.production should exist", () => {
      expect(
        fs.existsSync(path.join(PROJECT_ROOT, ".env.production"))
      ).toBe(true);
    });
  });

  // --------------------------------------------------------
  // Each env file sets NEXT_PUBLIC_APP_ENV correctly
  // --------------------------------------------------------
  describe("NEXT_PUBLIC_APP_ENV is set correctly per file", () => {
    it(".env.development sets APP_ENV to development", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.development"),
        "utf-8"
      );
      expect(content).toMatch(/NEXT_PUBLIC_APP_ENV\s*=\s*development/);
    });

    it(".env.uat sets APP_ENV to uat", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.uat"),
        "utf-8"
      );
      expect(content).toMatch(/NEXT_PUBLIC_APP_ENV\s*=\s*uat/);
    });

    it(".env.production sets APP_ENV to production", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.production"),
        "utf-8"
      );
      expect(content).toMatch(/NEXT_PUBLIC_APP_ENV\s*=\s*production/);
    });
  });

  // --------------------------------------------------------
  // Each env file has its own DATABASE_URL
  // --------------------------------------------------------
  describe("Each environment has separate DATABASE_URL", () => {
    it(".env.development has DATABASE_URL", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.development"),
        "utf-8"
      );
      expect(content).toContain("DATABASE_URL");
    });

    it(".env.uat has DATABASE_URL", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.uat"),
        "utf-8"
      );
      expect(content).toContain("DATABASE_URL");
    });

    it(".env.production has DATABASE_URL", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.production"),
        "utf-8"
      );
      expect(content).toContain("DATABASE_URL");
    });

    it("dev and production should NOT share the same database", () => {
      const devContent = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.development"),
        "utf-8"
      );
      const prodContent = fs.readFileSync(
        path.join(PROJECT_ROOT, ".env.production"),
        "utf-8"
      );

      const devDb = devContent.match(/DATABASE_URL\s*=\s*(.+)/)?.[1]?.trim();
      const prodDb = prodContent.match(/DATABASE_URL\s*=\s*(.+)/)?.[1]?.trim();

      expect(devDb).toBeDefined();
      expect(prodDb).toBeDefined();
      expect(devDb).not.toBe(prodDb);
    });
  });

  // --------------------------------------------------------
  // Package.json scripts
  // --------------------------------------------------------
  describe("package.json environment scripts", () => {
    let pkg: Record<string, unknown>;

    beforeEach(() => {
      pkg = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8")
      );
    });

    it("should have db:seed script", () => {
      expect((pkg.scripts as Record<string, string>)["db:seed"]).toBeDefined();
    });

    it("should have db:seed:fresh script", () => {
      expect((pkg.scripts as Record<string, string>)["db:seed:fresh"]).toBeDefined();
    });

    it("should have dev:uat script", () => {
      expect((pkg.scripts as Record<string, string>)["dev:uat"]).toBeDefined();
    });

    it("db:seed should use idempotent seed", () => {
      expect((pkg.scripts as Record<string, string>)["db:seed"]).toContain(
        "seed-idempotent"
      );
    });

    it("dev:uat should set APP_ENV to uat", () => {
      expect((pkg.scripts as Record<string, string>)["dev:uat"]).toContain(
        "NEXT_PUBLIC_APP_ENV=uat"
      );
    });

    it("should have build:prod script", () => {
      expect((pkg.scripts as Record<string, string>)["build:prod"]).toBeDefined();
    });

    it("build:prod should set APP_ENV to production", () => {
      expect((pkg.scripts as Record<string, string>)["build:prod"]).toContain(
        "NEXT_PUBLIC_APP_ENV=production"
      );
    });
  });

  // --------------------------------------------------------
  // Idempotent seed script exists
  // --------------------------------------------------------
  describe("Idempotent seed script", () => {
    let seedContent: string;

    beforeEach(() => {
      seedContent = fs.readFileSync(
        path.join(PROJECT_ROOT, "prisma/seed-idempotent.ts"),
        "utf-8"
      );
    });

    it("should exist", () => {
      expect(
        fs.existsSync(path.join(PROJECT_ROOT, "prisma/seed-idempotent.ts"))
      ).toBe(true);
    });

    it("should use upsert for brands", () => {
      expect(seedContent).toContain("brand.upsert");
    });

    it("should use upsert for users", () => {
      expect(seedContent).toContain("user.upsert");
    });

    it("should use findFirst + create/update for products (SKU not unique)", () => {
      expect(seedContent).toContain("product.findFirst");
      expect(seedContent).toContain("product.update");
      expect(seedContent).toContain("product.create");
    });

    it("should use upsert for payment terms", () => {
      expect(seedContent).toContain("paymentTerm.upsert");
    });

    it("should check APP_ENV before seeding test data", () => {
      expect(seedContent).toContain("production");
      expect(seedContent).toMatch(/skip.*production|production.*skip/i);
    });

    it("should check if influencer exists before creating", () => {
      expect(seedContent).toContain("findFirst");
    });
  });
});
