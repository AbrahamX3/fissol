import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	client: {},
	runtimeEnv: {
		CORS_ORIGIN: process.env.CORS_ORIGIN,
		NODE_ENV: process.env.NODE_ENV,
	},
	emptyStringAsUndefined: true,
});
