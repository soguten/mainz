/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
  applyResolvedAssetDefinitionsToDocument,
  applyResolvedAssetDefinitionsToHtml,
  createAssetContext,
  disableAsset,
  link,
  noscript,
  resolveAssetDefinitions,
  script,
  style,
} from "../index.ts";
import { setupMainzDom } from "../../testing/index.ts";

await setupMainzDom();

Deno.test("components/page assets: should merge app and page assets with page precedence and when()", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      script({
        id: "shared",
        src: "https://cdn.example.com/app.js",
      }),
      script({
        id: "prod-only",
        src: "https://cdn.example.com/prod.js",
        when: ({ env }) => env.prod,
      }),
    ],
    pageAssets: [
      script({
        id: "shared",
        src: "/assets/page-shared.js",
      }),
      script({
        id: "docs-only",
        src: "/assets/docs.js",
        when: ({ route }) => route.path.startsWith("/docs"),
      }),
    ],
    context: createAssetContext({
      appId: "docs",
      phase: "build",
      renderMode: "ssg",
      navigation: "mpa",
      path: "/docs/intro",
      matchedPath: "/docs/:slug",
      locale: "en",
      envMode: "production",
    }),
  });

  assertEquals(
    resolved.map((asset) => [
      asset.id,
      "kind" in asset && asset.kind === "script" ? asset.src : "",
    ]),
    [
      ["prod-only", "https://cdn.example.com/prod.js"],
      ["shared", "/assets/page-shared.js"],
      ["docs-only", "/assets/docs.js"],
    ],
  );
});

Deno.test("components/page assets: should order assets using dependsOn, before, and after", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      script({
        id: "core",
        src: "/assets/core.js",
      }),
      script({
        id: "analytics",
        src: "/assets/analytics.js",
        after: ["core"],
      }),
    ],
    pageAssets: [
      script({
        id: "bootstrap",
        inline: "bootstrap();",
        dependsOn: ["core"],
        before: ["analytics"],
      }),
    ],
    context: createAssetContext({
      appId: "site",
      phase: "client",
      renderMode: "csr",
      navigation: "spa",
      path: "/",
    }),
  });

  assertEquals(
    resolved.map((asset) => asset.id),
    ["core", "bootstrap", "analytics"],
  );
});

Deno.test("components/page assets: should reject missing hard dependencies", () => {
  const error = assertThrows(() =>
    resolveAssetDefinitions({
      pageAssets: [
        script({
          id: "bootstrap",
          inline: "bootstrap();",
          dependsOn: ["missing"],
        }),
      ],
      context: createAssetContext({
        appId: "site",
        phase: "client",
        renderMode: "csr",
        navigation: "spa",
        path: "/",
      }),
    })
  ) as Error;

  assertEquals(
    error.message,
    'page script asset "bootstrap" targeting "head" depends on missing asset "missing". Available assets after filtering: page script asset "bootstrap" targeting "head".',
  );
});

Deno.test("components/page assets: should allow a page asset to suppress an app asset by id", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      script({
        id: "analytics",
        src: "https://cdn.example.com/analytics.js",
      }),
    ],
    pageAssets: [
      disableAsset("analytics"),
    ],
    context: createAssetContext({
      appId: "site",
      phase: "client",
      renderMode: "csr",
      navigation: "spa",
      path: "/admin",
    }),
  });

  assertEquals(resolved, []);
});

Deno.test("components/page assets: should apply managed scripts to the document by target", () => {
  document.head.innerHTML = "";
  document.body.innerHTML = '<main id="app"></main>';

  applyResolvedAssetDefinitionsToDocument([
    script({
      id: "head-script",
      src: "/assets/head.js",
      target: "head",
      strategy: "defer",
    }),
    script({
      id: "footer-script",
      inline: "footer();",
      target: "body:end",
    }),
  ]);

  assertEquals(
    document.head.querySelector('script[data-mainz-asset-id="head-script"]')
      ?.getAttribute("src"),
    "/assets/head.js",
  );
  assertEquals(
    document.body.querySelector('script[data-mainz-asset-id="footer-script"]')
      ?.textContent,
    "footer();",
  );
});

Deno.test("components/page assets: should support link assets with the same conditional pipeline", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      link({
        id: "fonts-preconnect",
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
      }),
      link({
        id: "fonts-stylesheet",
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Literata:wght@400;700&display=swap",
        when: ({ route }) => route.locale === "pt-BR",
      }),
    ],
    pageAssets: [
      link({
        id: "fonts-stylesheet",
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Literata:wght@400;700&display=swap&subset=latin",
      }),
    ],
    context: createAssetContext({
      appId: "docs",
      phase: "build",
      renderMode: "ssg",
      navigation: "mpa",
      path: "/docs/intro",
      locale: "pt-BR",
      envMode: "production",
    }),
  });

  assertEquals(
    resolved.map((asset) => [
      asset.id,
      "kind" in asset ? asset.kind : "disabled",
      "kind" in asset && asset.kind === "link" ? asset.href : "",
    ]),
    [
      ["fonts-preconnect", "link", "https://fonts.gstatic.com"],
      [
        "fonts-stylesheet",
        "link",
        "https://fonts.googleapis.com/css2?family=Literata:wght@400;700&display=swap&subset=latin",
      ],
    ],
  );
});

