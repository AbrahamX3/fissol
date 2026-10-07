"use client";

import NumberFlow from "@number-flow/react";
import type * as GeoJSON from "geojson";
import { Activity, ChevronDown, Layers } from "lucide-react";
import { GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useId, useMemo, useState } from "react";

import {
	Map,
	MapClusterLayer,
	MapControls,
	buildAgeFadeExpression,
	useMap,
} from "@/components/ui/map";
import type { EarthquakeFeature } from "@/lib/earthquake";
import { cn } from "@/lib/utils";

function getMagnitudeReachKm(mag: number | null): number {
	if (mag === null) return 5;

	if (mag < 2.0) return 5;

	if (mag < 3.0) return 15;

	if (mag < 4.0) return 50;

	if (mag < 5.0) return 150;

	if (mag < 6.0) return 500;

	if (mag < 7.0) return 1500;

	return 4000;
}

function createCirclePolygon(
	center: [number, number],
	radiusKm: number,
	points = 64,
): GeoJSON.Polygon {
	// Great-circle destination formula: accurate at large radii where the
	// previous flat-earth approximation drifted badly.
	const [lon, lat] = center;
	const R = 6371;
	const angular = radiusKm / R;
	const latRad = (lat * Math.PI) / 180;
	const lonRad = (lon * Math.PI) / 180;
	const coords: [number, number][] = [];

	for (let i = 0; i <= points; i++) {
		const bearing = (i * 2 * Math.PI) / points;

		const lat2 = Math.asin(
			Math.sin(latRad) * Math.cos(angular) +
				Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
		);

		const lon2 =
			lonRad +
			Math.atan2(
				Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
				Math.cos(angular) - Math.sin(latRad) * Math.sin(lat2),
			);

		coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
	}

	return {
		type: "Polygon",
		coordinates: [coords],
	};
}

function buildReachRingsGeoJSON(
	features: EarthquakeFeature[],
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: features.map((f) => ({
			type: "Feature" as const,
			geometry: createCirclePolygon(
				[f.geometry.coordinates[0], f.geometry.coordinates[1]],
				getMagnitudeReachKm(f.properties.mag),
			),
			properties: {
				mag: f.properties.mag,
				color: getMagnitudeColor(f.properties.mag),
				time: f.properties.time,
			},
		})),
	};
}

function getMagnitudeColor(mag: number | null): string {
	if (mag === null) return "#9ca3af";

	if (mag < 2.0) return "#9ca3af";

	if (mag < 3.0) return "#10b981";

	if (mag < 4.0) return "#84cc16";

	if (mag < 5.0) return "#eab308";

	if (mag < 6.0) return "#f97316";

	if (mag < 7.0) return "#ef4444";

	return "#9333ea";
}

function buildGeoJSON(
	features: EarthquakeFeature[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: "FeatureCollection",
		features: features.map((f) => ({
			type: "Feature" as const,
			geometry: {
				type: "Point" as const,
				coordinates: f.geometry.coordinates,
			},
			properties: {
				...f.properties,
				id: f.id,
			},
		})),
	};
}

/** Max number of reach rings drawn when nothing is selected. */
const MAX_RING_FEATURES = 5;

