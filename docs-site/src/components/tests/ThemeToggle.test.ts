/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { setupMainzDom, renderMainzComponent } from "../../../../src/testing/mainz-testing.ts";

await setupMainzDom();

const { ThemeToggle } = await import("../ThemeToggle.tsx") as typeof import("../ThemeToggle.tsx");

Deno.test("ThemeToggle toggles document theme and persists the choice", async () => {
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";

    const view = renderMainzComponent(ThemeToggle);

    try {
        assertEquals(document.documentElement.dataset.theme, "light");
        view.click("button");

        assertEquals(document.documentElement.dataset.theme, "dark");
        assertEquals(document.documentElement.style.colorScheme, "dark");
        assertEquals(localStorage.getItem("mainz-docs-theme"), "dark");
    } finally {
        view.cleanup();
        localStorage.clear();
        document.documentElement.dataset.theme = "light";
        document.documentElement.style.colorScheme = "light";
    }
});
