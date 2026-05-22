import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/providers";

import "@/styles/globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
	preload: false,
});

export const metadata: Metadata = {
	title: "Fissol | Earthquake Visualizer",
	description: "Visualize all earthquakes all in one place.",
	icons: {
		icon: [
			{
				url: "/fissol-black.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/fissol-white.png",
				media: "(prefers-color-scheme: dark)",
			},
		],
		apple: "/apple-touch-icon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					<div className="h-svh overflow-hidden">{children}</div>
				</Providers>
			</body>
		</html>
	);
}
