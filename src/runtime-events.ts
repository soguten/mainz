export const MAINZ_LOCALE_CHANGE_EVENT = "mainz:localechange";

export interface MainzLocaleChangeDetail {
    locale: string;
    url: string;
    basePath: string;
}
