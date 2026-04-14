import type { TypecaseThemePreference, TypecaseThemeScheme } from "./themes/types.ts";

export const TYPECASE_THEME_CHANGE_EVENT = "typecase:themechange";
export const TYPECASE_THEME_PREFERENCE_REQUEST_EVENT = "typecase:themepreference";

export interface TypecaseThemeChangeDetail {
    availableSchemes: readonly TypecaseThemeScheme[];
    preference: TypecaseThemePreference;
    resolvedScheme: TypecaseThemeScheme;
    themeName: string;
}
