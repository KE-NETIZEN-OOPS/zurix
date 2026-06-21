/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'www.eporner.com' },
      { protocol: 'https', hostname: '**.chaturbate.com' },
    ],
  },
}

export default nextConfig
