import { CustomElement, Page, Route } from "mainz";

@CustomElement("x-mainz-diagnostics-not-found-route-home-page")
@Route("/")
export class HomePage extends Page {
    override render() {
        return <main>Home</main>;
    }
}
