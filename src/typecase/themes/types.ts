export type TypecaseThemeVars = Readonly<Record<string, string>>;
export type TypecaseThemeScheme = "light" | "dark";
export type TypecaseThemePreference = TypecaseThemeScheme | "auto";

export interface TypecaseTheme {
    name: string;
    scheme: TypecaseThemeScheme;
    vars: TypecaseThemeVars;
}
