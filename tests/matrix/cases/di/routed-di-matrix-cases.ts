/// <reference lib="deno.ns" />

import { routedDiClientCase } from "./routed-di-client.case.ts";
import { routedDiCase } from "./routed-di.case.ts";

export const routedDiEntriesCases = [
    routedDiCase,
] as const;

export const routedDiClientCases = [
    routedDiClientCase,
] as const;
