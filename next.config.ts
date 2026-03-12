import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "http://192.168.*",
    "http://10.*",
    "http://172.16.*",
    "http://localhost:*",
  ],
};

export default nextConfig;
