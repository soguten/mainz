declare global {
  const __MAINZ_RENDER_MODE__: "csr" | "ssg";
  const __MAINZ_NAVIGATION_MODE__: "spa" | "mpa" | "enhanced-mpa";
  const __MAINZ_TARGET_NAME__: string;
  const __MAINZ_BASE_PATH__: string;
  const __MAINZ_TARGET_LOCALES__: readonly string[];
  const __MAINZ_DEFAULT_LOCALE__: string | undefined;
  const __MAINZ_LOCALE_PREFIX__: "auto" | "always";
  const __MAINZ_SITE_URL__: string | undefined;
}

export {};
