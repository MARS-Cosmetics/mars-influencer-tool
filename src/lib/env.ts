/**
 * Environment configuration for MARS Influencer Tool
 *
 * Environments:
 *   development — local dev, mock APIs, dev Shopify store
 *   uat         — staging/testing, separate DB + Shopify store
 *   production  — live, real data, production Shopify
 */

export type AppEnvironment = "development" | "uat" | "production";

export const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || "development") as AppEnvironment;

export const IS_DEV = APP_ENV === "development";
export const IS_UAT = APP_ENV === "uat";
export const IS_PROD = APP_ENV === "production";

export const ENV_CONFIG = {
  development: {
    label: "Development",
    color: "bg-green-500",
    badgeColor: "bg-green-100 text-green-800",
    showDevTools: true,
    allowSeedData: true,
    allowDbReset: true,
    mockExternalApis: true, // Use mocks when API keys not set
  },
  uat: {
    label: "UAT",
    color: "bg-yellow-500",
    badgeColor: "bg-yellow-100 text-yellow-800",
    showDevTools: true,
    allowSeedData: true,
    allowDbReset: false,
    mockExternalApis: false,
  },
  production: {
    label: "Production",
    color: "bg-red-500",
    badgeColor: "bg-red-100 text-red-800",
    showDevTools: false,
    allowSeedData: false,
    allowDbReset: false,
    mockExternalApis: false,
  },
} as const;

export const CURRENT_ENV = ENV_CONFIG[APP_ENV];

/**
 * Check if a feature flag is enabled for the current environment
 */
export function isFeatureEnabled(feature: keyof typeof ENV_CONFIG.development): boolean {
  return CURRENT_ENV[feature] as boolean;
}

/**
 * Get a human-readable environment label
 */
export function getEnvLabel(): string {
  return CURRENT_ENV.label;
}

/**
 * Validate that all required env vars are set
 * Call this at startup to fail fast
 */
export function validateEnvVars(): { valid: boolean; missing: string[] } {
  const required = ["DATABASE_URL", "NEXTAUTH_SECRET"];

  // Production requires all external API keys
  const prodRequired = [
    "SHOPIFY_STORE_URL",
    "SHOPIFY_ACCESS_TOKEN",
  ];

  const allRequired = IS_PROD ? [...required, ...prodRequired] : required;
  const missing = allRequired.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
