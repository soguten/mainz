import { CustomElement, Page, RenderMode, Route } from "mainz";
import { LivePreview } from "../components/LivePreview.tsx";

@CustomElement("x-forbidden-in-ssg-home-page")
@Route("/")
@RenderMode("ssg")
export class ForbiddenInSsgHomePage extends Page {
    override render() {
        return (
            <main>
                <h1>Forbidden In SSG</h1>
                <LivePreview />
            </main>
        );
    }
}
