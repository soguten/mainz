export { createAppDictionaryI18n } from "./app.ts";

export {
    createDictionaryI18n,
    detectNavigatorLocale,
    getByPath,
    normalizeLocaleTag,
    resolveSupportedLocale,
    toLocalePathSegment,
} from "./core.ts";

export { validateMessagesForLocales } from "./messages.ts";

export type { DictionaryI18nAppDetectOptions, DictionaryI18nAppOptions } from "./app.ts";

export type { DictionaryI18nOptions, I18nConfig, LocaleTag, MessagesLoader } from "./types.ts";
