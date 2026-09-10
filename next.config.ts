import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/gaza-change-atlas-scaffold",
  assetPrefix: "/gaza-change-atlas-scaffold/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;