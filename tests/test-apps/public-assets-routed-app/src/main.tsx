import { defineApp, link, startApp } from "mainz";
import { CsrPage } from "./pages/Csr.page.tsx";
import { SsgPage } from "./pages/Ssg.page.tsx";
import { SsrPage } from "./pages/Ssr.page.tsx";

const app = defineApp({
  id: "public-assets-app",
  pages: [CsrPage, SsgPage, SsrPage],
  assets: [
    link({
      id: "brand-font",
      rel: "preload",
      href: "/assets/fonts/brand.woff2",
      as: "font",
      crossorigin: "anonymous",
    }),
  ],
});

startApp(app, {
  mount: "#app",
});
