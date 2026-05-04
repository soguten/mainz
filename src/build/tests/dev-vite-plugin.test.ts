/// <reference lib="deno.ns" />

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMainzDevRouteMiddlewarePlugin } from "../dev-vite-plugin.ts";
import type { ViteDevServer } from "vite";

Deno.test("build/dev-vite-plugin: should prerender the localized ssg notFound page for unmatched html requests", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'const path = window.location.pathname;',
                'app.innerHTML = path.includes("missing")',
                '  ? "<section data-page=\\"not-found\\">Not Found</section>"',
                '  : "<section data-page=\\"docs\\">Docs</section>";',
                'app.firstElementChild.props = {',
                '  route: { path: "/404", matchedPath: path, params: {}, locale: "en" },',
                '  head: { title: "404 | Dev" },',
                '};',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: {
                    statusCode: number;
                    headers: Record<string, string>;
                    body: string;
                    setHeader(name: string, value: string): void;
                    end(body?: string): void;
                },
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];
        const watcherListeners = new Map<string, () => void>();

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on(event: string, listener: () => void) {
                    watcherListeners.set(event, listener);
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextCalled = false;
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/missing",
            },
            res,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
                nextCalled = true;
            },
        );

        assertEquals(nextCalled, false);
        assertEquals(res.statusCode, 404);
        assertStringIncludes(res.body, 'data-page="not-found"');
        assertStringIncludes(res.body, '<title>404 | Dev</title>');
        assertStringIncludes(res.body, '"/missing"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should answer HEAD ssg document requests without a body", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-head-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextCalled = false;
        await middleware(
            {
                method: "HEAD",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            res,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
                nextCalled = true;
            },
        );

        assertEquals(nextCalled, false);
        assertEquals(res.statusCode, 200);
        assertEquals(res.headers["Content-Type"], "text/html; charset=utf-8");
        assertEquals(res.body, "");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should prerender ssg routes for curl-style wildcard accept headers", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-curl-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextCalled = false;
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "*/*",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            res,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
                nextCalled = true;
            },
        );

        assertEquals(nextCalled, false);
        assertEquals(res.statusCode, 200);
        assertStringIncludes(res.body, 'data-page="docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should ignore wildcard-accept asset requests and fall through to Vite", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-asset-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextCalled = false;
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "*/*",
                    host: "localhost:5173",
                },
                url: "/assets/index.js",
            },
            res,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
                nextCalled = true;
            },
        );

        assertEquals(nextCalled, true);
        assertEquals(res.body, "");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should fall through to the CSR shell for missing dynamic ssg entries with fallback csr", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-fallback-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir, {
            docsFallback: "csr",
            docsPath: "/stories/:slug",
            docsEntries: [{ locale: "en", params: { slug: "hello-from-di" } }],
        });
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"stories\\">Story</section>";',
                'app.firstElementChild.props = { route: { path: "/stories/:slug", matchedPath: window.location.pathname, params: { slug: "hello-from-di" }, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextCalled = false;
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/stories/missing",
            },
            res,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
                nextCalled = true;
            },
        );

        assertEquals(nextCalled, true);
        assertEquals(res.body, "");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should emit opt-in debug timing logs for rendered and cached ssg requests", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-debug-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            debugSsg: true,
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const originalLog = console.log;
        const logs: string[] = [];
        console.log = (...entries: unknown[]) => {
            logs.push(entries.map((entry) => String(entry)).join(" "));
        };

        try {
            const first = createMockResponse();
            await middleware(
                {
                    method: "GET",
                    headers: {
                        accept: "text/html",
                        host: "localhost:5173",
                    },
                    url: "/docs",
                },
                first,
                (error?: Error) => {
                    if (error) {
                        throw error;
                    }
                },
            );

            const second = createMockResponse();
            await middleware(
                {
                    method: "GET",
                    headers: {
                        accept: "text/html",
                        host: "localhost:5173",
                    },
                    url: "/docs",
                },
                second,
                (error?: Error) => {
                    if (error) {
                        throw error;
                    }
                },
            );
        } finally {
            console.log = originalLog;
        }

        assertEquals(logs.length, 2);
        assertStringIncludes(logs[0], "[mainz][dev:ssg] rendered /docs -> /docs (en, 200) in ");
        assertStringIncludes(logs[1], "[mainz][dev:ssg] cache-hit /docs -> /docs (en, 200) in ");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should invalidate the cached prerendered html on watcher changes", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-cache-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Version 1</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];
        const watcherListeners = new Map<string, () => void>();

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on(event: string, listener: () => void) {
                    watcherListeners.set(event, listener);
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const first = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            first,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );
        assertStringIncludes(first.body, "Version 1");

        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Version 2</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        watcherListeners.get("change")?.();

        const second = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            second,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );
        assertStringIncludes(second.body, "Version 2");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should invalidate cached prerendered html during hot updates before the next document request", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-hot-update-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Version 1</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const first = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            first,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );
        assertStringIncludes(first.body, "Version 1");

        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Version 2</section>";',
                'app.firstElementChild.props = { route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" } };',
            ].join("\n"),
        );

        invokeHandleHotUpdate(plugin, {
            file: `${rootDir}/src/main.js`,
        });

        const second = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            second,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );
        assertStringIncludes(second.body, "Version 2");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should refresh title and managed head metadata after watcher invalidation", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-head-cache-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                '    <title>Template Title</title>',
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs v1</section>";',
                "app.firstElementChild.props = {",
                '  route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" },',
                '  head: { title: "Docs v1", meta: [{ name: "description", content: "Version 1" }] },',
                "};",
            ].join("\n"),
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];
        const watcherListeners = new Map<string, () => void>();

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on(event: string, listener: () => void) {
                    watcherListeners.set(event, listener);
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const first = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            first,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );
        assertStringIncludes(first.body, "<title>Docs v1</title>");
        assertStringIncludes(
            first.body,
            '<meta name="description" content="Version 1" data-mainz-head-managed="true" />',
        );

        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            [
                'const app = document.querySelector("#app");',
                'app.innerHTML = "<section data-page=\\"docs\\">Docs v2</section>";',
                "app.firstElementChild.props = {",
                '  route: { path: "/docs", matchedPath: "/docs", params: {}, locale: "en" },',
                '  head: { title: "Docs v2", meta: [{ name: "description", content: "Version 2" }, { property: "og:title", content: "Docs social v2" }] },',
                "};",
            ].join("\n"),
        );

        watcherListeners.get("change")?.();

        const second = createMockResponse();
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            second,
            (error?: Error) => {
                if (error) {
                    throw error;
                }
            },
        );

        assertStringIncludes(second.body, "<title>Docs v2</title>");
        assertStringIncludes(
            second.body,
            '<meta name="description" content="Version 2" data-mainz-head-managed="true" />',
        );
        assertStringIncludes(
            second.body,
            '<meta property="og:title" content="Docs social v2" data-mainz-head-managed="true" />',
        );
        assertEquals(second.body.includes("<title>Docs v1</title>"), false);
        assertEquals(second.body.includes('content="Version 1"'), false);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-vite-plugin: should surface route-aware SSG prerender errors through Vite", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-vite-plugin-error-" });

    try {
        const rootDir = `${cwd.replaceAll("\\", "/")}/app`;
        await Deno.mkdir(`${rootDir}/src`, { recursive: true });
        await writeTestAppDefinition(rootDir);
        await Deno.writeTextFile(
            `${rootDir}/index.html`,
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "  </head>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/src/main.js"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            `${rootDir}/src/main.js`,
            'throw new Error("boom in ssg");',
        );

        const plugin = createMainzDevRouteMiddlewarePlugin({
            cwd,
            runtimeName: "deno",
            target: {
                name: "app",
                rootDir: "app",
                appFile: "app/src/app.tsx",
                appId: "app",
                outDir: "dist/app",
            },
            profile: {
                name: "development",
                basePath: "/",
            },
            defaultLocale: "en",
            localePrefix: "except-default",
        });

        const middlewareHandlers: Array<
            (
                req: { method?: string; headers: Record<string, string>; url?: string },
                res: ReturnType<typeof createMockResponse>,
                next: (error?: Error) => void,
            ) => Promise<void> | void
        > = [];

        invokeConfigureServer(plugin, {
            config: {
                server: {
                    https: false,
                },
            },
            watcher: {
                on() {
                    return this;
                },
            },
            middlewares: {
                use(handler: unknown) {
                    middlewareHandlers.push(handler as typeof middlewareHandlers[number]);
                    return this;
                },
            },
            async transformIndexHtml(_url: string, html: string) {
                return html;
            },
        } as never);

        const middleware = middlewareHandlers[0];
        if (!middleware) {
            throw new Error("Expected Mainz dev middleware to be registered.");
        }

        const res = createMockResponse();
        let nextError: Error | undefined;
        await middleware(
            {
                method: "GET",
                headers: {
                    accept: "text/html",
                    host: "localhost:5173",
                },
                url: "/docs",
            },
            res,
            (error?: Error) => {
                nextError = error;
            },
        );

        assertEquals(res.body, "");
        assertEquals(
            nextError?.message,
            'Failed to prerender SSG route "/docs" for output "/docs" (locale "en"): boom in ssg',
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

function createMockResponse() {
    return {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: "",
        setHeader(name: string, value: string) {
            this.headers[name] = value;
        },
        end(body?: string) {
            this.body = body ?? "";
        },
    };
}

async function writeTestAppDefinition(
    rootDir: string,
    options: {
        docsFallback?: "404" | "csr";
        docsPath?: string;
        docsEntries?: Array<{ locale?: string; params: Record<string, string> }>;
    } = {},
): Promise<void> {
    const mainzEntryUrl = pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href;
    const docsPath = options.docsPath ?? "/docs";
    const docsRenderMode = options.docsFallback === "csr"
        ? `@RenderMode("ssg", { fallback: "csr" })`
        : '@RenderMode("ssg")';
    await Deno.writeTextFile(
        `${rootDir}/src/Docs.page.tsx`,
        [
            `import { Page, RenderMode, Route } from ${JSON.stringify(mainzEntryUrl)};`,
            "",
            `@Route(${JSON.stringify(docsPath)})`,
            docsRenderMode,
            "export class DocsPage extends Page {",
            ...(options.docsEntries?.length
                ? [
                    "  static entries() {",
                    `    return ${JSON.stringify(options.docsEntries)};`,
                    "  }",
                ]
                : []),
            "}",
        ].join("\n"),
    );
    await Deno.writeTextFile(
        `${rootDir}/src/NotFound.page.tsx`,
        [
            `import { Page, RenderMode, Route } from ${JSON.stringify(mainzEntryUrl)};`,
            "",
            '@Route("/404")',
            '@RenderMode("ssg")',
            "export class NotFoundPage extends Page {}",
        ].join("\n"),
    );
    await Deno.writeTextFile(
        `${rootDir}/src/app.tsx`,
        [
            `import { defineApp } from ${JSON.stringify(mainzEntryUrl)};`,
            'import { DocsPage } from "./Docs.page.tsx";',
            'import { NotFoundPage } from "./NotFound.page.tsx";',
            "",
            "export const app = defineApp({",
            '  id: "app",',
            '  i18n: { locales: ["en"], defaultLocale: "en", localePrefix: "except-default" },',
            "  pages: [DocsPage],",
            "  notFound: NotFoundPage,",
            "});",
        ].join("\n"),
    );
}

function invokeConfigureServer(
    plugin: ReturnType<typeof createMainzDevRouteMiddlewarePlugin>,
    server: ViteDevServer,
): void {
    const hook = plugin.configureServer;
    if (!hook) {
        throw new Error("Expected configureServer hook.");
    }

    const pluginContext = {
        debug() {},
        error(message: string | Error) {
            throw typeof message === "string" ? new Error(message) : message;
        },
        info() {},
        meta: {},
        warn() {},
    };

    if (typeof hook === "function") {
        hook.call(pluginContext as never, server);
        return;
    }

    hook.handler.call(pluginContext as never, server);
}

function invokeHandleHotUpdate(
    plugin: ReturnType<typeof createMainzDevRouteMiddlewarePlugin>,
    context: {
        file: string;
    },
): void {
    const hook = plugin.handleHotUpdate;
    if (!hook) {
        throw new Error("Expected handleHotUpdate hook.");
    }

    const pluginContext = {
        debug() {},
        error(message: string | Error) {
            throw typeof message === "string" ? new Error(message) : message;
        },
        info() {},
        meta: {},
        warn() {},
    };

    if (typeof hook === "function") {
        hook.call(pluginContext as never, context as never);
        return;
    }

    hook.handler.call(pluginContext as never, context as never);
}
