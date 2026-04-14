import { Locales, Page, RenderMode, Route } from "mainz";
import { TypecaseOverviewPage } from "../components/TypecaseOverviewPage.tsx";

@Route("/")
@RenderMode("ssg")
@Locales("en")
export class HomePage extends Page {
    override head() {
        return {
            title: "Typecase",
            meta: [
                {
                    name: "description",
                    content: "Component documentation and examples for mainz/typecase.",
                },
            ],
        };
    }

    override render() {
        return <TypecaseOverviewPage />;
    }
}
