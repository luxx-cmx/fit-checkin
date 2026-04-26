/** @type {import('next').NextConfig} */
const isGithubPages = process.env.DEPLOY_TARGET === 'ghpages'

const nextConfig = isGithubPages
  ? {
      output: 'export',
      basePath: '/fit-checkin',
      images: { unoptimized: true },
    }
  : {
      output: 'standalone',
    }

export default nextConfig
