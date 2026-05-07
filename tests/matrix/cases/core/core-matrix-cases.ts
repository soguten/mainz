/// <reference lib="deno.ns" />

import { headCase } from "../head/head.case.ts";
import { hydrationCase } from "../hydration/hydration.case.ts";
import { i18nCase } from "../i18n/i18n.case.ts";
import { navigationCase } from "../navigation/navigation.case.ts";
import { notFoundCase } from "../not-found/not-found.case.ts";
import { routingCase } from "../routing/routing.case.ts";

export const routedCoreCases = [
  routingCase,
  notFoundCase,
  i18nCase,
  headCase,
  navigationCase,
] as const;

export const rootCoreCases = [
  hydrationCase,
] as const;

export const coreMatrixCases = [
  ...routedCoreCases,
  ...rootCoreCases,
] as const;
