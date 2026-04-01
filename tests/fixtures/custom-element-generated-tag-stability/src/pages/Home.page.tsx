import { Locales, Page, RenderMode, Route } from "mainz";
import { StableNamePanel } from "../components/StableNamePanel.tsx";

@Route("/")
@RenderMode("ssg")
@Locales("en")
export class StableNameHomePage extends Page {
    override head() {
        return {
            title: "Generated Tag Stability",
        };
    }

    override render() {
        return (
            <main data-testid="stable-name-home-page">
                <h1>Generated tag stability</h1>
                <StableNamePanel />
            </main>
        );
    }
}
