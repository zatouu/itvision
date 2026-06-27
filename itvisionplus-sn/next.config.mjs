/** @type {import('next').NextConfig} */
const nextConfig = {
  // Corporate site - uses shared backend API
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://itvisionplus.sn',
  },
}

export default nextConfig
