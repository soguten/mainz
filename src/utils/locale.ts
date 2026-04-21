/**
 * Normalize a locale tag using BCP 47 canonicalization.
 */
export function normalizeLocaleTag(locale: string): string {
    const normalized = locale.trim().replaceAll("_", "-");
    if (!normalized) {
        throw new Error("Locale cannot be empty.");
    }

    try {
        return Intl.getCanonicalLocales(normalized)[0]!;
    } catch {
        throw new Error(`Invalid locale "${locale}". Expected a valid BCP 47 language tag.`);
    }
}

/**
 * Convert a locale tag to the lowercase path segment Mainz uses in URLs.
 */
export function toLocalePathSegment(locale: string): string {
    return normalizeLocaleTag(locale).toLowerCase();
}
