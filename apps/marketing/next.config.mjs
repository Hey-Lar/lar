/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @lar/ui ships TypeScript source (main → src/index.ts), so Next has to
  // transpile it rather than expect pre-built JS.
  transpilePackages: ['@lar/ui'],
};

export default nextConfig;
