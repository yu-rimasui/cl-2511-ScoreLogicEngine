/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowDevOrigins: ["janiyah-prelatic-anopisthographically.ngrok-free.dev"],
  },
}

export default nextConfig