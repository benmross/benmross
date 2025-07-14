/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.placeholder.com', 'img.icons8.com'],
    unoptimized: true,
  },
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable static exports for better performance
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'dist',
}

module.exports = nextConfig