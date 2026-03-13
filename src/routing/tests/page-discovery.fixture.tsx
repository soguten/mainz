import { Page } from "../../index.ts";

export class HomePage extends Page {
    static override page = {
        path: "/",
        head: {
            title: "Home",
            meta: [
                { name: "description", content: "Home page" },
            ],
        },
    };

    override render(): HTMLElement {
        return <main>Home</main>;
    }
}

export class SearchPage extends Page {
    static override page = {
        path: "/search",
        mode: "ssg" as const,
        locales: ["pt-BR", "en-US"],
    };

    override render(): HTMLElement {
        return <main>Search</main>;
    }
}

export function Helper(): HTMLElement {
    return <div>helper</div>;
}
