import { AppRouter } from "@/trpc/routers/_app";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>