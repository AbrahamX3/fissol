import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { haversineDistanceKm } from "@/lib/geo";

const usgsPropertiesSchema = z.object({
	mag: z.number().nullable(),
	place: z.string().nullable(),
	time: z.number().nullable(),
	updated: z.number().nullable(),
	tz: z.number().nullable(),
	url: z.string().nullable(),
	detail: z.string().nullable(),
	felt: z.number().nullable(),
	cdi: z.number().nullable(),
	mmi: z.number().nullable(),
	alert: z.string().nullable(),
	status: z.string().nullable(),
	tsunami: z.number().nullable(),
	sig: z.number().nullable(),
	net: z.string().nullable(),
	code: z.string().nullable(),
	ids: z.string().nullable(),
	sources: z.string().nullable(),
	types: z.string().nullable(),
	nst: z.number().nullable(),
	dmin: z.number().nullable(),
	rms: z.number().nullable(),
	gap: z.number().nullable(),
	magType: z.string().nullable(),
	type: z.string().nullable(),
	title: z.string().nullable(),
});

const usgsGeometrySchema = z.object({
	type: z.literal("Point"),
	coordinates: z.tuple([z.number(), z.number(), z.number()]),
});

const usgsFeatureSchema = z.object({
	type: z.literal("Feature"),
	properties: usgsPropertiesSchema,
	geometry: usgsGeometrySchema,
	id: z.string(),
});

const usgsMetadataSchema = z.object({
	generated: z.number(),
	url: z.string(),
	title: z.string(),
	api: z.string(),
	status: z.number(),
	count: z.number().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});

const usgsResponseSchema = z.object({
	type: z.literal("FeatureCollection"),
	metadata: usgsMetadataSchema,
	features: z.array(usgsFeatureSchema),
});

const feedSchema = z.enum([
	"all_hour",
	"all_day",
	"all_week",
	"all_month",
	"significant_hour",
	"significant_day",
	"significant_week",
	"significant_month",
]);

const orderbySchema = z.enum([
	"time",
	"time-asc",
	"magnitude",
	"magnitude-asc",
]);

const queryInputSchema = z
	.object({
		starttime: z.string().optional(),
		endtime: z.string().optional(),
		minmagnitude: z.number().optional(),
		maxmagnitude: z.number().optional(),
		limit: z.number().max(20000).optional(),
		latitude: z.number().min(-90).max(90).optional(),
		longitude: z.number().min(-180).max(180).optional(),
		maxradiuskm: z.number().positive().max(20000).optional(),
		orderby: orderbySchema.optional(),
	})
	.superRefine((val, ctx) => {
		const hasLat = val.latitude !== undefined;
		const hasLon = val.longitude !== undefined;
		if (hasLat !== hasLon) {
			ctx.addIssue({
				code: "custom",
				message: "latitude and longitude must be provided together",
				path: hasLat ? ["longitude"] : ["latitude"],
			});
		}
		if ((hasLat || hasLon) && val.maxradiuskm === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "maxradiuskm is required with latitude/longitude",
				path: ["maxradiuskm"],
			});
		}
	});

export type EarthquakeResponse = z.infer<typeof usgsResponseSchema>;
export type EarthquakeFeature = z.infer<typeof usgsFeatureSchema>;
export type EarthquakeProperties = z.infer<typeof usgsPropertiesSchema>;
export type FeedName = z.infer<typeof feedSchema>;
export type QueryInput = z.input<typeof queryInputSchema>;
export type SortOrder =
	| "newest"
	| "oldest"
	| "biggest"
	| "smallest"
	| "nearest"
	| "furthest";

export type SortOrigin = { lat: number; lng: number } | null;

export { feedSchema, queryInputSchema };

function buildFeedUrl(feed: FeedName): string {
	return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;
}

function buildQueryUrl(input: QueryInput): string {
	const params = new URLSearchParams({ format: "geojson" });
	if (input.starttime) params.set("starttime", input.starttime);
	if (input.endtime) params.set("endtime", input.endtime);
	if (input.minmagnitude !== undefined)
		params.set("minmagnitude", input.minmagnitude.toString());
	if (input.maxmagnitude !== undefined)
		params.set("maxmagnitude", input.maxmagnitude.toString());
	if (input.limit) params.set("limit", input.limit.toString());
	if (input.latitude !== undefined)
		params.set("latitude", input.latitude.toString());
	if (input.longitude !== undefined)
		params.set("longitude", input.longitude.toString());
	if (input.maxradiuskm !== undefined)
		params.set("maxradiuskm", input.maxradiuskm.toString());
	if (input.orderby) params.set("orderby", input.orderby);
	return `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`;
}

async function fetchFeed(feed: FeedName): Promise<EarthquakeResponse> {
	const res = await fetch(buildFeedUrl(feed));
	if (!res.ok) throw new Error("Failed to fetch earthquake feed");
	return usgsResponseSchema.parse(await res.json());
}

async function fetchQuery(input: QueryInput): Promise<EarthquakeResponse> {
	const validated = queryInputSchema.parse(input);
	const url = buildQueryUrl(validated);
	const res = await fetch(url);
	if (!res.ok) throw new Error("Failed to query earthquakes");
	return usgsResponseSchema.parse(await res.json());
}

export function getFeedQueryOptions(feed: FeedName) {
	return queryOptions({
		queryKey: ["earthquake", "feed", feed],
		queryFn: () => fetchFeed(feed),
	});
}

export function getQueryQueryOptions(input: QueryInput) {
	return queryOptions({
		queryKey: ["earthquake", "query", input],
		queryFn: () => fetchQuery(input),
	});
}

export function sortFeatures(
	features: EarthquakeFeature[],
	order: SortOrder,
	origin: SortOrigin = null,
): EarthquakeFeature[] {
	const byTimeDesc = (a: EarthquakeFeature, b: EarthquakeFeature) =>
		(b.properties.time ?? 0) - (a.properties.time ?? 0);

	return [...features].sort((a, b) => {
		switch (order) {
			case "newest":
				return byTimeDesc(a, b);
			case "oldest":
				return -byTimeDesc(a, b);
			case "biggest": {
				const diff =
					(b.properties.mag ?? -Infinity) - (a.properties.mag ?? -Infinity);
				return diff !== 0 ? diff : byTimeDesc(a, b);
			}
			case "smallest": {
				const diff =
					(a.properties.mag ?? Infinity) - (b.properties.mag ?? Infinity);
				return diff !== 0 ? diff : byTimeDesc(a, b);
			}
			case "nearest":
			case "furthest": {
				if (!origin) return byTimeDesc(a, b);
				const [aLng, aLat] = a.geometry.coordinates;
				const [bLng, bLat] = b.geometry.coordinates;
				const diff =
					haversineDistanceKm(origin.lat, origin.lng, aLat, aLng) -
					haversineDistanceKm(origin.lat, origin.lng, bLat, bLng);
				const signed = order === "nearest" ? diff : -diff;
				return signed !== 0 ? signed : byTimeDesc(a, b);
			}
		}
	});
}
