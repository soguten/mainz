/**
 * Renders the Node package manifest for an empty Mainz project.
 */
export function renderEmptyNodePackageJson(
    mainzSpecifier: string,
): string {
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
                    mainz: mainzSpecifier,
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
