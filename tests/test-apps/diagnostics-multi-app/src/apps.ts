import { defineApp } from "mainz";
import { singleton } from "mainz/di";
import { AlphaPage } from "./pages/Alpha.page.tsx";
import { BetaPage } from "./pages/Beta.page.tsx";
import { SharedApi } from "./services.ts";

export const alphaApp = defineApp({
  id: "alpha-app",
  pages: [AlphaPage],
});

export const betaApp = defineApp({
  id: "beta-app",
  pages: [BetaPage],
  services: [
    singleton(SharedApi),
  ],
});
