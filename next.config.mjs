/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" }, // team logos
      { protocol: "https", hostname: "static.www.nfl.com" }, // player headshots
    ],
  },
};

export default nextConfig;
