import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-single-locale-home-page")
@Route("/")
@RenderMode("ssg")
export class FixtureSingleLocaleHomePage extends Page {
    static override page = {
        locales: ["en"],
        head: {
            title: "Fixture Single Locale",
        },
    };

    override render() {
        return (
            <section>
                <h1>Single-locale fixture</h1>
                <p>Unprefixed routes for a single-locale target.</p>
                <nav>
                    <a href="/">Overview</a>
                    <a href="/quickstart">Guides</a>
                    <a href="/reference">Reference</a>
                </nav>
            </section>
        );
    }
}
