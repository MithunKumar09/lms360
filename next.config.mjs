/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    // Suppress pg-native warning (it's optional and not needed for most use cases)
    config.resolve.alias = {
      ...config.resolve.alias,
      'pg-native': false,
    };
    
    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        puppeteer: false,
        bullmq: false,
        ioredis: false,
      };
    } else {
      // For server-side, mark these as externals to prevent bundling issues
      config.externals = config.externals || [];
      config.externals.push({
        puppeteer: 'commonjs puppeteer',
        bullmq: 'commonjs bullmq',
        ioredis: 'commonjs ioredis',
      });
    }
    
    return config;
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 public domains (pub-*.r2.dev)
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      // Custom domain for R2 (if configured)
      ...(process.env.R2_CUSTOM_DOMAIN
        ? [
            {
              protocol: 'https',
              hostname: process.env.R2_CUSTOM_DOMAIN.replace(/^https?:\/\//, '').split('/')[0],
            },
          ]
        : []),
      // R2 Public URL (if custom domain not set)
      ...(process.env.R2_PUBLIC_URL && !process.env.R2_CUSTOM_DOMAIN
        ? [
            {
              protocol: 'https',
              hostname: process.env.R2_PUBLIC_URL.replace(/^https?:\/\//, '').split('/')[0],
            },
          ]
        : []),
      // Legacy: CloudFront domains (for backward compatibility)
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      // Legacy: S3 bucket domains (for backward compatibility)
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
