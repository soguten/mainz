import { defineApp, startApp } from "mainz";
import { singleton } from "mainz/di";
import { DocsPage } from "./pages/Docs.page.tsx";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";
import { DocsService } from "./services/DocsService.ts";

const app = defineApp({
    id: "docs-site",
    navigation: "enhanced-mpa",
    pages: [HomePage, DocsPage],
    notFound: NotFoundPage,
    services: [
        singleton(DocsService, () =>
            new DocsService({
                rootPath: "../../../docs/",
            })
        ),
    ],
});

startApp(app, {
    mount: "#app",
});
