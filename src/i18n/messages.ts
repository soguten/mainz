import { MessagesLoader } from "./types.ts";
import { normalizeLocaleTag } from "./core.ts";

export async function validateMessagesForLocales(
    locales: readonly string[],
    loader: MessagesLoader<string>,
    ns?: string,
): Promise<void> {
    for (const locale of locales) {
        const normalizedLocale = normalizeLocaleTag(locale);
        let messages: Record<string, unknown>;

        try {
            messages = await loader(normalizedLocale, ns);
        } catch (error) {
            throw new Error(
                `Failed to load messages for locale "${normalizedLocale}": ${toErrorMessage(error)}`,
            );
        }

        if (!messages || Object.keys(messages).length === 0) {
            throw new Error(
                `Locale "${normalizedLocale}" has no resolvable messages.`,
            );
        }
    }
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
