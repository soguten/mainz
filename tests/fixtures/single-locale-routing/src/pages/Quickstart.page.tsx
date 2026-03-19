import { customElement, Page, route } from "mainz";

@customElement("x-mainz-fixture-single-locale-quickstart-page")
@route("/quickstart")
export class FixtureSingleLocaleQuickstartPage extends Page {
    static override page = {
        mode: "ssg" as const,
        locales: ["en"],
        head: {
            title: "Fixture Quickstart",
        },
    };

    override render() {
        return (
            <article>
                <h1>Why Mainz</h1>
                <p>Create your first page.</p>
                <nav>
                    <a href="/">Overview</a>
                    <a href="/quickstart">Guides</a>
                    <a href="/reference">Reference</a>
                </nav>
            </article>
        );
    }
}
