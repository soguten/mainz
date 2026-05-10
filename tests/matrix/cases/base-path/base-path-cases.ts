/// <reference lib="deno.ns" />

import { basePathHomeCase } from "./base-path-home.case.ts";
import { basePathNotFoundCase } from "./base-path-not-found.case.ts";
import { basePathQuickstartCase } from "./base-path-quickstart.case.ts";

export const basePathCases = [
  basePathHomeCase,
  basePathNotFoundCase,
  basePathQuickstartCase,
] as const;
