/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export, same as SmartHub (PRD 6.1). Output goes to `out/`.
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  images: {
    // Static export has no image optimization server.
    unoptimized: true,
  },
};

export default nextConfig;
