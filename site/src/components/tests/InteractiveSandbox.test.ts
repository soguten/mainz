/// <reference lib="deno.ns" />

/**
 * Workshop editor tests
 *
 * Verifies that the workshop keeps its editor-like behavior
 * and preserves the validation flow after the live highlight overlay changes.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
import { setLocale } from "../../i18n/index.ts";
import { pageStyles } from "../../styles/pageStyles.ts";

await setupMainzDom();

const fixtures = await import("./InteractiveSandbox.fixture.tsx") as typeof import("./InteractiveSandbox.fixture.tsx");

Deno.test("site/workshop: should render an editor-like textarea with live preview and line numbers", () => {
    setLocale("pt");
    const hljs = fixtures.installHighlightStub();
    const screen = renderMainzComponent(fixtures.InteractiveSandbox);

    try {
        const textarea = screen.getBySelector<HTMLTextAreaElement>("textarea");
        const previewCode = screen.getBySelector<HTMLElement>(".sandbox-editor-preview code");
        const lineNumbers = screen.component.querySelectorAll(".sandbox-editor-line");

        assertEquals(textarea.getAttribute("spellcheck"), "false");
        assertEquals(textarea.getAttribute("autocomplete"), "off");
        assertEquals(textarea.getAttribute("wrap"), "off");
        assertEquals(lineNumbers.length, textarea.value.split("\n").length);
        assertEquals(previewCode.dataset.rawCode, textarea.value);

        screen.input("textarea", "import { Component } from \"mainz\";\nclass Todo extends Component {}");

        const updatedPreviewCode = screen.getBySelector<HTMLElement>(".sandbox-editor-preview code");
        const updatedLineNumbers = screen.component.querySelectorAll(".sandbox-editor-line");

        assertEquals(updatedPreviewCode.dataset.rawCode, "import { Component } from \"mainz\";\nclass Todo extends Component {}");
        assertEquals(updatedLineNumbers.length, 2);
        assert(updatedPreviewCode.innerHTML.includes("hljs-keyword"));
        assert(hljs.calls.length >= 2);
    } finally {
        screen.cleanup();
        hljs.cleanup();
    }
});

Deno.test("site/workshop: should keep validation flow working after editor upgrade", () => {
    setLocale("pt");
    const hljs = fixtures.installHighlightStub();
    const screen = renderMainzComponent(fixtures.InteractiveSandbox);

    try {
        screen.input(
            "textarea",
            "import { Component } from \"mainz\";\n\nclass Todo extends Component {\n}\n",
        );
        screen.click("button.button-primary");

        const feedback = screen.getBySelector<HTMLElement>(".checkpoint-result.ok");
        assertStringIncludes(feedback.textContent ?? "", "Passou");
    } finally {
        screen.cleanup();
        hljs.cleanup();
    }
});

Deno.test("site/workshop: should override highlight theme padding inside the live preview", () => {
    assertStringIncludes(pageStyles, ".sandbox-editor-preview code.hljs");
    assertStringIncludes(pageStyles, "padding: 0;");
    assertStringIncludes(pageStyles, "background: transparent;");
});
