export {
  buildLocaleHref,
  buildLocaleRootHref,
  clearAppI18n,
  getAppI18n,
  getLocale,
  hasAppI18n,
  installAppI18n,
  resolveLocale,
  setLocale,
  t,
} from "./app-runtime.ts";

export {
  createDictionaryI18n,
  detectNavigatorLocale,
  getByPath,
  normalizeLocaleTag,
  resolveSupportedLocale,
  toLocalePathSegment,
} from "./core.ts";

export { validateMessagesForLocales } from "./messages.ts";
export type {
  AppI18n,
  AppI18nDefinition,
  AppI18nMissingPolicy,
  BuildLocaleHrefOptions,
} from "./app-runtime.ts";

export type { DictionaryI18n } from "./core.ts";
export type {
  DictionaryI18nOptions,
  I18nConfig,
  LocaleTag,
  MessagesLoader,
} from "./types.ts";
