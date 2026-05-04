/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { Component } from "mainz";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

class InlineTsxOrderComponent extends Component<{}, { label: string }> {
    protected override initState() {
        return { label: "ready" };
    }

    override render(): HTMLElement {
        return <section data-kind="inline-order">{this.state.label}</section>;
    }
}

await setupMainzDom();

Deno.test("components/test.tsx: should allow inline TSX components after static imports before DOM setup", () => {
    const screen = renderMainzComponent(InlineTsxOrderComponent);

    try {
        assertEquals(
            screen.getBySelector("section").getAttribute("data-kind"),
            "inline-order",
        );
        assertEquals(screen.getBySelector("section").textContent, "ready");

        screen.component.setState({ label: "updated" });

        assertEquals(screen.getBySelector("section").textContent, "updated");
    } finally {
        screen.cleanup();
    }
});
