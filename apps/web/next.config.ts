import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 * CSP allows Razorpay checkout + Cloudinary media + Pusher websockets.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@community-finance/shared'],
  serverExternalPackages: ['pino', 'pdfkit', 'exceljs', 'mongoose'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  poweredByHeader: false,
};

export default nextConfig;
