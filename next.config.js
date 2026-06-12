/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vinted.com' },
      { protocol: 'https', hostname: '**.vinted.de' },
      { protocol: 'https', hostname: 'i.ebayimg.com' },
      { protocol: 'https', hostname: '**.ebayimg.com' },
      { protocol: 'https', hostname: '**.kleinanzeigen.de' },
      { protocol: 'https', hostname: 'img.kleinanzeigen.de' },
    ],
  },
}
module.exports = nextConfig
