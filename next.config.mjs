/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // dev 서버 자체에 LAN/외부 IP 로 접속할 때 _next/webpack-hmr 등 dev 리소스를 허용.
  // 운영 빌드(next build)에는 영향 없음.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.*",
    "192.168.1.*",
    "10.*",
    "172.16.*",
  ],
}

export default nextConfig
