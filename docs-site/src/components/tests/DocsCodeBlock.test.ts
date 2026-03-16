/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const { DocsCodeBlock } = await import("../DocsShell.tsx") as typeof import("../DocsShell.tsx");

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

        view.click("button");
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));

        assertEquals(copiedText, 'console.log("hello");');
        assertEquals(view.getBySelector("button").textContent, "Copied");

        await new Promise((resolve) => setTimeout(resolve, 5));
    } finally {
        DocsCodeBlock.copyFeedbackDurationMs = 1200;
        view.cleanup();
    }
});
