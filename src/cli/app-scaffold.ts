export type AppScaffoldType = "routed" | "root";
export type AppScaffoldNavigation = "spa" | "mpa" | "enhanced-mpa";

export type AppScaffoldTarget = {
    name: string;
    rootDir: string;
    appFile: string;
    appId: string;
    pagesDir?: string;
    outDir: string;
};

export type AppScaffold = {
    target: AppScaffoldTarget;
    files: Map<string, string>;
    directories: string[];
};

export type CreateAppScaffoldOptions = {
    type: AppScaffoldType;
    name: string;
    rootDir: string;
    outDir: string;
    navigation: AppScaffoldNavigation;
};

export function createAppScaffold(options: CreateAppScaffoldOptions): AppScaffold {
    if (options.type === "root") {
        return createRootAppScaffold(options);
    }

    return createRoutedAppScaffold(options);
}

function createRoutedAppScaffold(options: CreateAppScaffoldOptions): AppScaffold {
    const customElementPrefix = `x-mainz-${toKebabCase(options.name)}`;
    return {
        target: {
            name: options.name,
            rootDir: options.rootDir,
            appFile: `${options.rootDir}/src/app.ts`,
            appId: options.name,
            pagesDir: `${options.rootDir}/src/pages`,
            outDir: options.outDir,
        },
        directories: ["src/pages"],
        files: new Map([
            ["index.html", renderGeneratedIndexHtml(options.name)],
            ["src/app.ts", renderGeneratedRoutedAppFile(options.name, options.navigation)],
            ["src/main.tsx", renderGeneratedMainFile()],
            ["src/pages/Home.page.tsx", renderGeneratedHomePage(options.name, customElementPrefix)],
            [
                "src/pages/NotFound.page.tsx",
                renderGeneratedNotFoundPage(options.name, customElementPrefix),
            ],
        ]),
    };
}

function createRootAppScaffold(options: CreateAppScaffoldOptions): AppScaffold {
    return {
        target: {
            name: options.name,
            rootDir: options.rootDir,
            appFile: `${options.rootDir}/src/app.ts`,
            appId: options.name,
            outDir: options.outDir,
        },
        directories: ["src"],
        files: new Map([
            ["index.html", renderGeneratedIndexHtml(options.name)],
            ["src/AppRoot.tsx", renderGeneratedRootComponentFile(options.name)],
            ["src/app.ts", renderGeneratedRootAppFile(options.name)],
            ["src/main.tsx", renderGeneratedMainFile()],
        ]),
    };
}

function renderGeneratedIndexHtml(appName: string): string {
    return [
        "<!DOCTYPE html>",
        '<html lang="en">',
        "    <head>",
        '        <meta charset="UTF-8" />',
        '        <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `        <title>${appName}</title>`,
        "    </head>",
        "    <body>",
        '        <div id="app"></div>',
        '        <script type="module" src="/src/main.tsx"></script>',
        "    </body>",
        "</html>",
        "",
    ].join("\n");
}

function renderGeneratedRoutedAppFile(
    appName: string,
    navigation: AppScaffoldNavigation,
): string {
    return [
        'import { defineApp } from "mainz";',
        'import { HomePage } from "./pages/Home.page.tsx";',
        'import { NotFoundPage } from "./pages/NotFound.page.tsx";',
        "",
        "export const app = defineApp({",
        `    id: ${JSON.stringify(appName)},`,
        `    navigation: ${JSON.stringify(navigation)},`,
        "    pages: [HomePage],",
        "    notFound: NotFoundPage,",
        "});",
        "",
    ].join("\n");
}

function renderGeneratedRootComponentFile(appName: string): string {
    return [
        'import { Component } from "mainz";',
        "",
        "export class AppRoot extends Component {",
        "    override render() {",
        "        return (",
        "            <main>",
        `                <h1>${appName}</h1>`,
        "            </main>",
        "        );",
        "    }",
        "}",
        "",
    ].join("\n");
}

function renderGeneratedRootAppFile(appName: string): string {
    return [
        'import { defineApp } from "mainz";',
        'import { AppRoot } from "./AppRoot.tsx";',
        "",
        "export const app = defineApp({",
        `    id: ${JSON.stringify(appName)},`,
        "    root: AppRoot,",
        "});",
        "",
    ].join("\n");
}

function renderGeneratedMainFile(): string {
    return [
        'import { startApp } from "mainz";',
        'import { app } from "./app.ts";',
        "",
        "startApp(app, {",
        '    mount: "#app",',
        "});",
        "",
    ].join("\n");
}

function renderGeneratedHomePage(
    appName: string,
    customElementPrefix: string,
): string {
    return [
        'import { CustomElement, Page, RenderMode, Route } from "mainz";',
        "",
        `@CustomElement("${customElementPrefix}-home-page")`,
        '@Route("/")',
        '@RenderMode("ssg")',
        "export class HomePage extends Page {",
        "    override head() {",
        "        return {",
        `            title: ${JSON.stringify(appName)},`,
        "        };",
        "    }",
        "",
        "    override render() {",
        "        return (",
        "            <main>",
        `                <h1>${appName}</h1>`,
        "            </main>",
        "        );",
        "    }",
        "}",
        "",
    ].join("\n");
}

function renderGeneratedNotFoundPage(
    appName: string,
    customElementPrefix: string,
): string {
    return [
        'import { CustomElement, Page, RenderMode } from "mainz";',
        "",
        `@CustomElement("${customElementPrefix}-not-found-page")`,
        '@RenderMode("ssg")',
        "export class NotFoundPage extends Page {",
        "    override head() {",
        "        return {",
        `            title: ${JSON.stringify(`404 | ${appName}`)},`,
        "        };",
        "    }",
        "",
        "    override render() {",
        "        return (",
        "            <main>",
        "                <h1>Page not found</h1>",
        '                <a href="/">Go home</a>',
        "            </main>",
        "        );",
        "    }",
        "}",
        "",
    ].join("\n");
}

function toKebabCase(value: string): string {
    return value.replaceAll("_", "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
