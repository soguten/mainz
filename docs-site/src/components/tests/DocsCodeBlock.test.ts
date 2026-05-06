/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { waitFor } from "mainz/testing";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const { DocsCodeBlock } = await import(
    "../docs-page/DocsCodeBlock.tsx"
) as typeof import("../docs-page/DocsCodeBlock.tsx");

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

Deno.test("DocsCodeBlock copies code and shows copied feedback", async () => {
    let copiedText = "";
    const clipboard = {
        async writeText(value: string) {
            copiedText = value;
        },
    };

    Object.defineProperty(globalThis.navigator, "clipboard", {
        configurable: true,
        value: clipboard,
    });

    const cleanupHighlight = installHighlightStub();

    DocsCodeBlock.copyFeedbackDurationMs = 1;

    const view = renderMainzComponent(DocsCodeBlock, {
        props: {
            label: "demo.tsx",
            language: "tsx",
            content: 'console.log("hello");',
        },
    });

    try {
        assertEquals(view.getBySelector("button").textContent, "Copy");
        assertStringIncludes(view.getBySelector("code").innerHTML, "hljs-variable");

        view.click("button");
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));

        assertEquals(copiedText, 'console.log("hello");');
        assertEquals(view.getBySelector("button").textContent, "Copied");
        assertStringIncludes(view.getBySelector("code").className, "hljs");
        assertStringIncludes(view.getBySelector("code").innerHTML, "hljs-variable");

        await waitFor(
            () => view.getBySelector("button").textContent === "Copy",
            "Expected copied feedback to reset.",
        );
        await setupMainzDom();
    } finally {
        cleanupHighlight();
        DocsCodeBlock.copyFeedbackDurationMs = 1200;
        view.cleanup();
        await setupMainzDom();
    }
});

Deno.test("DocsCodeBlock rerenders highlighted markup after window load", async () => {
    Object.defineProperty(document, "readyState", {
        configurable: true,
        value: "loading",
    });

    const view = renderMainzComponent(DocsCodeBlock, {
        props: {
            label: "demo.tsx",
            language: "tsx",
            content: 'console.log("hello");',
        },
    });

    try {
        assertEquals(view.getBySelector("code").className, "");
        assertEquals(view.getBySelector("code").textContent, 'console.log("hello");');

        const cleanupHighlight = installHighlightStub();

        try {
            window.dispatchEvent(new Event("load"));
            await Promise.resolve();

            assertStringIncludes(view.getBySelector("code").className, "hljs");
            assertStringIncludes(view.getBySelector("code").innerHTML, "hljs-variable");
        } finally {
            cleanupHighlight();
        }
    } finally {
        Reflect.deleteProperty(document, "readyState");
        view.cleanup();
    }
});

Deno.test("DocsCodeBlock normalizes missing language fences to plaintext", () => {
    const view = renderMainzComponent(DocsCodeBlock, {
        props: {
            label: "",
            content: 'console.log("hello");',
        },
    });

    try {
        assertEquals(view.getBySelector("code").getAttribute("data-code-language"), "plaintext");
        assertEquals(view.getBySelector(".docs-code-label").textContent, "plaintext");
        assertEquals(view.getBySelector(".docs-code-language").textContent, "");
    } finally {
        view.cleanup();
    }
});
