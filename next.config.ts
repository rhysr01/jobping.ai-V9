import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Add Vercel-specific optimizations
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer, webpack }) => {
    // Always exclude problematic modules
    config.externals = config.externals || [];
    
    if (!isServer) {
      // Client-side exclusions
      config.externals.push({
        'puppeteer': 'commonjs puppeteer',
        'puppeteer-extra': 'commonjs puppeteer-extra',
        'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
        'clone-deep': 'commonjs clone-deep',
        'merge-deep': 'commonjs merge-deep',
      });
    }

    // Ignore problematic dependencies for both client and server
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /jobteaser-puppeteer\.js$/,
        contextRegExp: /scrapers$/,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(puppeteer|puppeteer-extra|puppeteer-extra-plugin-stealth|clone-deep|merge-deep)$/,
      })
    );

    return config;
  },
};

export default nextConfig;