import { Page, RenderMode, Route } from "../../index.ts";

@Route("/")
export class HomePage extends Page {
    static override page = {
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

@Route("/search")
@RenderMode("ssg")
export class SearchPage extends Page {
    static override page = {
        locales: ["pt-BR", "en-US"],
    };

    override render(): HTMLElement {
        return <main>Search</main>;
    }
}

export function Helper(): HTMLElement {
    return <div>helper</div>;
}
