/**
 * Renders the Node package manifest for an empty Mainz project.
 */
export function renderEmptyNodePackageJson(
    mainzSpecifier: string,
): string {
    const mainzDependency = toNodeCompatibleJsrDependency(mainzSpecifier);

    return `${
        JSON.stringify(
            {
                name: "mainz-app",
                private: true,
                type: "module",
                scripts: {
                    dev: "mainz dev",
                    build: "mainz build",
                    preview: "mainz preview",
                    test: "mainz test",
                    diagnose: "mainz diagnose",
                },
                dependencies: {
                    mainz: mainzDependency,
                },
                devDependencies: {
                    vite: "^7.3.1",
                },
            },
            null,
            4,
        )
    }\n`;
}

/**
 * Renders the npm registry configuration needed for JSR-backed npm installs.
 */
export function renderEmptyNodeNpmrc(): string {
    return "@jsr:registry=https://npm.jsr.io\n";
}

/**
 * Renders the TypeScript configuration for an empty Node Mainz project.
 */
export function renderEmptyNodeTsconfig(): string {
    return `${
        JSON.stringify(
            {
                compilerOptions: {
                    target: "ES2022",
                    module: "ESNext",
                    moduleResolution: "Bundler",
                    lib: ["DOM", "ES2022"],
                    jsx: "react-jsx",
                    jsxImportSource: "mainz",
                    strict: true,
                    noEmit: true,
                    allowImportingTsExtensions: true,
                    types: [],
                },
                include: ["**/*.ts", "**/*.tsx"],
            },
            null,
            4,
        )
    }\n`;
}

function toNodeCompatibleJsrDependency(specifier: string): string {
    if (specifier.startsWith("npm:@jsr/")) {
        return specifier;
    }

    const normalized = specifier.startsWith("jsr:")
        ? specifier.slice("jsr:".length)
        : specifier;
    const match = normalized.match(/^@([^/]+)\/([^@/]+)(@.+)?$/);
    if (!match) {
        return specifier;
    }

    const [, scope, name, version = ""] = match;
    return `npm:@jsr/${scope}__${name}${version}`;
}
