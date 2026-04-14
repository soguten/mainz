import { assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";
import {
    eventToShortcutChord,
    formatShortcutChord,
    matchesShortcut,
    normalizeShortcutChord,
} from "mainz/typecase";

await setupMainzDom();

Deno.test("typecase/shortcut: normalizes semantic chords by platform", () => {
    assertEquals(
        normalizeShortcutChord(" Shift + Mod + k ", { platform: "standard" }),
        "Ctrl+Shift+K",
    );
    assertEquals(
        normalizeShortcutChord("Shift+Mod+K", { platform: "apple" }),
        "Shift+Meta+K",
    );
});

Deno.test("typecase/shortcut: formats display labels for standard and apple platforms", () => {
    assertEquals(
        formatShortcutChord("Mod+K", { platform: "standard" }).map((part) => part.label),
        ["Ctrl", "K"],
    );
    assertEquals(
        formatShortcutChord("Shift+Mod+P", { platform: "apple" }).map((part) => part.label),
        ["⇧", "⌘", "P"],
    );
});

Deno.test("typecase/shortcut: uses stable names for layout-sensitive keys", () => {
    const event = new KeyboardEvent("keydown", {
        code: "Slash",
        ctrlKey: true,
        key: "?",
        shiftKey: true,
    });

    assertEquals(eventToShortcutChord(event), "Ctrl+Slash");
    assertEquals(matchesShortcut(event, "Mod+Slash", { platform: "standard" }), true);
});

Deno.test("typecase/shortcut: matches keyboard events against semantic chords", () => {
    const standardEvent = new KeyboardEvent("keydown", {
        code: "KeyK",
        ctrlKey: true,
        key: "k",
    });
    const appleEvent = new KeyboardEvent("keydown", {
        code: "KeyK",
        key: "k",
        metaKey: true,
    });

    assertEquals(matchesShortcut(standardEvent, "Mod+K", { platform: "standard" }), true);
    assertEquals(matchesShortcut(appleEvent, "Mod+K", { platform: "apple" }), true);
});
