/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
  createPageLoadContext,
  load,
  Locales,
  Page,
  RenderMode,
} from "../index.ts";
import {
  isPageConstructor,
  resolvePageLocales,
  resolvePageRenderConfig,
  resolvePageRenderMode,
  resolvePageRoutePath,
} from "../page.ts";

Deno.test("components/page helpers: load.byParam should resolve a single route param", async () => {
  const context = createPageLoadContext({
    params: { slug: "intro" },
    locale: "en",
    url: new URL("https://example.com/docs/intro"),
    renderMode: "ssg",
    navigationMode: "spa",
  });

  const resolveLoad = load.byParam("slug", async (slug, currentContext) => {
    return `${slug}:${currentContext.locale}`;
  });

  assertEquals(await resolveLoad(context), "intro:en");
});

Deno.test("components/page helpers: load.byParams should resolve a param subset object", async () => {
  const context = createPageLoadContext({
    params: { locale: "pt-br", slug: "intro" },
    locale: "pt-BR",
    url: new URL("https://example.com/pt-br/docs/intro"),
    renderMode: "csr",
    navigationMode: "mpa",
  });

  const resolveLoad = load.byParams(
    ["locale", "slug"] as const,
    async (params, currentContext) => {
      return `${params.locale}:${params.slug}:${currentContext.navigationMode}`;
    },
  );

  assertEquals(await resolveLoad(context), "pt-br:intro:mpa");
});

Deno.test("components/page helpers: Locales decorator should keep locale metadata outside head()", () => {
  @Locales("en", "pt-BR")
  class LocalizedPage extends Page {
    override head() {
      return {
        title: "Localized",
      };
    }

    override render(): HTMLElement {
      return document.createElement("main");
    }
  }

  assertEquals(new LocalizedPage().head(), {
    title: "Localized",
  });
  assertEquals(resolvePageLocales(LocalizedPage), ["en", "pt-BR"]);
});

Deno.test("components/page helpers: RenderMode should preserve explicit ssg fallback config", () => {
  @RenderMode("ssg", { fallback: "csr" })
  class FallbackPage extends Page {
    override render(): HTMLElement {
      return document.createElement("main");
    }
  }

  assertEquals(resolvePageRenderMode(FallbackPage), "ssg");
  assertEquals(resolvePageRenderConfig(FallbackPage), {
    mode: "ssg",
    fallback: "csr",
  });
});

Deno.test("components/page helpers: Locales decorator should normalize and diagnose locale tags", () => {
  @Locales("en_us", "sr_latn_rs")
  class CanonicalizedPage extends Page {
    override render(): HTMLElement {
      return document.createElement("main");
    }
  }

  assertEquals(resolvePageLocales(CanonicalizedPage), ["en-US", "sr-Latn-RS"]);

  assertThrows(
    () => {
      @Locales("en--US")
      class InvalidLocalizedPage extends Page {
        override render(): HTMLElement {
          return document.createElement("main");
        }
      }

      return InvalidLocalizedPage;
    },
    Error,
    '@Locales() received invalid locale "en--US" at index 0.',
  );
});

Deno.test("components/page helpers: should read page metadata through shared symbols across package instances", () => {
  class ForeignCompatiblePage {}

  (ForeignCompatiblePage as unknown as Record<PropertyKey, unknown>)[
    Symbol.for("mainz.page.constructor")
  ] = true;
  (ForeignCompatiblePage as unknown as Record<PropertyKey, unknown>)[
    Symbol.for("mainz.page.route-path")
  ] = "/foreign";
  (ForeignCompatiblePage as unknown as Record<PropertyKey, unknown>)[
    Symbol.for("mainz.page.render-mode")
  ] = {
    mode: "ssg",
    fallback: "csr",
  };
  (ForeignCompatiblePage as unknown as Record<PropertyKey, unknown>)[
    Symbol.for("mainz.page.locales")
  ] = ["en", "pt-BR"];

  assertEquals(isPageConstructor(ForeignCompatiblePage), true);
  assertEquals(resolvePageRoutePath(ForeignCompatiblePage), "/foreign");
  assertEquals(resolvePageRenderMode(ForeignCompatiblePage), "ssg");
  assertEquals(resolvePageRenderConfig(ForeignCompatiblePage), {
    mode: "ssg",
    fallback: "csr",
  });
  assertEquals(resolvePageLocales(ForeignCompatiblePage), ["en", "pt-BR"]);
});
