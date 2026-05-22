import { z } from "zod";

import { publicProcedure } from "../index";

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
	/** Present on summary feeds */
	count: z.number().optional(),
	/** Present on FDSN query responses */
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

export const earthquakeRouter = {
	getFeed: publicProcedure
		.input(z.object({ feed: feedSchema }))
		.handler(async ({ input }) => {
			const res = await fetch(
				`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${input.feed}.geojson`,
			);
			if (!res.ok) throw new Error("Failed to fetch earthquake feed");
			return usgsResponseSchema.parse(await res.json());
		}),

	query: publicProcedure
		.input(
			z
				.object({
					starttime: z.string().optional(),
					endtime: z.string().optional(),
					minmagnitude: z.number().optional(),
					maxmagnitude: z.number().optional(),
					limit: z.number().max(20000).optional(),
					/** Center latitude for a radius search (USGS FDSN). */
					latitude: z.number().min(-90).max(90).optional(),
					/** Center longitude for a radius search. */
					longitude: z.number().min(-180).max(180).optional(),
					/** Max distance from the center in km (used with latitude/longitude). */
					maxradiuskm: z.number().positive().max(20000).optional(),
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
				}),
		)
		.handler(async ({ input }) => {
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

			const res = await fetch(
				`https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`,
			);
			if (!res.ok) throw new Error("Failed to query earthquakes");
			return usgsResponseSchema.parse(await res.json());
		}),
};

export type EarthquakeResponse = z.infer<typeof usgsResponseSchema>;
export type EarthquakeFeature = z.infer<typeof usgsFeatureSchema>;
export type EarthquakeProperties = z.infer<typeof usgsPropertiesSchema>;
export type FeedName = z.infer<typeof feedSchema>;
