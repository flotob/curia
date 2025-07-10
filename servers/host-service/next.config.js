/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    // During builds, ignore TypeScript errors for faster development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    // During builds, ignore ESLint errors for faster development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  headers: async () => {
    return [
      {
        // Allow iframe embedding for all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 