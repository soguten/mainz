import { customElement, Page, route } from "../../index.ts";

@customElement("x-mainz-route-params-home-page")
@route("/")
export class RouteParamsHomePage extends Page {
    static override page = {
        head: {
            title: "Home",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Home page";
        element.setAttribute("data-page", "home");
        return element;
    }
}

@customElement("x-mainz-route-params-docs-page")
@route("/docs/:slug")
export class RouteParamsDocsPage extends Page {
    static override page = {
        locales: ["en", "pt"],
        head: {
            title: "Docs",
        },
    };

    static async load(
        { params, locale }: { params: Record<string, string>; locale?: string },
    ) {
        return {
            title: `${locale ?? "en"}:${params.slug ?? ""}`,
        };
    }

    override render(): HTMLElement {
        const element = document.createElement("section");
        const slug = String(this.props?.route?.params?.slug ?? "");
        const title = String(
            (this.props as { data?: { title?: string } } | undefined)?.data?.title ??
                "",
        );
        element.textContent = `Docs page:${slug}`;
        element.setAttribute("data-page", "docs");
        element.setAttribute("data-slug", slug);
        element.setAttribute(
            "data-locale",
            String(this.props?.route?.locale ?? ""),
        );
        element.setAttribute("data-title", title);
        return element;
    }
}

@customElement("x-mainz-route-params-catch-all-page")
@route("/docs/*")
export class RouteParamsCatchAllPage extends Page {
    static override page = {
        locales: ["en", "pt"],
        head: {
            title: "Docs CatchAll",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        const parts = String(this.props?.route?.params?.["*"] ?? "");
        element.textContent = `Catch-all page:${parts}`;
        element.setAttribute("data-page", "catch-all");
        element.setAttribute("data-parts", parts);
        return element;
    }
}

@customElement("x-mainz-route-params-not-found-page")
@route("/404")
export class RouteParamsNotFoundPage extends Page {
    static override page = {
        locales: ["en", "pt"],
        head: {
            title: "Not Found",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        element.textContent = "Not found page";
        element.setAttribute("data-page", "not-found");
        return element;
    }
}
