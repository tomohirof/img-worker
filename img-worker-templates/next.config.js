/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages対応
  images: {
    unoptimized: true,
  },
  // 環境変数をクライアントサイドで利用可能に
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ogp-worker.tomohirof.workers.dev',
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY || 'cwe8yxq4mtc-HCZ9ebm',
  },
}

module.exports = nextConfig
