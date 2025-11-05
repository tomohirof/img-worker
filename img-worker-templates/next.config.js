/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages対応
  images: {
    unoptimized: true,
  },
  // 環境変数をクライアントサイドで利用可能に
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
  },
}

module.exports = nextConfig
