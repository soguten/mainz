export interface DocsHighlightedCode {
    content: DocumentFragment | string;
    highlighted: boolean;
}

export function renderHighlightedDocsCode(
    rawCode: string,
    language: string,
): DocsHighlightedCode {
    const hljs = typeof window !== "undefined" ? window.hljs : undefined;
    if (!hljs?.highlight || typeof document === "undefined") {
        return {
            content: rawCode,
            highlighted: false,
        };
    }

    const highlightedHtml = hljs.highlight(rawCode, {
        language,
        ignoreIllegals: true,
    }).value;

    const template = document.createElement("template");
    template.innerHTML = highlightedHtml;

    return {
        content: template.content.cloneNode(true) as DocumentFragment,
        highlighted: true,
    };
}

export function isDocsHighlightReady(): boolean {
    return typeof window !== "undefined" && typeof window.hljs?.highlight === "function";
}

declare global {
    interface Window {
        hljs?: {
            highlight?: (code: string, options: { language: string; ignoreIllegals?: boolean }) => { value: string };
            highlightElement: (element: Element) => void;
        };
    }
}
