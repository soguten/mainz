/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const { startApp } = await import("mainz");
const fixtures = await import(
    "./component.portal.fixture.tsx"
) as typeof import("./component.portal.fixture.tsx");

Deno.test("portal: should render into the nearest app overlay layer by default", async () => {
    document.body.innerHTML = `<div id="left"></div><div id="right"></div>`;

    const leftController = startApp(fixtures.PortalLeftApp, { mount: "#left" });
    const rightController = startApp(fixtures.PortalRightApp, { mount: "#right" });

    const leftLayer = document.querySelector<HTMLElement>(
        `#left [data-mainz-portal-layer="overlay"]`,
    );
    const rightLayer = document.querySelector<HTMLElement>(
        `#right [data-mainz-portal-layer="overlay"]`,
    );

    assert(leftLayer);
    assert(rightLayer);
    assertEquals(
        leftLayer.querySelector("[data-testid='left-portal']")?.textContent,
        "Left overlay",
    );
    assertEquals(
        rightLayer.querySelector("[data-testid='right-portal']")?.textContent,
        "Right overlay",
    );
    assertEquals(leftLayer.querySelector("[data-testid='right-portal']"), null);
    assertEquals(rightLayer.querySelector("[data-testid='left-portal']"), null);

    leftController.cleanup();
    rightController.cleanup();

    assertEquals(document.querySelector(`#left [data-mainz-portal-layer="overlay"]`), null);
    assertEquals(document.querySelector(`#right [data-mainz-portal-layer="overlay"]`), null);
});

Deno.test("portal: should render into a document layer only when scope is document", async () => {
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.PortalDocumentApp, { mount: "#app" });

    const appLayer = document.querySelector(`#app [data-mainz-portal-layer="overlay"]`);
    const documentLayer = document.querySelector<HTMLElement>(
        `body > [data-mainz-document-portal-layer="overlay"]`,
    );

    assert(appLayer);
    assert(documentLayer);
    assertEquals(
        documentLayer.querySelector("[data-testid='document-portal']")?.textContent,
        "Document overlay",
    );
    assertEquals(appLayer.querySelector("[data-testid='document-portal']"), null);

    controller.cleanup();
});

Deno.test("portal: should render into an explicit target and clean up on unmount", async () => {
    document.body.innerHTML = "";

    const target = document.createElement("div");
    document.body.appendChild(target);

    const screen = renderMainzComponent(fixtures.PortalTargetComponent, {
        props: { target },
    });

    assertEquals(
        target.querySelector("[data-testid='target-portal']")?.textContent,
        "Target overlay",
    );

    screen.cleanup();

    assertEquals(target.querySelector("[data-testid='target-portal']"), null);
});

Deno.test("portal: should omit portal content during SSG build", async () => {
    document.body.innerHTML = `<div id="app"></div>`;
    const globalScope = globalThis as Record<string, unknown>;
    const previousRenderMode = globalScope.__MAINZ_RENDER_MODE__;
    const previousRuntime = globalScope.__MAINZ_RUNTIME_ENV__;
    globalScope.__MAINZ_RENDER_MODE__ = "ssg";
    globalScope.__MAINZ_RUNTIME_ENV__ = "build";

    try {
        const controller = startApp(fixtures.PortalLeftApp, { mount: "#app" });
        const layer = document.querySelector<HTMLElement>(
            `#app [data-mainz-portal-layer="overlay"]`,
        );

        assert(layer);
        assertEquals(layer.querySelector("[data-testid='left-portal']"), null);

        controller.cleanup();
    } finally {
        if (previousRenderMode === undefined) {
            delete globalScope.__MAINZ_RENDER_MODE__;
        } else {
            globalScope.__MAINZ_RENDER_MODE__ = previousRenderMode;
        }

        if (previousRuntime === undefined) {
            delete globalScope.__MAINZ_RUNTIME_ENV__;
        } else {
            globalScope.__MAINZ_RUNTIME_ENV__ = previousRuntime;
        }
    }
});

Deno.test("portal: should preserve event ownership and clean up conditional portal content", async () => {
    document.body.innerHTML = `<div id="app"></div>`;

    const controller = startApp(fixtures.PortalInteractiveApp, { mount: "#app" });
    const layer = document.querySelector<HTMLElement>(`#app [data-mainz-portal-layer="overlay"]`);
    assert(layer);

    const action = layer.querySelector<HTMLButtonElement>("[data-testid='portal-action']");
    assert(action);
    assertEquals(action.textContent, "Ready");

    action.click();

    const updatedAction = layer.querySelector<HTMLButtonElement>("[data-testid='portal-action']");
    assert(updatedAction);
    assertEquals(updatedAction.textContent, "Clicked");

    const toggle = document.querySelector<HTMLButtonElement>("#app [data-testid='toggle']");
    assert(toggle);
    toggle.click();

    assertEquals(layer.querySelector("[data-testid='portal-action']"), null);

    controller.cleanup();
});
