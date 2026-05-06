/// <reference lib="deno.ns" />

import { join } from "node:path";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { DenoToolingRuntime } from "../../tooling/runtime/index.ts";
import { renderDevSsgHtml } from "../dev-ssg-html.ts";

Deno.test("build/dev-ssg-html: should prerender dev html while ignoring the vite hmr client script", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <head>",
                "    <title>Template</title>",
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
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section data-dev-ssg=\\"ready\\">Hello dev SSG</section>";',
            ].join("\n"),
        );

        const html = await renderDevSsgHtml({
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default",
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url, inputHtml) => inputHtml,
        });

        assertStringIncludes(html, 'data-dev-ssg="ready"');
        assertStringIncludes(html, "<title>Docs | Mainz</title>");
        assertStringIncludes(html, 'lang="en"');
        assertStringIncludes(html, 'src="/@vite/client"');
        assertStringIncludes(html, 'src="/src/main.js"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-ssg-html: should prerender dev html when vite app scripts include timestamp queries", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-query-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js?t=1777814219266"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section data-dev-ssg-query=\\"ready\\">Hello queried dev SSG</section>";',
            ].join("\n"),
        );

        const html = await renderDevSsgHtml({
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default",
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url, inputHtml) => inputHtml,
        });

        assertStringIncludes(html, 'data-dev-ssg-query="ready"');
        assertStringIncludes(html, 'src="/src/main.js"');
        assertEquals(html.includes('src="/src/main.js?t='), false);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-ssg-html: should prefer the provided module loader over direct runtime imports", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-loader-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js?t=123"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section data-dev-ssg-loader=\\"runtime\\">Runtime import</section>";',
            ].join("\n"),
        );

        let loadedSpecifier: string | undefined;
        const html = await renderDevSsgHtml({
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default",
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url, inputHtml) => inputHtml,
            loadModule: async (specifier) => {
                loadedSpecifier = specifier;
                const app = document.querySelector("#app");
                if (!app) {
                    throw new Error("Missing #app");
                }

                app.innerHTML =
                    '<section data-dev-ssg-loader="provided">Provided loader</section>';
            },
        });

        assertStringIncludes(loadedSpecifier ?? "", "/src/main.js?ssg=mainz-dev");
        assertEquals(html.includes("Runtime import"), false);
        assertStringIncludes(html, 'data-dev-ssg-loader="provided"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-ssg-html: should keep the provided loader specifier stable across renders", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-stable-loader-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js?t=123"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section>Stable loader</section>";',
            ].join("\n"),
        );

        const loadedSpecifiers: string[] = [];
        const baseArgs = {
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem" as const,
                path: "/docs",
                pattern: "/docs",
                mode: "ssg" as const,
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default" as const,
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url: string, inputHtml: string) => inputHtml,
            loadModule: async (specifier: string) => {
                loadedSpecifiers.push(specifier);
                const app = document.querySelector("#app");
                if (!app) {
                    throw new Error("Missing #app");
                }

                app.innerHTML = "<section>Stable loader</section>";
            },
        };

        await renderDevSsgHtml(baseArgs);
        await renderDevSsgHtml(baseArgs);

        assertEquals(loadedSpecifiers.length, 2);
        assertEquals(loadedSpecifiers[0], loadedSpecifiers[1]);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-ssg-html: should preserve non-Vite module query params for the provided loader", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-loader-query-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js?foo=bar&t=123"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section>Loader query</section>";',
            ].join("\n"),
        );

        let loadedSpecifier: string | undefined;
        await renderDevSsgHtml({
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default",
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url, inputHtml) => inputHtml,
            loadModule: async (specifier) => {
                loadedSpecifier = specifier;
                const app = document.querySelector("#app");
                if (!app) {
                    throw new Error("Missing #app");
                }

                app.innerHTML = "<section>Loader query</section>";
            },
        });

        assertEquals(loadedSpecifier, "/src/main.js?foo=bar&ssg=mainz-dev");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/dev-ssg-html: should strip Vite timestamp queries from returned module scripts while preserving other params", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-dev-ssg-html-client-query-" });

    try {
        const rootDir = join(cwd, "app");
        const srcDir = join(rootDir, "src");
        await Deno.mkdir(srcDir, { recursive: true });
        await Deno.writeTextFile(
            join(rootDir, "index.html"),
            [
                "<!doctype html>",
                "<html>",
                "  <body>",
                '    <main id="app"></main>',
                '    <script type="module" src="/@vite/client"></script>',
                '    <script type="module" src="/src/main.js?foo=bar&t=123"></script>',
                "  </body>",
                "</html>",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            join(srcDir, "main.js"),
            [
                'const app = document.querySelector("#app");',
                'if (!app) throw new Error("Missing #app");',
                'app.innerHTML = "<section>Client query</section>";',
            ].join("\n"),
        );

        const html = await renderDevSsgHtml({
            cwd,
            targetRootDir: "app",
            basePath: "/",
            requestUrl: new URL("http://localhost/docs"),
            route: {
                id: "app:0",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
                head: {
                    title: "Docs | Mainz",
                },
            },
            params: {},
            locale: "en",
            targetLocalesDefaultLocale: "en",
            targetLocalesPrefix: "except-default",
            runtime: new DenoToolingRuntime(),
            transformIndexHtml: async (_url, inputHtml) => inputHtml,
        });

        assertStringIncludes(html, 'src="/src/main.js?foo=bar"');
        assertEquals(html.includes('src="/src/main.js?foo=bar&t='), false);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});
