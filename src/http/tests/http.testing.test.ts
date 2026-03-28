/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import {
    createMockFetch,
    delayWithSignal,
    httpError,
    jsonResponse,
    networkError,
    query,
    requestJson,
    sequence,
    textResponse,
} from "../testing.ts";

Deno.test("http/testing: jsonResponse should emit json content-type and body", async () => {
    const response = jsonResponse({ ok: true }, {
        headers: {
            "x-test": "yes",
        },
    });

    assertEquals(response.headers.get("content-type"), "application/json");
    assertEquals(response.headers.get("x-test"), "yes");
    assertEquals(await response.json(), { ok: true });
});

Deno.test("http/testing: textResponse should emit text content-type", async () => {
    const response = textResponse("hello");

    assertEquals(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assertEquals(await response.text(), "hello");
});

Deno.test("http/testing: httpError should apply status defaults", async () => {
    const response = httpError(404, { message: "Not found" });

    assertEquals(response.status, 404);
    assertEquals(response.statusText, "Not Found");
    assertEquals(await response.json(), { message: "Not found" });
});

Deno.test("http/testing: delayWithSignal should resolve after delay", async () => {
    const result = await delayWithSignal("ok", undefined, 0);
    assertEquals(result, "ok");
});

Deno.test("http/testing: delayWithSignal should reject when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await assertRejects(
        () => delayWithSignal("ok", controller.signal, 10),
        Error,
        "aborted",
    );
});

Deno.test("http/testing: createMockFetch should route by method and pathname params", async () => {
    const mockFetch = createMockFetch((routes) => {
        routes.get("/stories/:slug", ({ params }) => jsonResponse({ slug: params.slug }));
    });

    const response = await mockFetch("https://example.test/stories/hello");

    assertEquals(await response.json(), { slug: "hello" });
});

Deno.test("http/testing: createMockFetch should return 404 for unhandled requests", async () => {
    const mockFetch = createMockFetch(() => {});
    const response = await mockFetch("https://example.test/missing");

    assertEquals(response.status, 404);
    assertEquals(await response.json(), {
        message: "Unhandled mock request: GET /missing",
    });
});

Deno.test("http/testing: networkError should throw a transport-like failure", () => {
    assertRejects(
        async () => {
            networkError("offline");
        },
        TypeError,
        "offline",
    );
});

Deno.test("http/testing: sequence should advance through steps and then repeat the last one", () => {
    const run = sequence(
        () => "first",
        () => "second",
    );

    assertEquals(run(), "first");
    assertEquals(run(), "second");
    assertEquals(run(), "second");
});

Deno.test("http/testing: requestJson should read typed request payloads", async () => {
    const request = new Request("https://example.test/stories", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "hello" }),
    });

    const body = await requestJson<{ slug: string }>(request);
    assertEquals(body, { slug: "hello" });
});

Deno.test("http/testing: query should expose query params from url-like inputs", () => {
    assertEquals(query("https://example.test/stories?page=2").get("page"), "2");
    assertEquals(query(new URL("https://example.test/stories?sort=desc")).get("sort"), "desc");
    assertEquals(query(new Request("https://example.test/stories?tag=mainz")).get("tag"), "mainz");
});
