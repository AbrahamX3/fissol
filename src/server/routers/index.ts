import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { earthquakeRouter } from "./earthquake";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	earthquake: earthquakeRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
