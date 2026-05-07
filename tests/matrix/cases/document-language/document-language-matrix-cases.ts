/// <reference lib="deno.ns" />

import { documentLanguageHomeCase } from "./document-language-home.case.ts";
import { documentLanguageQuickstartCase } from "./document-language-quickstart.case.ts";

export const documentLanguageCases = [
  documentLanguageHomeCase,
  documentLanguageQuickstartCase,
] as const;
