/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "",
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // instascan uses 'fs' internally (ZXing Emscripten build)
      // Provide empty module for browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
