/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Optimize for production Docker builds
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
};

module.exports = nextConfig;
