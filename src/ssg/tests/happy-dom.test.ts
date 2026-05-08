/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { withHappyDom } from "../happy-dom.ts";

Deno.test("ssg/happy-dom: should strip external document resources from document.write", async () => {
  await withHappyDom(async () => {
    document.write(`
            <!doctype html>
            <html lang="en">
                <head>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="stylesheet" href="https://cdn.example.com/site.css" />
                    <script defer src="https://cdn.example.com/site.js"></script>
                    <link rel="canonical" href="/docs/example" />
                </head>
                <body>
                    <main id="app"></main>
                </body>
            </html>
        `);
    document.close();

    assertEquals(document.querySelectorAll('link[href^="https://"]').length, 0);
    assertEquals(
      document.querySelectorAll('script[src^="https://"]').length,
      0,
    );
    assert(document.querySelector('link[href="/docs/example"]'));
    assert(document.getElementById("app"));
  });
});

Deno.test("ssg/happy-dom: should cancel bare global timers created during a session", async () => {
  let fired = false;

  await withHappyDom(async () => {
    setTimeout(() => {
      fired = true;
    }, 25);
  });

  await new Promise((resolve) => setTimeout(resolve, 60));
  assertEquals(fired, false);
});
