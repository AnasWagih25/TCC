import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core'],
  outputFileTracingIncludes: {
    '/api/payment-proof': [
      './node_modules/tesseract.js/src/**/*',
      './node_modules/tesseract.js-core/**/*',
      './node_modules/@tesseract.js-data/eng/4.0.0/*',
      './node_modules/@tesseract.js-data/eng/package.json',
      './node_modules/@tesseract.js-data/ara/4.0.0/*',
      './node_modules/@tesseract.js-data/ara/package.json',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
