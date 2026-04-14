export interface TypecaseHighlightedCode {
    content: DocumentFragment | string;
    highlighted: boolean;
}

export function renderHighlightedTypecaseCode(
    rawCode: string,
    language?: string,
): TypecaseHighlightedCode {
    const hljs = typeof window !== "undefined" ? window.hljs : undefined;
    if (!hljs?.highlight || typeof document === "undefined") {
        return {
            content: rawCode,
            highlighted: false,
        };
    }

    const normalizedLanguage = normalizeTypecaseHighlightLanguage(language);
    if (!normalizedLanguage) {
        return {
            content: rawCode,
            highlighted: false,
        };
    }

    try {
        const highlightedHtml = hljs.highlight(rawCode, {
            language: normalizedLanguage,
            ignoreIllegals: true,
        }).value;

        const template = document.createElement("template");
        template.innerHTML = highlightedHtml;

        return {
            content: template.content.cloneNode(true) as DocumentFragment,
            highlighted: true,
        };
    } catch {
        return {
            content: rawCode,
            highlighted: false,
        };
    }
}

function normalizeTypecaseHighlightLanguage(language?: string): string | null {
    const normalized = (language ?? "").trim().toLowerCase();

    if (!normalized) {
        return "plaintext";
    }

    if (normalized === "tsx" || normalized === "ts") {
        return "typescript";
    }

    if (normalized === "js" || normalized === "mjs" || normalized === "cjs") {
        return "javascript";
    }

    if (normalized === "html") {
        return "xml";
    }

    if (normalized === "sh" || normalized === "shell") {
        return "bash";
    }

    if (normalized === "text" || normalized === "txt") {
        return "plaintext";
    }

    return normalized;
}

declare global {
    interface Window {
        hljs?: {
            highlight?: (
                code: string,
                options: { language: string; ignoreIllegals?: boolean },
            ) => { value: string };
            highlightElement: (element: Element) => void;
        };
    }
}
