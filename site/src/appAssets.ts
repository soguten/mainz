import { type AssetDefinition, link, script } from "mainz";

export const appAssets: readonly AssetDefinition[] = [
  link({
    id: "site-fonts-preconnect",
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  }),
  link({
    id: "site-fonts-static-preconnect",
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossorigin: "anonymous",
  }),
  link({
    id: "site-fonts-stylesheet",
    rel: "stylesheet",
    href:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Libre+Baskerville:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  }),
  link({
    id: "site-highlight-theme",
    rel: "stylesheet",
    href:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css",
  }),
  script({
    id: "site-highlight-runtime",
    src:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
    target: "head",
  }),
];
