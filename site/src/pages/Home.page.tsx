import { CustomElement, Page, RenderMode, Route } from "mainz";
import { MainzTutorialPage } from "../components/MainzTutorialPage.tsx";

@CustomElement("x-mainz-home-page")
@Route("/")
@RenderMode("ssg")
export class HomePage extends Page {
    static override page = {
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
