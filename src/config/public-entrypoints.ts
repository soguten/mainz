export interface MainzPublicEntrypoint {
    specifier: string;
    sourcePath: string;
}

export const MAINZ_PUBLIC_ENTRYPOINTS: readonly MainzPublicEntrypoint[] = [
    { specifier: "mainz", sourcePath: "mod.ts" },
    { specifier: "mainz/jsx-runtime", sourcePath: "src/jsx-runtime.ts" },
    { specifier: "mainz/jsx-dev-runtime", sourcePath: "src/jsx-dev-runtime.ts" },
    { specifier: "mainz/typecase", sourcePath: "src/typecase/index.ts" },
    { specifier: "mainz/config", sourcePath: "src/public/config.ts" },
    { specifier: "mainz/i18n", sourcePath: "src/public/i18n.ts" },
    { specifier: "mainz/di", sourcePath: "src/public/di.ts" },
    { specifier: "mainz/http", sourcePath: "src/public/http.ts" },
    { specifier: "mainz/http/testing", sourcePath: "src/public/http-testing.ts" },
    { specifier: "mainz/testing", sourcePath: "src/public/testing.ts" },
];
