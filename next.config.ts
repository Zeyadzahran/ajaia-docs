import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page depends on the signed-in user, so static prerendering/caching
  // buys nothing here; render on each request instead.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
