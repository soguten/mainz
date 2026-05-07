/// <reference lib="deno.ns" />

/**
 * Testing helper bootstrap regression test
 *
 * Guards against false positives where prerendered HTML already looks correct
 * before the synchronization event that marks bootstrap completion fires.
 */

import { assertEquals } from "@std/assert";
import { MAINZ_NAVIGATION_READY_EVENT } from "../../runtime-events.ts";
import { nextTick, setupMainzDom, waitForNavigationReady } from "../index.ts";

await setupMainzDom();

Deno.test("testing helper/regression: should not treat prerendered DOM as bootstrapped before the navigation-ready event fires", async () => {
  document.title = "Deferred docs";
  document.documentElement.lang = "en";
  document.body.innerHTML = `
        <main id="app">
            <section data-page="deferred-bootstrap" data-ready="false">Deferred docs</section>
        </main>
    `;
  const navigationReady = waitForNavigationReady({
    locale: "en",
    matchedPath: "/docs",
    message: "Expected navigation-ready event for /docs.",
  });
  let resolved = false;
  void navigationReady.then(() => {
    resolved = true;
  });

  await nextTick();

  assertEquals(document.title, "Deferred docs");
  assertEquals(document.documentElement.lang, "en");
  assertEquals(
    document.querySelector('[data-page="deferred-bootstrap"]')?.textContent,
    "Deferred docs",
  );
  assertEquals(resolved, false);

  document.dispatchEvent(
    new CustomEvent(MAINZ_NAVIGATION_READY_EVENT, {
      detail: {
        mode: "spa",
        navigationType: "initial",
        path: "/docs",
        matchedPath: "/docs",
        locale: "en",
        url: "https://mainz.local/",
        basePath: "/",
        navigationSequence: 1,
      },
    }),
  );

  await navigationReady;
  assertEquals(resolved, true);
});
