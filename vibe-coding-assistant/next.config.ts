import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for iframe embedding
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Configure trailing slash and asset prefix for iframe compatibility
  trailingSlash: true,
  
  // Security headers for iframe embedding
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Allow embedding from any origin for the widget
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: wss: ws: http: https:;",
          },
        ],
      },
    ];
  },
  
  // Disable server-side features for static export
  experimental: {
    esmExternals: true,
  },
};

export default nextConfig;
