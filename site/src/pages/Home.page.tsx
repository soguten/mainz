import { Page, route } from "mainz";
import { MainzTutorialPage } from "../components/MainzTutorialPage.tsx";

@route("/")
export class HomePage extends Page {
    static override customElementTag = "x-mainz-home-page";

    static override page = {
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
        },
    };

    override render() {
        return (
            <MainzTutorialPage />
        );
    }
}
