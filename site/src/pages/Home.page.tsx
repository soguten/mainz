import { Page } from "mainz";
import { MainzTutorialPage } from "../components/MainzTutorialPage.tsx";

export class HomePage extends Page {
    static override customElementTag = "x-mainz-home-page";

    static override page = {
        path: "/",
        mode: "ssg" as const,
        locales: ["en", "pt"],
        head: {
            title: "Mainz",
            meta: [
                {
                    name: "description",
                    content: "Mainz tutorial experience with component-first UI and page-first routing.",
                },
            ],
            links: [
                {
                    rel: "canonical",
                    href: "/",
                },
            ],
        },
    };

    override render() {
        return (
            <MainzTutorialPage />
        );
    }
}
