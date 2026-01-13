import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Force unique build ID to prevent cache issues during TDZ fix
	generateBuildId: async () => {
		return `build-${Date.now()}`;
	},
	// Turbopack configuration with path aliases
	experimental: {
		optimizePackageImports: ["framer-motion"],
	},
	// Remove console logs in production (keep errors and warnings)
	compiler: {
		removeConsole:
			process.env.NODE_ENV === "production"
				? {
						exclude: ["error", "warn"], // Keep errors and warnings for production debugging
					}
				: false,
	},
	// Mark Stripe as server-side external package (required for API routes)
	serverExternalPackages: ["stripe"],
	images: {
		formats: ["image/webp", "image/avif"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60,
		dangerouslyAllowSVG: true,
		contentDispositionType: "attachment",
	},
	// Add Vercel-specific optimizations
	compress: true,
	poweredByHeader: false,

	// Security headers
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					// HTTPS enforcement in production
					...(process.env.NODE_ENV === "production"
						? [
								{
									key: "Strict-Transport-Security",
									value: "max-age=31536000; includeSubDomains; preload",
								},
							]
						: []),
				],
			},
		];
	},

	// Redirect HTTP to HTTPS in production
	async redirects() {
		if (process.env.NODE_ENV === "production") {
			return [
				{
					source: "/(.*)",
					has: [
						{
							type: "header",
							key: "x-forwarded-proto",
							value: "http",
						},
					],
					destination: "https://getjobping.com/:path*",
					permanent: true,
				},
			];
		}
		return [];
	},
	webpack: (config, { isServer, webpack }) => {
		// Force webpack aliases for Vercel compatibility
		config.resolve = config.resolve || {};
		// Ensure modules are resolved correctly
		config.resolve.modules = [
			...(config.resolve.modules || []),
			require('path').resolve(process.cwd()),
		];
		// Force alias resolution
		config.resolve.alias = {
			...config.resolve.alias,
			'@': require('path').resolve(process.cwd()),
			'@/utils': require('path').resolve(process.cwd(), 'utils'),
			'@/lib': require('path').resolve(process.cwd(), 'lib'),
			'@/components': require('path').resolve(process.cwd(), 'components'),
			'@/app': require('path').resolve(process.cwd(), 'app'),
		};

		// Always exclude problematic modules
		config.externals = config.externals || [];

		if (isServer) {
			// Server-side: Keep Stripe as external (it's a Node.js module)
			// This ensures it's not bundled and works correctly in serverless environments
			config.externals.push("stripe");
		} else {
			// Client-side exclusions
			config.externals.push({
				puppeteer: "commonjs puppeteer",
				"puppeteer-extra": "commonjs puppeteer-extra",
				"puppeteer-extra-plugin-stealth":
					"commonjs puppeteer-extra-plugin-stealth",
				"clone-deep": "commonjs clone-deep",
				"merge-deep": "commonjs merge-deep",
			});
		}

		// Ignore problematic dependencies for both client and server
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /jobteaser-puppeteer\.js$/,
				contextRegExp: /scrapers$/,
			}),
		);

		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp:
					/^(puppeteer|puppeteer-extra|puppeteer-extra-plugin-stealth|clone-deep|merge-deep)$/,
			}),
		);

		return config;
	},
};

export default withSentryConfig(nextConfig, {
	// For all available options, see:
	// https://github.com/getsentry/sentry-webpack-plugin#options

	// Suppresses source map uploading logs during build
	silent: true,
	// Vercel integration will automatically detect org and project
	// These are optional when using Vercel integration
	org: process.env.SENTRY_ORG || "jobping",
	project: process.env.SENTRY_PROJECT || "javascript-nextjs",
	// Vercel integration handles auth token automatically
	authToken: process.env.SENTRY_AUTH_TOKEN,
	// Automatically upload source maps (Vercel integration handles this)
	widenClientFileUpload: true,
});
