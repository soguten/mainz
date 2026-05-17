/// <reference lib="deno.ns" />

import { unlocalizedRoutingHomeCase } from "./unlocalized-routing-home.case.ts";
import { unlocalizedRoutingQuickstartCase } from "./unlocalized-routing-quickstart.case.ts";

export const unlocalizedRoutingCases = [
  unlocalizedRoutingHomeCase,
  unlocalizedRoutingQuickstartCase,
] as const;
