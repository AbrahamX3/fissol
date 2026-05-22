import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fissol",
    short_name: "Fissol",
    description: "Visualize all earthquakes all in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/fissol-white.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
  };
}
