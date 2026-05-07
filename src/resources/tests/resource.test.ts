/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { defineResource, ResourceAccessError } from "../index.ts";
import { createPageLoadContext } from "../../components/index.ts";

Deno.test("resources: defineResource should expose conservative defaults", () => {
  const resource = defineResource({
    async load() {
      return "ok";
    },
  });

  assertEquals(resource.kind, "mainz.resource");
  assertEquals(resource.name, "anonymous-resource");
  assertEquals(resource.visibility, "private");
  assertEquals(resource.execution, "either");
  assertEquals(resource.cache, "no-store");
  assertEquals(resource.key(undefined), undefined);
});

Deno.test("resources: defineResource should preserve explicit metadata and reuse load via read", async () => {
  const calls: Array<
    { params: { slug: string }; context: { locale: string } }
  > = [];
  const resource = defineResource({
    name: "docs-article",
    visibility: "public" as const,
    execution: "build" as const,
    cache: { revalidate: 300, tags: ["docs"] },
    key(params: { slug: string }) {
      return ["docs", params.slug];
    },
    async load(params: { slug: string }, context: { locale: string }) {
      calls.push({ params, context });
      return `${context.locale}:${params.slug}`;
    },
  });

  const value = await resource.read({ slug: "intro" }, { locale: "pt-BR" });

  assertEquals(resource.name, "docs-article");
  assertEquals(resource.visibility, "public");
  assertEquals(resource.execution, "build");
  assertEquals(resource.cache, { revalidate: 300, tags: ["docs"] });
  assertEquals(resource.key({ slug: "intro" }), ["docs", "intro"]);
  assertEquals(value, "pt-BR:intro");
  assertEquals(calls, [{
    params: { slug: "intro" },
    context: { locale: "pt-BR" },
  }]);
});

Deno.test("resources: defineResource should return a frozen resource object", () => {
  const resource = defineResource({
    load() {
      return "ok";
    },
  });

  assert(Object.isFrozen(resource));
});

Deno.test("resources: page load context should read public build-safe resources during ssg", async () => {
  const context = createPageLoadContext({
    params: { slug: "intro" },
    locale: "en",
    url: new URL("https://mainz.local/docs/intro"),
    renderMode: "ssg",
    navigationMode: "mpa",
    runtime: "build",
  });
  const resource = defineResource({
    name: "docs-article",
    visibility: "public" as const,
    execution: "build" as const,
    async load(params: { slug: string }) {
      return { slug: params.slug };
    },
  });

  const value = await context.resources.read(
    resource,
    { slug: "intro" },
    undefined,
  );

  assertEquals(value, { slug: "intro" });
});

Deno.test("resources: page load context should reject private resources during ssg", () => {
  const context = createPageLoadContext({
    params: { slug: "intro" },
    locale: "en",
    url: new URL("https://mainz.local/docs/intro"),
    renderMode: "ssg",
    navigationMode: "mpa",
    runtime: "build",
  });
  const resource = defineResource({
    name: "current-user",
    visibility: "private" as const,
    async load() {
      return { id: "user-1" };
    },
  });

  let errorMessage = "";
  let errorCode = "";
  let resourceName = "";
  try {
    context.resources.read(resource, undefined, undefined);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof ResourceAccessError) {
      errorCode = error.code;
      resourceName = error.resourceName;
    }
  }

  assertEquals(
    errorMessage,
    'Resource "current-user" is private and cannot be read during SSG.',
  );
  assertEquals(errorCode, "private-in-ssg");
  assertEquals(resourceName, "current-user");
});

Deno.test('resources: page load context should reject execution:"client" resources during ssg', () => {
  const context = createPageLoadContext({
    params: { slug: "intro" },
    locale: "en",
    url: new URL("https://mainz.local/docs/intro"),
    renderMode: "ssg",
    navigationMode: "mpa",
    runtime: "build",
  });
  const resource = defineResource({
    name: "current-user",
    visibility: "public" as const,
    execution: "client" as const,
    async load() {
      return { id: "user-1" };
    },
  });

  let errorMessage = "";
  let errorCode = "";
  let resourceName = "";
  try {
    context.resources.read(resource, undefined, undefined);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof ResourceAccessError) {
      errorCode = error.code;
      resourceName = error.resourceName;
    }
  }

  assertEquals(
    errorMessage,
    'Resource "current-user" uses execution: "client" and cannot execute during SSG.',
  );
  assertEquals(errorCode, "client-in-ssg");
  assertEquals(resourceName, "current-user");
});

Deno.test("resources: page load context should reject build-only resources in the client runtime", () => {
  const context = createPageLoadContext({
    params: { slug: "intro" },
    locale: "en",
    url: new URL("https://mainz.local/docs/intro"),
    renderMode: "csr",
    navigationMode: "spa",
    runtime: "client",
  });
  const resource = defineResource({
    name: "docs-index",
    visibility: "public" as const,
    execution: "build" as const,
    async load() {
      return [{ slug: "intro" }];
    },
  });

  let errorMessage = "";
  let errorCode = "";
  let resourceName = "";
  try {
    context.resources.read(resource, undefined, undefined);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof ResourceAccessError) {
      errorCode = error.code;
      resourceName = error.resourceName;
    }
  }

  assertEquals(
    errorMessage,
    'Resource "docs-index" is build-only and cannot execute in the client runtime.',
  );
  assertEquals(errorCode, "build-in-client");
  assertEquals(resourceName, "docs-index");
});
