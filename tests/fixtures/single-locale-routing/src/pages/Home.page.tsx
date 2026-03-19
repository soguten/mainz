import { customElement, Page, route } from "mainz";

@customElement("x-mainz-fixture-single-locale-home-page")
@route("/")
export class FixtureSingleLocaleHomePage extends Page {
    static override page = {
        mode: "ssg" as const,
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
