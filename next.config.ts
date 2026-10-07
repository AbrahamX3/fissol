import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	poweredByHeader: false,
	experimental: {
		// Next 16.4: run the React Compiler through Rust instead of Babel.
		turbopackRustReactCompiler: true,
		// Only compile client `import()` targets when the browser asks for them.
		turbopackLazyDynamicImports: true,
		// Reclaim stale Turbopack memory + disk cache during long dev sessions.
		turbopackGc: true,
	},
	async headers() {
		return [
			{
				// MapLibre worker + shared chunk copied into public/maplibre by
				// scripts/copy-maplibre-worker.mjs. Long-lived, revalidated cache
				// keeps them off the critical path on repeat visits.
				source: "/maplibre/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=604800, stale-while-revalidate=2592000",
					},
				],
			},
		];
	},
};

export default nextConfig;
