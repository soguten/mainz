export function highlightDocsCodeBlocks(root: ParentNode): void {
    const hljs = window.hljs;
    if (!hljs) {
        return;
    }

    const blocks = root.querySelectorAll<HTMLElement>("pre code[data-code-language]");

    for (const block of blocks) {
        const rawCode = block.dataset.rawCode ?? block.textContent ?? "";
        if (block.dataset.hljsRaw === rawCode) {
            continue;
        }

        const language = block.dataset.codeLanguage ?? "plaintext";

        if (hljs.highlight) {
            block.innerHTML = hljs.highlight(rawCode, { language, ignoreIllegals: true }).value;
            block.classList.add("hljs");
            block.dataset.hljsRaw = rawCode;
            continue;
        }

        block.textContent = rawCode;
        hljs.highlightElement(block);
        block.dataset.hljsRaw = rawCode;
    }
}

declare global {
    interface Window {
        hljs?: {
            highlight?: (code: string, options: { language: string; ignoreIllegals?: boolean }) => { value: string };
            highlightElement: (element: Element) => void;
        };
    }
}
