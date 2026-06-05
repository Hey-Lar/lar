/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @lar/* workspaces ship TypeScript source (main → src/index.ts), so Next
  // must transpile them rather than expect pre-built JS.
  transpilePackages: [
    '@lar/shared',
    '@lar/ui',
    '@lar/connector-music',
    '@lar/connector-finance',
    '@lar/connector-podcasts',
  ],
};

export default nextConfig;
