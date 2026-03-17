import { customElement, Page, route } from "mainz";
import { MainzTutorialPage } from "../components/MainzTutorialPage.tsx";

@customElement("x-mainz-home-page")
@route("/")
export class HomePage extends Page {
    static override page = {
        mode: "ssg" as const,
        locales: ["en", "pt"],
        head: {
            title: "Mainz",
            meta: [
                {
                    name: "description",
                    content:
                        "Mainz tutorial experience with component-first UI and page-first routing.",
                },
            ],
        },
    };

    override render() {
        return <MainzTutorialPage />;
    }
}
