import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-document-language-quickstart-page")
@Route("/quickstart")
@RenderMode("ssg")
export class FixtureDocumentLanguageQuickstartPage extends Page {
    override head() {
        return {
            title: "Fixture Document Language Quickstart",
        };
    }

    override render() {
        return (
            <article>
                <h1>Idioma do documento</h1>
                <p>O app declara idioma sem ativar i18n de rota.</p>
                <nav>
                    <a href="/">Overview</a>
                    <a href="/quickstart">Guides</a>
                    <a href="/reference">Reference</a>
                </nav>
            </article>
        );
    }
}
