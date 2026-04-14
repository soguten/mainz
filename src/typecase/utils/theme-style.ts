import type { TypecaseTheme } from "../themes/types.ts";

export function toThemeStyleAttribute(theme: TypecaseTheme): string {
    return toStyleAttribute(theme.vars) ?? "";
}

export function mergeStyleAttributes(...styles: Array<string | undefined>): string | undefined {
    const merged = styles
        .map((style) => style?.trim())
        .filter((style) => !!style)
        .join("; ");

    return merged.length > 0 ? merged : undefined;
}

export function toStyleAttribute(entries: Record<string, string | undefined>): string | undefined {
    const serialized = Object.entries(entries)
        .filter(([, value]) => value !== undefined && value.length > 0)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ");

    return serialized.length > 0 ? serialized : undefined;
}
