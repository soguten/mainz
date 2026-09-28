/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { Component } from "../../components/component.ts";
import { ensureMainzCustomElementDefined } from "../../components/registry.ts";
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

Deno.test("ssg/happy-dom: should isolate custom elements across concurrent windows", async () => {
  let ready = 0;
  let release!: () => void;
  const bothReady = new Promise<void>((resolve) => {
    release = resolve;
  });

  const render = (name: string) =>
    withHappyDom(async (activeWindow) => {
      ready++;
      if (ready === 2) release();
      await bothReady;

      class ParallelComponent extends Component {
        static override tagName = `x-parallel-${name}`;

        override render(): HTMLElement {
          return document.createElement("output");
        }
      }

      const tagName = ensureMainzCustomElementDefined(
        ParallelComponent as never,
      );
      const element = document.createElement(tagName) as unknown as HTMLElement;
      document.body.append(element);

      assertEquals(element instanceof activeWindow.HTMLElement, true);
      assertEquals(
        element.ownerDocument as unknown,
        activeWindow.document as unknown,
      );
      assertEquals(element.firstElementChild?.tagName, "OUTPUT");
      return element.outerHTML;
    });

  const results = await Promise.all([render("one"), render("two")]);
  assertEquals(results, [
    "<x-parallel-one><output></output></x-parallel-one>",
    "<x-parallel-two><output></output></x-parallel-two>",
  ]);
});
