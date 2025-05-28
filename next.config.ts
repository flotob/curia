import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app.cg',
        port: '',
        pathname: '/files/**',
      },
      {
        hostname: '**',
      },
    ],
  },
};


export default nextConfig;
