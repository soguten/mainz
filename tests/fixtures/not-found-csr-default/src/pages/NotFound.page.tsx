import { CustomElement, Page } from "mainz";

@CustomElement("x-mainz-not-found-csr-default-page")
export class NotFoundPage extends Page {
    override render() {
        return <main>Not found</main>;
    }
}
