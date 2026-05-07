/// <reference lib="deno.ns" />

import { singleLocaleHomeCase } from "./single-locale-home.case.ts";
import { singleLocaleQuickstartCase } from "./single-locale-quickstart.case.ts";

export const singleLocaleCases = [
  singleLocaleHomeCase,
  singleLocaleQuickstartCase,
] as const;