Deno.test("components/page assets: should apply managed links to the document and rendered html", () => {
  document.head.innerHTML = "";
  document.body.innerHTML = '<main id="app"></main>';

  const assets = [
    link({
      id: "fonts-preconnect",
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossorigin: "anonymous",
    }),
    link({
      id: "app-styles",
      rel: "stylesheet",
      href: "/assets/app.css",
      target: "body:end",
      media: "print",
    }),
  ] as const;

  applyResolvedAssetDefinitionsToDocument(assets);

  assertEquals(
    document.head.querySelector('link[data-mainz-asset-id="fonts-preconnect"]')
      ?.getAttribute("crossorigin"),
    "anonymous",
  );
  assertEquals(
    document.body.querySelector('link[data-mainz-asset-id="app-styles"]')
      ?.getAttribute("media"),
    "print",
  );

  const html = applyResolvedAssetDefinitionsToHtml(
    '<html><head></head><body><main id="app"></main></body></html>',
    assets,
  );

  assertEquals(
    html.includes(
      'link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"',
    ),
    true,
  );
  assertEquals(
    html.includes('link rel="stylesheet" href="/assets/app.css" media="print"'),
    true,
  );
  assertEquals(html.includes("data-mainz-asset-signature"), false);
});

Deno.test("components/page assets: should support inline style assets with precedence and html rendering", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      style({
        id: "theme-vars",
        css: ":root { --brand: #111; }",
        when: ({ env }) => env.prod,
      }),
    ],
    pageAssets: [
      style({
        id: "theme-vars",
        css: ":root { --brand: #0044cc; }",
      }),
    ],
    context: createAssetContext({
      appId: "docs",
      phase: "build",
      renderMode: "ssg",
      navigation: "mpa",
      path: "/docs/intro",
      envMode: "production",
    }),
  });

  assertEquals(
    resolved.map((asset) => [
      asset.id,
      "kind" in asset ? asset.kind : "disabled",
      "kind" in asset && asset.kind === "style" ? asset.css : "",
    ]),
    [["theme-vars", "style", ":root { --brand: #0044cc; }"]],
  );

  document.head.innerHTML = "";
  document.body.innerHTML = '<main id="app"></main>';
  applyResolvedAssetDefinitionsToDocument(resolved);

  assertEquals(
    document.head.querySelector('style[data-mainz-asset-id="theme-vars"]')
      ?.textContent,
    ":root { --brand: #0044cc; }",
  );

  const html = applyResolvedAssetDefinitionsToHtml(
    '<html><head></head><body><main id="app"></main></body></html>',
    resolved,
  );

  assertEquals(
    html.includes("<style"),
    true,
  );
  assertEquals(
    html.includes(":root { --brand: #0044cc; }"),
    true,
  );
});

Deno.test("components/page assets: should support noscript assets with app-page precedence", () => {
  const resolved = resolveAssetDefinitions({
    appAssets: [
      noscript({
        id: "tag-manager-fallback",
        html: '<iframe src="https://example.com/app-fallback"></iframe>',
        target: "body:start",
      }),
    ],
    pageAssets: [
      noscript({
        id: "tag-manager-fallback",
        html:
          '<iframe src="https://example.com/page-fallback" title="fallback"></iframe>',
        target: "body:start",
      }),
    ],
    context: createAssetContext({
      appId: "docs",
      phase: "build",
      renderMode: "ssg",
      navigation: "mpa",
      path: "/docs/intro",
    }),
  });

  assertEquals(
    resolved.map((asset) => [
      asset.id,
      "kind" in asset ? asset.kind : "disabled",
      "kind" in asset && asset.kind === "noscript" ? asset.html : "",
    ]),
    [[
      "tag-manager-fallback",
      "noscript",
      '<iframe src="https://example.com/page-fallback" title="fallback"></iframe>',
    ]],
  );

  document.head.innerHTML = "";
  document.body.innerHTML = '<main id="app"></main>';
  applyResolvedAssetDefinitionsToDocument(resolved);

  assertEquals(
    document.body.querySelector(
      'noscript[data-mainz-asset-id="tag-manager-fallback"]',
    )
      ?.innerHTML,
    '<iframe src="https://example.com/page-fallback" title="fallback"></iframe>',
  );

  const html = applyResolvedAssetDefinitionsToHtml(
    '<html><head></head><body><main id="app"></main></body></html>',
    resolved,
  );

  assertEquals(
    html.includes("<noscript"),
    true,
  );
  assertEquals(
    html.includes('src="https://example.com/page-fallback"'),
    true,
  );
});

Deno.test("components/page assets: should describe cross-target ordering errors with asset details", () => {
  const error = assertThrows(() =>
    resolveAssetDefinitions({
      appAssets: [
        script({
          id: "head-sdk",
          src: "/assets/head-sdk.js",
          target: "head",
        }),
      ],
      pageAssets: [
        script({
          id: "footer-bootstrap",
          inline: "bootstrap();",
          target: "body:end",
          dependsOn: ["head-sdk"],
        }),
      ],
      context: createAssetContext({
        appId: "site",
        phase: "client",
        renderMode: "csr",
        navigation: "spa",
        path: "/",
      }),
    })
  ) as Error;

  assertEquals(
    error.message,
    'script asset "footer-bootstrap" targeting "body:end" cannot use dependsOn with script asset "head-sdk" targeting "head" because they target different document regions ("body:end" vs "head").',
  );
});

Deno.test("components/page assets: should describe cycles with asset details", () => {
  const error = assertThrows(() =>
    resolveAssetDefinitions({
      pageAssets: [
        script({
          id: "a",
          inline: "a();",
          after: ["b"],
        }),
        script({
          id: "b",
          inline: "b();",
          after: ["a"],
        }),
      ],
      context: createAssetContext({
        appId: "site",
        phase: "client",
        renderMode: "csr",
        navigation: "spa",
        path: "/",
      }),
    })
  ) as Error;

  assertEquals(
    error.message,
    'Asset ordering produced a cycle among page script asset "a" targeting "head", page script asset "b" targeting "head". Check dependsOn, before, and after relationships for circular references.',
  );
});
