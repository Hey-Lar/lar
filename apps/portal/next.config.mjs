/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @lar/* workspaces ship TypeScript source (main → src/index.ts), so Next
  // must transpile them rather than expect pre-built JS.
  transpilePackages: [
    '@lar/crypto',
    '@lar/shared',
    '@lar/ui',
    '@lar/connector-books',
    '@lar/connector-music',
    '@lar/connector-finance',
    '@lar/connector-podcasts',
  ],
  webpack(config) {
    // @lar/crypto uses ESM-style `.js` extension imports on `.ts` source files
    // (standard Node 20+ ESM, but webpack needs explicit aliasing to resolve them).
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
