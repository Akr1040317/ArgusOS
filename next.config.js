/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Allow Firebase Google Auth popups to poll window.closed
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
