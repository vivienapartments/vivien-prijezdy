import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SMTP přílohy (logo) musí být v serverless balíčku /api/zpracuj.
  outputFileTracingIncludes: {
    "/api/zpracuj": ["./assets/email/**/*"],
    "/api/store-wipe": ["./assets/email/**/*"],
  },
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_CAS: new Date().toISOString().slice(0, 16).replace("T", " "),
  },
};

export default nextConfig;