function ReachRings({
	features,
	selectedId,
	showRings,
}: {
	features: EarthquakeFeature[];
	selectedId: string | null;
	showRings: boolean;
}) {
	const { map } = useMap();
	const sourceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

	// Rings only for the selected quake, or the strongest few — drawing one
	// polygon per event turned the month feed into mud.
	const ringsGeoJSON = useMemo(() => {
		if (!showRings || features.length === 0) {
			return { type: "FeatureCollection" as const, features: [] };
		}

		const selected =
			selectedId !== null
				? (features.find((f) => f.id === selectedId) ?? null)
				: null;

		const ringFeatures = selected
			? [selected]
			: [...features]
					.sort(
						(a, b) =>
							(b.properties.mag ?? -Infinity) - (a.properties.mag ?? -Infinity),
					)
					.slice(0, MAX_RING_FEATURES);

		return buildReachRingsGeoJSON(ringFeatures);
	}, [features, selectedId, showRings]);

	useEffect(() => {
		if (!map) return undefined;
		const mapInstance: MapLibreMap = map;

		const setup = () => {
			try {
				if (mapInstance.getSource(sourceId)) return;
				mapInstance.addSource(sourceId, {
					type: "geojson",
					data: ringsGeoJSON,
				});
				mapInstance.addLayer({
					id: `${sourceId}-fill`,
					type: "fill",
					source: sourceId,
					paint: {
						"fill-color": ["get", "color"],
						"fill-opacity": ["*", 0.08, buildAgeFadeExpression()],
					},
				});
				mapInstance.addLayer({
					id: `${sourceId}-stroke`,
					type: "line",
					source: sourceId,
					paint: {
						"line-color": ["get", "color"],
						"line-width": 1,
						"line-opacity": ["*", 0.4, buildAgeFadeExpression()],
					},
				});
			} catch (error) {
				// Map destroyed before sources were fully added — expected during teardown.
				console.debug("Reach rings setup skipped:", error);
			}
		};

		if (mapInstance.isStyleLoaded()) {
			setup();
		} else {
			mapInstance.once("styledata", setup);
		}

		return () => {
			try {
				mapInstance.off("styledata", setup);

				if (!mapInstance.getSource(sourceId)) return;

				if (mapInstance.getLayer(`${sourceId}-fill`))
					mapInstance.removeLayer(`${sourceId}-fill`);

				if (mapInstance.getLayer(`${sourceId}-stroke`))
					mapInstance.removeLayer(`${sourceId}-stroke`);
				mapInstance.removeSource(sourceId);
			} catch (error) {
				// Listener or style teardown failed — map may already be gone.
				console.debug("Reach rings cleanup skipped:", error);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map, sourceId]);

	useEffect(() => {
		if (!map) return;

		try {
			const source = map.getSource(sourceId);

			if (!(source instanceof GeoJSONSource)) return;
			source.setData(ringsGeoJSON);
		} catch (error) {
			// Map or style not ready, or instance was removed mid-update.
			console.debug("Reach rings data update skipped:", error);
		}
	}, [map, ringsGeoJSON, sourceId]);

	return null;
}

/** White halo around the currently selected earthquake. */
function SelectedHighlight({
	features,
	selectedId,
}: {
	features: EarthquakeFeature[];
	selectedId: string | null;
}) {
	const { map } = useMap();
	const sourceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

	const highlightGeoJSON = useMemo<
		GeoJSON.FeatureCollection<GeoJSON.Point>
	>(() => {
		const selected =
			selectedId !== null
				? (features.find((f) => f.id === selectedId) ?? null)
				: null;

		if (!selected) {
			return { type: "FeatureCollection" as const, features: [] };
		}

		return {
			type: "FeatureCollection" as const,
			features: [
				{
					type: "Feature" as const,
					geometry: {
						type: "Point" as const,
						coordinates: selected.geometry.coordinates,
					},
					properties: {},
				},
			],
		};
	}, [features, selectedId]);

	useEffect(() => {
		if (!map) return;
		const mapInstance: MapLibreMap = map;

		try {
			mapInstance.addSource(sourceId, {
				type: "geojson",
				data: highlightGeoJSON,
			});
			mapInstance.addLayer({
				id: `${sourceId}-ring`,
				type: "circle",
				source: sourceId,
				paint: {
					"circle-radius": 20,
					"circle-color": "#ffffff",
					"circle-opacity": 0,
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-opacity": 0.9,
				},
			});
		} catch {
			// Layer already added or style tearing down.
		}

		return () => {
			try {
				if (mapInstance.getLayer(`${sourceId}-ring`))
					mapInstance.removeLayer(`${sourceId}-ring`);

				if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
			} catch {
				// Map may already be gone.
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map, sourceId]);

	useEffect(() => {
		if (!map) return;

		try {
			const source = map.getSource(sourceId);

			if (!(source instanceof GeoJSONSource)) return;
			source.setData(highlightGeoJSON);
		} catch {
			// Map or style not ready.
		}
	}, [map, highlightGeoJSON, sourceId]);

	return null;
}

const MAGNITUDE_LEGEND: { label: string; color: string }[] = [
	{ label: "M 7+", color: "#9333ea" },
	{ label: "M 6–7", color: "#ef4444" },
	{ label: "M 5–6", color: "#f97316" },
	{ label: "M 4–5", color: "#eab308" },
	{ label: "M 3–4", color: "#84cc16" },
	{ label: "M 2–3", color: "#10b981" },
	{ label: "M < 2", color: "#9ca3af" },
];

/** Count of features per magnitude band, aligned with MAGNITUDE_LEGEND order. */
function getMagnitudeBandCounts(features: EarthquakeFeature[]): number[] {
	const counts = Array.from<number>({ length: MAGNITUDE_LEGEND.length }).fill(
		0,
	);

	for (const f of features) {
		const mag = f.properties.mag;

		if (mag === null || mag < 2) counts[6]++;
		else if (mag < 3) counts[5]++;
		else if (mag < 4) counts[4]++;
		else if (mag < 5) counts[3]++;
		else if (mag < 6) counts[2]++;
		else if (mag < 7) counts[1]++;
		else counts[0]++;
	}

	return counts;
}

function MapLegend({
	counts,
	mobile,
}: {
	counts: number[];
	/** Mobile layout: pin to the top-right and allow collapsing. */
	mobile?: boolean;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const bodyId = useId();
	const isCollapsed = mobile && collapsed;

	return (
		<div
			className={cn(
				"bg-background/80 border absolute z-20 flex flex-col gap-1 rounded-sm px-2.5 py-2 shadow-sm backdrop-blur-xs",
				mobile ? "top-3 right-3" : "bottom-3 left-3 pointer-events-none",
			)}
		>
			{mobile ? (
				<button
					type="button"
					onClick={() => setCollapsed((v) => !v)}
					aria-expanded={!isCollapsed}
					aria-controls={bodyId}
					className="flex w-full items-center gap-1.5 text-left"
				>
					<Layers
						className="text-muted-foreground size-3.5 shrink-0"
						aria-hidden
					/>
					<span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
						Magnitude
					</span>
					<ChevronDown
						className={cn(
							"text-muted-foreground ml-auto size-3.5 shrink-0 transition-transform",
							isCollapsed && "-rotate-90",
						)}
						aria-hidden
					/>
				</button>
			) : (
				<p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
					Magnitude
				</p>
			)}
			{!isCollapsed && (
				<div id={bodyId} className="flex flex-col gap-1">
					{MAGNITUDE_LEGEND.map(({ label, color }, index) => (
						<div key={label} className="flex items-center gap-2">
							<span
								className="size-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: color }}
							/>
							<span className="text-foreground text-[10px] tabular-nums">
								{label}
							</span>
							<span
								className={`text-muted-foreground ml-auto text-[10px] tabular-nums ${
									counts[index] === 0 ? "opacity-40" : ""
								}`}
							>
								<NumberFlow
									locales="en-US"
									format={{ maximumFractionDigits: 0, useGrouping: true }}
									value={counts[index]}
								/>
							</span>
						</div>
					))}
					<p className="text-muted-foreground font-mono mt-0.5 text-[10px]">
						point size = magnitude
					</p>
				</div>
			)}
		</div>
	);
}

function MapEventHandler({
	selectedId,
	featureById,
	onSelect,
}: {
	selectedId: string | null;
	featureById: Map<string, EarthquakeFeature>;
	onSelect: (id: string | null) => void;
}) {
	const { map } = useMap();

	useEffect(() => {
		if (!map) return;

		const handleClick = () => {
			onSelect(null);
		};

		map.on("click", handleClick);

		return () => {
			map?.off?.("click", handleClick);
		};
	}, [map, onSelect]);

	useEffect(() => {
		if (!map || !selectedId) return;
		const feature = featureById.get(selectedId);

		if (!feature) return;
		const [lng, lat] = feature.geometry.coordinates;
		map.flyTo({ center: [lng, lat], zoom: 10, duration: 1000 });
	}, [map, selectedId, featureById]);

	return null;
}

export function EarthquakeMap({
	features,
	selectedId,
	showRings,
	onSelect,
	onUserLocated,
	onOpenEarthquakePanel,
}: {
	features: EarthquakeFeature[];
	selectedId: string | null;
	showRings: boolean;
	onSelect: (id: string | null) => void;
	/** Called when the user taps locate; re-runs geolocation each time. */
	onUserLocated?: (coords: { longitude: number; latitude: number }) => void;
	/** When set (e.g. on narrow layouts), the count chip opens the list/drawer. */
	onOpenEarthquakePanel?: () => void;
}) {
	const geojson = useMemo(() => buildGeoJSON(features), [features]);

	const magnitudeBandCounts = useMemo(
		() => getMagnitudeBandCounts(features),
		[features],
	);

	const featureById = useMemo(() => {
		const m = new globalThis.Map<string, EarthquakeFeature>();

		for (const f of features) m.set(f.id, f);

		return m;
	}, [features]);

	return (
		<div className="relative h-full w-full">
			<Map
				className="h-full w-full"
				viewport={{ center: [-98.5795, 39.8283], zoom: 3 }}
			>
				<MapEventHandler
					selectedId={selectedId}
					featureById={featureById}
					onSelect={onSelect}
				/>
				<ReachRings
					features={features}
					selectedId={selectedId}
					showRings={showRings}
				/>
				<SelectedHighlight features={features} selectedId={selectedId} />
				<MapClusterLayer
					data={geojson}
					clusterRadius={50}
					clusterMaxZoom={14}
					// Neutral cluster shades: hue is reserved for magnitude.
					clusterColors={["#94a3b8", "#64748b", "#475569"]}
					clusterThresholds={[10, 50]}
					fadeByAge
					pointRadius={[
						"interpolate",
						["linear"],
						["coalesce", ["get", "mag"], 0],
						0,
						4,
						3,
						6,
						4,
						9,
						5,
						13,
						6,
						18,
						7,
						24,
						8,
						31,
					]}
					pointColor={[
						"case",
						[">=", ["get", "mag"], 7],
						"#9333ea",
						[">=", ["get", "mag"], 6],
						"#ef4444",
						[">=", ["get", "mag"], 5],
						"#f97316",
						[">=", ["get", "mag"], 4],
						"#eab308",
						[">=", ["get", "mag"], 3],
						"#84cc16",
						[">=", ["get", "mag"], 2],
						"#10b981",
						"#9ca3af",
					]}
					onPointClick={(f) => {
						// SAFETY: buildGeoJSON writes the quake id onto every point's properties.
						const id = (f.properties as { id?: string })?.id;

						if (id) onSelect(id);
					}}
				/>
				<MapControls
					position="bottom-right"
					showZoom
					showCompass
					showLocate
					onLocate={onUserLocated}
					showFullscreen
				/>
			</Map>
			<MapLegend
				counts={magnitudeBandCounts}
				mobile={!!onOpenEarthquakePanel}
			/>
			<div className="pointer-events-none absolute top-3 left-3 z-20">
				{onOpenEarthquakePanel ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onOpenEarthquakePanel();
						}}
						className={cn(
							"bg-background/90 border backdrop-blur-xs pointer-events-auto flex items-center gap-2 rounded-sm px-3 py-1.5 text-left shadow-sm",
							"hover:bg-background/95 active:bg-background transition-colors",
						)}
						aria-label="Open earthquake list"
					>
						<Activity className="text-primary size-4 shrink-0" aria-hidden />
						<span className="inline-flex items-baseline gap-1 text-xs font-medium tabular-nums">
							<NumberFlow
								locales="en-US"
								format={{ maximumFractionDigits: 0, useGrouping: true }}
								value={features.length}
							/>
							earthquakes
						</span>
					</button>
				) : (
					<div className="bg-background/80 border backdrop-blur-xs flex items-center gap-2 rounded-sm px-3 py-1.5 shadow-sm">
						<Activity className="text-primary size-4" />
						<span className="inline-flex items-baseline gap-1 text-xs font-medium tabular-nums">
							<NumberFlow
								locales="en-US"
								format={{ maximumFractionDigits: 0, useGrouping: true }}
								value={features.length}
							/>
							earthquakes
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
