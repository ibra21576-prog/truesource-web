/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts (internal scheduler on always-on hosts)
  experimental: { instrumentationHook: true },
  // undici (proxy support) is node-only. Keep it out of the Edge bundle so the
  // instrumentation/edge compile doesn't choke on its node: imports — it is never
  // invoked on the Edge runtime anyway.
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) config.externals.push('undici')
    }
    return config
  },
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
