import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-diagnostics-not-found-route-page")
@Route("/404")
@RenderMode("ssg")
export class InvalidNotFoundPage extends Page {
    override render() {
        return <main>Not found</main>;
    }
}
