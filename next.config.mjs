/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon-light-32x32.png',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            // Adjust connect-src and img-src as external API domains are confirmed
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com", // unsafe-eval needed for Next.js dev; tighten in prod
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // wss: required for ZEGOCLOUD real-time signalling (accesshub/weblogger sockets on *.coolbcloud.com / coolzcloud.com / coolgcloud.com). https: does NOT cover the wss: scheme.
              "connect-src 'self' http://localhost:3000 https: wss: https://*.zego.im wss://*.zego.im https://*.coolzcloud.com wss://*.coolzcloud.com https://*.coolbcloud.com wss://*.coolbcloud.com https://*.coolgcloud.com wss://*.coolgcloud.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.output = {
      ...config.output,
      hashFunction: 'sha256',
    };
    return config;
  },
}

export default nextConfig
