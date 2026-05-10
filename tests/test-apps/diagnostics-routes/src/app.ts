import { defineApp } from "mainz";
import {
  DynamicSsgInvalidEntriesFromAsyncHelperPage,
  DynamicSsgInvalidEntriesHelperPage,
  DynamicSsgInvalidEntryHelperPage,
  DynamicSsgInvalidLocalSpreadAliasPage,
  DynamicSsgInvalidNestedParamsHelperPage,
  DynamicSsgInvalidParamsHelperPage,
  DynamicSsgInvalidReferencedEntriesPage,
  DynamicSsgInvalidSharedParamsPage,
  DynamicSsgInvalidSharedSpreadParamsPage,
  DynamicSsgInvalidSpreadParamsPage,
  DynamicSsgWithoutEntriesPage,
  DynamicSsgWithoutLoadPage,
  LegacyStaticLoadPage,
  MixedLoadPage,
} from "./pages/Diagnostics.page.tsx";

export const app = defineApp({
  id: "diagnostics-routes",
  pages: [
    DynamicSsgWithoutEntriesPage,
    DynamicSsgWithoutLoadPage,
    LegacyStaticLoadPage,
    MixedLoadPage,
    DynamicSsgInvalidEntriesHelperPage,
    DynamicSsgInvalidEntriesFromAsyncHelperPage,
    DynamicSsgInvalidSharedParamsPage,
    DynamicSsgInvalidParamsHelperPage,
    DynamicSsgInvalidNestedParamsHelperPage,
    DynamicSsgInvalidEntryHelperPage,
    DynamicSsgInvalidSpreadParamsPage,
    DynamicSsgInvalidSharedSpreadParamsPage,
    DynamicSsgInvalidLocalSpreadAliasPage,
    DynamicSsgInvalidReferencedEntriesPage,
  ],
});
