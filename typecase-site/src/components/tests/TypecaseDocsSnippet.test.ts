/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
    "./TypecaseDocsSnippet.fixture.tsx"
) as typeof import("./TypecaseDocsSnippet.fixture.tsx");

function installHighlightStub() {
    const testWindow = window as Window & {
        hljs?: {
            highlight?: (
                code: string,
                options: { language: string; ignoreIllegals?: boolean },
            ) => { value: string };
            highlightElement: (element: Element) => void;
        };
    };

    testWindow.hljs = {
        highlight(code) {
            return {
                value: code.replace(
                    "console",
                    '<span class="hljs-variable language_">console</span>',
                ),
            };
        },
        highlightElement: () => undefined,
    };

    return () => {
        delete testWindow.hljs;
    };
}

Deno.test("typecase-site/docs-snippet: should highlight code and restore copy state", async () => {
    const cleanupHighlight = installHighlightStub();
    const screen = renderMainzComponent(fixtures.TypecaseDocsSnippetFixture);

    try {
        const code = screen.getBySelector("code");
        assertStringIncludes(code.className, "hljs");
        assert(code.innerHTML.includes("hljs-"));

        const copyButton = screen.getBySelector("[data-slot='typecase-docs-snippet-copy']");
        assertEquals(copyButton.getAttribute("aria-label"), "Copy");

        copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        assertEquals(copyButton.getAttribute("aria-label"), "Copied");

        await new Promise((resolve) => setTimeout(resolve, 1300));

        const resetButton = screen.getBySelector("[data-slot='typecase-docs-snippet-copy']");
        assertEquals(resetButton.getAttribute("aria-label"), "Copy");
    } finally {
        cleanupHighlight();
        screen.cleanup();
    }
});
