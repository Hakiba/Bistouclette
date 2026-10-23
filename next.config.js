/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces the deployable static site directly in ./out.
  // The browser calls the separate Passenger app under /api.
  output: "export",
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
