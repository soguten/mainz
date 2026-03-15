/// <reference lib="deno.ns" />

/**
 * Render owner tests
 *
 * Ensures that DOM events created during render are
 * associated with the current Mainz component.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
import { getCurrentRenderOwner } from "../../jsx/render-owner.ts";

await setupMainzDom();

const fixtures = await import("./component.render-owner.fixture.tsx") as typeof import("./component.render-owner.fixture.tsx");

Deno.test("render owner: should register DOM events under the rendering Mainz component", () => {
    
    const screen = renderMainzComponent(fixtures.OwnerBoundClickComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("render owner: should tear down DOM listeners when the Mainz component unmounts", () => {
    
    const screen = renderMainzComponent(fixtures.TeardownOwnerComponent);
    const button = screen.getBySelector<HTMLButtonElement>("button");

    button.click();
    assertEquals(screen.component.state.clicks, 1);

    screen.cleanup();

    button.click();

    assertEquals(screen.component.state.clicks, 1);
});

Deno.test("render owner: should keep owner context for DOM events created inside functional children", () => {
    const screen = renderMainzComponent(fixtures.FunctionalChildOwnerComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});

Deno.test("render owner: should tear down listeners created inside functional children on unmount", () => {
    
    const screen = renderMainzComponent(fixtures.FunctionalTeardownComponent);
    const button = screen.getBySelector<HTMLButtonElement>("button");

    button.click();
    assertEquals(screen.component.state.count, 1);

    screen.cleanup();

    button.click();

    assertEquals(screen.component.state.count, 1);
});

Deno.test("render owner: should keep event ownership isolated across separate roots", () => {
    const screenA = renderMainzComponent(fixtures.IsolatedOwnerComponent, {
        props: { role: "app-a" },
    });
    const screenB = renderMainzComponent(fixtures.IsolatedOwnerComponent, {
        props: { role: "app-b" },
    });

    try {
        screenA.click("button[data-role='app-a']");
        assertEquals(screenA.getBySelector("button[data-role='app-a']").textContent, "1");
        assertEquals(screenB.getBySelector("button[data-role='app-b']").textContent, "0");

        screenB.click("button[data-role='app-b']");
        screenB.click("button[data-role='app-b']");
        assertEquals(screenA.getBySelector("button[data-role='app-a']").textContent, "1");
        assertEquals(screenB.getBySelector("button[data-role='app-b']").textContent, "2");
    } finally {
        screenA.cleanup();
        screenB.cleanup();
    }
});

Deno.test("render owner: cleanup of one root should not detach listeners from another root", () => {
    const screenA = renderMainzComponent(fixtures.IsolatedOwnerComponent, {
        props: { role: "app-a" },
    });
    const screenB = renderMainzComponent(fixtures.IsolatedOwnerComponent, {
        props: { role: "app-b" },
    });

    const buttonA = screenA.getBySelector<HTMLButtonElement>("button[data-role='app-a']");

    try {
        screenA.click("button[data-role='app-a']");
        assertEquals(screenA.component.state.count, 1);

        screenA.cleanup();
        buttonA.click();

        assertEquals(screenA.component.state.count, 1);

        screenB.click("button[data-role='app-b']");
        assertEquals(screenB.component.state.count, 1);
    } finally {
        screenA.cleanup();
        screenB.cleanup();
    }
});

Deno.test("render owner: parent rerender should preserve child listener ownership", () => {
    const screen = renderMainzComponent(fixtures.NestedOwnerBoundaryComponent);

    try {
        screen.click("button[data-role='child-action']");
        assertEquals(screen.getBySelector("button[data-role='child-action']").textContent, "1");

        screen.click("button[data-role='parent-rerender']");
        assertEquals(screen.getBySelector("p[data-role='parent-version']").textContent, "1");

        screen.click("button[data-role='child-action']");
        screen.click("button[data-role='child-action']");
        assertEquals(screen.getBySelector("button[data-role='child-action']").textContent, "3");
    } finally {
        screen.cleanup();
    }
});

Deno.test("render owner: parent subtree removal should tear down nested subtree listeners", () => {
    const screen = renderMainzComponent(fixtures.NestedOwnerBoundaryComponent);
    const childButton = screen.getBySelector<HTMLButtonElement>("button[data-role='child-action']");

    try {
        childButton.click();
        assertEquals(screen.getBySelector("button[data-role='child-action']").textContent, "1");

        screen.click("button[data-role='hide-child']");
        assertEquals(screen.component.querySelector("button[data-role='child-action']"), null);
        assertEquals(screen.getBySelector("p[data-role='child-removed']").textContent, "removed");

        childButton.click();

        assertEquals(childButton.textContent, "1");
    } finally {
        screen.cleanup();
    }
});

Deno.test("render owner: should restore owner stack after render throws", () => {
    assertThrows(
        () => renderMainzComponent(fixtures.ThrowingRenderOwnerComponent),
        Error,
        "render-owner fixture failure",
    );

    assertEquals(getCurrentRenderOwner(), undefined);

    const recoveryScreen = renderMainzComponent(fixtures.OwnerBoundClickComponent);
    try {
        recoveryScreen.click("button");
        assertEquals(recoveryScreen.getBySelector("button").textContent, "1");
    } finally {
        recoveryScreen.cleanup();
    }
});
