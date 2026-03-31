import { defineApp } from "mainz";
import { singleton } from "mainz/di";
import { DiagnosticsImportedAppPage } from "./pages/Home.page.tsx";
import NeedsMissingDependency from "./services/NeedsMissingDependency.ts";

export default defineApp({
    pages: [DiagnosticsImportedAppPage],
    services: [
        singleton(NeedsMissingDependency),
    ],
});
