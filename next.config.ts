import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SMTP přílohy (logo) musí být v serverless balíčku /api/zpracuj.
  outputFileTracingIncludes: {
    "/api/zpracuj": ["./assets/email/**/*"],
    "/api/store-wipe": ["./assets/email/**/*"],
  },
};

export default nextConfig;
