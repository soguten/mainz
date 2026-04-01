import { CustomElement, load, Locales, Page, Route } from "../../index.ts";

@CustomElement("x-mainz-route-params-home-page")
@Route("/")
export class RouteParamsHomePage extends Page {
    override head() {
        return {
            title: "Home",
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Home page";
        element.setAttribute("data-page", "home");
        return element;
    }
}

@CustomElement("x-mainz-route-params-docs-page")
@Route("/docs/:slug")
@Locales("en", "pt")
export class RouteParamsDocsPage extends Page<{}, {}, { title: string }> {
    override head() {
        return {
            title: "Docs",
        };
    }

    override load = load.byParam("slug", (slug, { locale }) => {
        return {
            title: `${locale ?? "en"}:${slug}`,
        };
    });

    override render(): HTMLElement {
        const element = document.createElement("section");
        const slug = String(this.route.params.slug ?? "");
        const title = String(this.data?.title ?? "");
        element.textContent = `Docs page:${slug}`;
        element.setAttribute("data-page", "docs");
        element.setAttribute("data-slug", slug);
        element.setAttribute(
            "data-locale",
            String(this.route.locale ?? ""),
        );
        element.setAttribute("data-title", title);
        return element;
    }
}

@CustomElement("x-mainz-route-params-catch-all-page")
@Route("/docs/*")
@Locales("en", "pt")
export class RouteParamsCatchAllPage extends Page {
    override head() {
        return {
            title: "Docs CatchAll",
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        const parts = String(this.route.params["*"] ?? "");
        element.textContent = `Catch-all page:${parts}`;
        element.setAttribute("data-page", "catch-all");
        element.setAttribute("data-parts", parts);
        return element;
    }
}

@CustomElement("x-mainz-route-params-not-found-page")
@Locales("en", "pt")
export class RouteParamsNotFoundPage extends Page {
    override head() {
        return {
            title: "Not Found",
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Not found page";
        element.setAttribute("data-page", "not-found");
        return element;
    }
}
