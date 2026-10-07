// Copies the MapLibre GL JS v6 worker and its shared chunk into public/ so the
// bundler-independent worker URL is served same-origin. The worker imports
// maplibre-gl-shared.mjs by relative path, so both files must land together.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const dist = path.join(
	path.dirname(
		createRequire(import.meta.url).resolve("maplibre-gl/package.json"),
	),
	"dist",
);

const dest = path.join(process.cwd(), "public", "maplibre");

mkdirSync(dest, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
	copyFileSync(path.join(dist, file), path.join(dest, file));
}

console.log("Copied maplibre-gl worker files to public/maplibre");
