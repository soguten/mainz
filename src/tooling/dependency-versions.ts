/**
 * Central source of truth for Mainz-owned tooling dependency versions.
 */
export const MAINZ_TOOLING_DEPENDENCY_VERSIONS = {
  vite: "8.0.16",
  typescript: "5.9.3",
  denoVitePlugin: "2.0.2",
  happyDom: "20.9.0",
} as const;

export function toPinnedNpmSpecifier(
  packageName: string,
  version: string,
): string {
  return `npm:${packageName}@${version}`;
}

export const MAINZ_VITE_NPM_SPECIFIER = toPinnedNpmSpecifier(
  "vite",
  MAINZ_TOOLING_DEPENDENCY_VERSIONS.vite,
);

export const MAINZ_TYPESCRIPT_NPM_SPECIFIER = toPinnedNpmSpecifier(
  "typescript",
  MAINZ_TOOLING_DEPENDENCY_VERSIONS.typescript,
);

export const MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER = toPinnedNpmSpecifier(
  "@deno/vite-plugin",
  MAINZ_TOOLING_DEPENDENCY_VERSIONS.denoVitePlugin,
);

export const MAINZ_HAPPY_DOM_NPM_SPECIFIER = toPinnedNpmSpecifier(
  "happy-dom",
  MAINZ_TOOLING_DEPENDENCY_VERSIONS.happyDom,
);
