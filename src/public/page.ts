/**
 * Public page authoring APIs for Mainz.
 */

export {
  Locales,
  RenderMode,
  requirePageRoutePath,
  resolvePageLocales,
  resolvePageRenderMode,
  resolvePageRoutePath,
  Route,
} from "../components/page-metadata.ts";
export {
  applyResolvedAssetDefinitionsToDocument,
  applyResolvedAssetDefinitionsToHtml,
  createAssetContext,
  createPageLoadContext,
  disableAsset,
  isAssetDefinition,
  isAssetDefinitionList,
  isPageConstructor,
  link,
  load,
  MAINZ_ASSET_MANAGED_ATTR,
  noscript,
  Page,
  resolveAssetDefinitions,
  script,
  style,
} from "../components/page.ts";
export type { PageRenderMode } from "../components/page-metadata.ts";
export type {
  PageEntryDefinition,
  PageMetadataDefinition,
  PageMetadataLinkDefinition,
  PageMetadataMetaDefinition,
  PageRouteParams,
} from "../components/page-contract.ts";
export type {
  AssetContext,
  AssetDefinition,
  LinkAssetAttributes,
  LinkAssetDefinition,
  NoscriptAssetDefinition,
  PageConstructor,
  PageEntriesContext,
  PageLoadContext,
  PageLoadContextInit,
  PageLoadHelpers,
  PageLoadResources,
  PageLoadRuntime,
  PageMetadataContext,
  PageNavigationMode,
  PageResource,
  ScriptAssetDefinition,
  StyleAssetDefinition,
} from "../components/page.ts";
