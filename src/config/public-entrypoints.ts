export interface MainzPublicEntrypoint {
    specifier: string;
    sourcePath: string;
}

export const MAINZ_PUBLIC_ENTRYPOINTS: readonly MainzPublicEntrypoint[] = [
    { specifier: "mainz", sourcePath: "src/index.ts" },
    { specifier: "mainz/jsx-runtime", sourcePath: "src/jsx-runtime.ts" },
    { specifier: "mainz/jsx-dev-runtime", sourcePath: "src/jsx-dev-runtime.ts" },
    { specifier: "mainz/typecase", sourcePath: "src/typecase/index.ts" },
    { specifier: "mainz/i18n", sourcePath: "src/i18n/index.ts" },
    { specifier: "mainz/di", sourcePath: "src/di/index.ts" },
    { specifier: "mainz/http", sourcePath: "src/http/index.ts" },
    { specifier: "mainz/http/testing", sourcePath: "src/http/testing.ts" },
];
