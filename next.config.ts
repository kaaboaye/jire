import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The default bottom-left spot covers the sidebar's "Nowy projekt" button.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
