/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

const fixtures = await import(
  "./page.head.fixture.tsx"
) as typeof import("./page.head.fixture.tsx");

Deno.test("components/page head: should apply managed head tags when a Page is mounted", () => {
  const screen = renderMainzComponent(fixtures.HeadFixturePage);

  assertEquals(document.title, "Fixture Title");
  assertEquals(
    document.head.querySelector(
      'meta[data-mainz-head-managed="true"][name="description"]',
    )
      ?.getAttribute("content"),
    "Fixture description",
  );
  assertEquals(
    document.head.querySelector(
      'link[data-mainz-head-managed="true"][rel="canonical"]',
    )
      ?.getAttribute("href"),
    "/head",
  );

  screen.cleanup();
});

Deno.test("components/page head: should replace managed tags when navigating between pages and preserve unmanaged nodes", () => {
  const unmanagedMeta = document.createElement("meta");
  unmanagedMeta.setAttribute("name", "viewport-marker");
  unmanagedMeta.setAttribute("content", "persist");
  document.head.appendChild(unmanagedMeta);

  const unmanagedStyle = document.createElement("style");
  unmanagedStyle.setAttribute("data-role", "global-style");
  unmanagedStyle.textContent = "body { background: white; }";
  document.head.appendChild(unmanagedStyle);

  const firstScreen = renderMainzComponent(fixtures.HeadFixturePage);
  const secondScreen = renderMainzComponent(fixtures.AlternateHeadFixturePage);

  try {
    assertEquals(document.title, "Alternate Fixture Title");
    assertEquals(
      document.head.querySelectorAll('[data-mainz-head-managed="true"]').length,
      3,
    );
    assertEquals(
      document.head.querySelector(
        'meta[data-mainz-head-managed="true"][name="description"]',
      ),
      null,
    );
    assertEquals(
      document.head.querySelector(
        'meta[data-mainz-head-managed="true"][property="og:title"]',
      )
        ?.getAttribute(
          "content",
        ),
      "Alternate Fixture OG",
    );
    assertEquals(
      document.head.querySelector(
        'link[data-mainz-head-managed="true"][rel="canonical"]',
      )
        ?.getAttribute("href"),
      "/head-alt",
    );
    assertEquals(
      document.head.querySelector(
        'link[data-mainz-head-managed="true"][rel="alternate"][hreflang="en"]',
      )?.getAttribute("href"),
      "/head-alt",
    );
    assertEquals(
      document.head.querySelector('meta[name="viewport-marker"]')?.getAttribute(
        "content",
      ),
      "persist",
    );
    assertEquals(
      document.head.querySelector('style[data-role="global-style"]')
        ?.textContent,
      "body { background: white; }",
    );
  } finally {
    firstScreen.cleanup();
    secondScreen.cleanup();
    unmanagedMeta.remove();
    unmanagedStyle.remove();
  }
});

Deno.test("components/page head: should remove previously managed tags when a headless page is mounted", () => {
  const firstScreen = renderMainzComponent(fixtures.HeadFixturePage);
  const secondScreen = renderMainzComponent(fixtures.HeadlessFixturePage);

  assertEquals(
    document.head.querySelectorAll('[data-mainz-head-managed="true"]').length,
    0,
  );

  firstScreen.cleanup();
  secondScreen.cleanup();
});

Deno.test("components/page head: should merge inherited head with props head without dropping unrelated metadata", () => {
  const screen = renderMainzComponent(fixtures.MergedHeadFixturePage, {
    props: {
      head: {
        meta: [
          { name: "description", content: "Override description" },
        ],
        links: [
          { rel: "canonical", href: "/override" },
        ],
      },
    },
  });

  try {
    assertEquals(document.title, "Merged Fixture Title");
    assertEquals(
      document.head.querySelector(
        'meta[data-mainz-head-managed="true"][name="description"]',
      )
        ?.getAttribute(
          "content",
        ),
      "Override description",
    );
    assertEquals(
      document.head.querySelector(
        'meta[data-mainz-head-managed="true"][property="og:type"]',
      )
        ?.getAttribute(
          "content",
        ),
      "website",
    );
    assertEquals(
      document.head.querySelector(
        'link[data-mainz-head-managed="true"][rel="canonical"]',
      )
        ?.getAttribute("href"),
      "/override",
    );
    assertEquals(
      document.head.querySelector(
        'link[data-mainz-head-managed="true"][rel="preconnect"]',
      )
        ?.getAttribute("href"),
      "https://cdn.example.com",
    );
  } finally {
    screen.cleanup();
  }
});
