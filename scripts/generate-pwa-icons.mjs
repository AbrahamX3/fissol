import sharp from "sharp";

const BG = "#0a0a0a";

const SRC = "public/fissol-white.png";

async function writeIcon(size, out) {
	await sharp(SRC)
		.resize(size, size, { fit: "contain", background: BG })
		.flatten({ background: BG })
		.png()
		.toFile(out);
	console.log(`wrote ${out}`);
}

await writeIcon(512, "public/fissol-pwa-512.png");

await writeIcon(192, "public/fissol-pwa-192.png");

await writeIcon(180, "public/apple-touch-icon.png");
