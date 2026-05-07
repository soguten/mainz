import { defineApp } from "mainz";
import { DiagnosticsInvalidLocaleHomePage } from "./pages/Home.page.tsx";

export const app = defineApp({
  id: "diagnostics-invalid-locales",
  pages: [DiagnosticsInvalidLocaleHomePage],
});
