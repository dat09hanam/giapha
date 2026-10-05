import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // The dev-only "N" badge sits over the phone's bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
