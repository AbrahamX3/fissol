"use client";

import NumberFlow from "@number-flow/react";
import { Activity } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { Map, MapClusterLayer, MapControls, useMap } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import type { EarthquakeFeature } from "@/server/routers/earthquake";

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
	const [lon, lat] = center;
	const coords: [number, number][] = [];
	const R = 6371;

	for (let i = 0; i <= points; i++) {
		const bearing = (i * 2 * Math.PI) / points;
		const dLat = (radiusKm * Math.cos(bearing)) / R;
		const dLon =
			(radiusKm * Math.sin(bearing)) / (R * Math.cos((lat * Math.PI) / 180));
		coords.push([lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
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
				coordinates: f.geometry.coordinates as [number, number, number],
			},
			properties: {
				...f.properties,
				id: f.id,
			},
		})),
	};
}

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

	const allRingsGeoJSON = useMemo(
		() => buildReachRingsGeoJSON(features),
		[features],
	);
	const selectedRingsGeoJSON = useMemo(() => {
		if (!selectedId) return null;
		const feature = features.find((f) => f.id === selectedId);
		return feature ? buildReachRingsGeoJSON([feature]) : null;
	}, [features, selectedId]);

	const sourceId = useRef(
		`rings-${Math.random().toString(36).slice(2)}`,
	).current;
	const featuresRef = useRef(features);
	featuresRef.current = features;
	const selectedIdRef = useRef(selectedId);
	selectedIdRef.current = selectedId;
	const showRingsRef = useRef(showRings);
	showRingsRef.current = showRings;
	const allRingsGeoJSONRef = useRef(allRingsGeoJSON);
	allRingsGeoJSONRef.current = allRingsGeoJSON;
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;

		if (!map) {
			return undefined;
		}

		const mapInstance: MapLibreMap = map;

		const updateVisibility = () => {
			const m = mapInstance;
			if (!m || !mountedRef.current) return;
			try {
				if (!showRingsRef.current) {
					m.setLayoutProperty(`${sourceId}-fill`, "visibility", "none");
					m.setLayoutProperty(`${sourceId}-stroke`, "visibility", "none");
					return;
				}

				const source = m.getSource(sourceId) as
					| maplibregl.GeoJSONSource
					| undefined;
				if (!source) return;

				const sel = selectedIdRef.current;
				const data = sel
					? (() => {
							const f = featuresRef.current.find((x) => x.id === sel);
							return f
								? buildReachRingsGeoJSON([f])
								: allRingsGeoJSONRef.current;
						})()
					: allRingsGeoJSONRef.current;

				source.setData(data);

				m.setLayoutProperty(`${sourceId}-fill`, "visibility", "visible");
				m.setLayoutProperty(`${sourceId}-stroke`, "visibility", "visible");
			} catch {
				// Style or map was torn down while updating rings.
			}
		};

		const setup = () => {
			const m = mapInstance;
			if (!m || !mountedRef.current) return;
			try {
				if (m.getSource(sourceId)) return;

				m.addSource(sourceId, {
					type: "geojson",
					data: allRingsGeoJSONRef.current,
				});

				m.addLayer({
					id: `${sourceId}-fill`,
					type: "fill",
					source: sourceId,
					paint: {
						"fill-color": [
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
							"#9ca3af",
						],
						"fill-opacity": 0.08,
					},
				});

				m.addLayer({
					id: `${sourceId}-stroke`,
					type: "line",
					source: sourceId,
					paint: {
						"line-color": [
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
							"#9ca3af",
						],
						"line-width": 1,
						"line-opacity": 0.35,
					},
				});

				updateVisibility();
			} catch {
				// Map destroyed before sources were fully added.
			}
		};

		if (mapInstance.isStyleLoaded()) {
			setup();
		} else {
			mapInstance.once("styledata", setup);
		}

		return () => {
			mountedRef.current = false;
			try {
				mapInstance.off("styledata", setup);
				if (!mapInstance.getSource(sourceId)) return;
				if (mapInstance.getLayer(`${sourceId}-fill`))
					mapInstance.removeLayer(`${sourceId}-fill`);
				if (mapInstance.getLayer(`${sourceId}-stroke`))
					mapInstance.removeLayer(`${sourceId}-stroke`);
				mapInstance.removeSource(sourceId);
			} catch {
				// Listener or style teardown failed — map may already be gone.
			}
		};
	}, [map, sourceId]);

	useEffect(() => {
		if (!map) return;
		try {
			if (!map.getSource(sourceId)) return;

			if (!showRings) {
				map.setLayoutProperty(`${sourceId}-fill`, "visibility", "none");
				map.setLayoutProperty(`${sourceId}-stroke`, "visibility", "none");
				return;
			}

			const source = map.getSource(sourceId) as
				| maplibregl.GeoJSONSource
				| undefined;
			if (!source) return;

			const data =
				selectedId && selectedRingsGeoJSON
					? selectedRingsGeoJSON
					: allRingsGeoJSON;

			source.setData(data);

			map.setLayoutProperty(`${sourceId}-fill`, "visibility", "visible");
			map.setLayoutProperty(`${sourceId}-stroke`, "visibility", "visible");
		} catch {
			// Map or style not ready, or instance was removed mid-update.
		}
	}, [
		map,
		allRingsGeoJSON,
		selectedRingsGeoJSON,
		selectedId,
		showRings,
		sourceId,
	]);

	return null;
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
				<MapClusterLayer
					data={geojson}
					clusterRadius={50}
					clusterMaxZoom={14}
					clusterColors={["#22c55e", "#eab308", "#ef4444"]}
					clusterThresholds={[10, 50]}
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
						"#9ca3af",
					]}
					onPointClick={(f) => {
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
