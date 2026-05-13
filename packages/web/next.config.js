/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://212.192.0.33:9100/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
