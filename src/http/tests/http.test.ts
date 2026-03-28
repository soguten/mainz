/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { HttpClient, HttpResponseError } from "../index.ts";

Deno.test("http/client: should resolve json responses with baseUrl and merged headers", async () => {
    let seenUrl = "";
    let seenMethod = "";
    let seenHeaders: Headers | undefined;

    const client = new HttpClient({
        baseUrl: "https://example.com/api/",
        headers: {
            "x-default": "base",
        },
        fetch: async (input, init) => {
            seenUrl = String(input);
            seenMethod = String(init?.method ?? "GET");
            seenHeaders = new Headers(init?.headers);

            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                },
            });
        },
    });

    const result = await client.get("articles", {
        headers: {
            "x-request": "1",
        },
    }).json<{ ok: boolean }>();

    assertEquals(result.ok, true);
    assertEquals(seenUrl, "https://example.com/api/articles");
    assertEquals(seenMethod, "GET");
    assertEquals(seenHeaders?.get("x-default"), "base");
    assertEquals(seenHeaders?.get("x-request"), "1");
});

Deno.test("http/client: should retry retryable GET responses and eventually succeed", async () => {
    let attempts = 0;

    const client = new HttpClient({
        retry: {
            attempts: 2,
            delayMs: 0,
        },
        fetch: async () => {
            attempts += 1;

            if (attempts === 1) {
                return new Response("retry", { status: 503, statusText: "Service Unavailable" });
            }

            return new Response(JSON.stringify({ title: "ok" }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                },
            });
        },
    });

    const result = await client.get("/articles/intro").json<{ title: string }>();

    assertEquals(result.title, "ok");
    assertEquals(attempts, 2);
});

Deno.test("http/client: should throw HttpResponseError for non-success responses", async () => {
    const client = new HttpClient({
        fetch: async () => new Response("forbidden", { status: 403, statusText: "Forbidden" }),
    });

    await assertRejects(
        async () => {
            await client.post("/articles").text();
        },
        HttpResponseError,
        "HTTP POST /articles failed with 403 Forbidden.",
    );
});

Deno.test("http/client: should abort timed out requests", async () => {
    const client = new HttpClient({
        timeoutMs: 10,
        fetch: async (_input, init) => {
            return await new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    reject(new DOMException("Aborted", "AbortError"));
                }, { once: true });
            });
        },
    });

    await assertRejects(
        async () => {
            await client.get("/slow").text();
        },
        Error,
        "timed out after 10ms",
    );
});
