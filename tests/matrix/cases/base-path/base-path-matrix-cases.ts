/// <reference lib="deno.ns" />

import { basePathHomeCase } from "./base-path-home.case.ts";
import { basePathNotFoundCase } from "./base-path-not-found.case.ts";

export const basePathCases = [
  basePathHomeCase,
  basePathNotFoundCase,
] as const;
