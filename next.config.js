/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'app.jetbrokers.io' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@sparticuz/chromium', 'puppeteer-core'],
  },
}

module.exports = nextConfig
