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
        // Keep SAMEORIGIN for all routes except /embed (which gets no headers = allows embedding)
        source: '/((?!embed).*)',
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