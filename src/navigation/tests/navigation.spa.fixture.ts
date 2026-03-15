import { Page } from "../../index.ts";

export class SpaHomePage extends Page {
    static override customElementTag = "x-mainz-navigation-spa-home-page";
    static override page = {
        path: "/",
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

export class SpaDocsPage extends Page {
    static override customElementTag = "x-mainz-navigation-spa-docs-page";
    static override page = {
        path: "/docs/:slug",
        head: {
            title: "Docs",
        },
    };

    override render(): HTMLElement {
        const element = document.createElement("section");
        const slug = String(this.props?.route?.params?.slug ?? "");
        element.textContent = `Docs page:${slug}`;
        element.setAttribute("data-page", "docs");
        if (slug) {
            element.setAttribute("data-slug", slug);
        }
        return element;
    }
}

export class SpaNotFoundPage extends Page {
    static override customElementTag = "x-mainz-navigation-spa-not-found-page";
    static override page = {
        path: "/404",
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
