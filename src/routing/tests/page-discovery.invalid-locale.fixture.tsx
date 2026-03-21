import { CustomElement, Locales, Page, Route } from "../../index.ts";

@CustomElement("x-invalid-locale-page")
@Route("/invalid-locale")
@Locales("en--US")
export class InvalidLocalePage extends Page {
    override render(): HTMLElement {
        return document.createElement("main");
    }
}
