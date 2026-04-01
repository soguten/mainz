import { CustomElement, Locales, Page, RenderMode } from "mainz";
import { buildLocaleHref } from "./shared.ts";

@CustomElement("x-mainz-fixture-base-path-not-found-page")
@RenderMode("ssg")
@Locales("en", "pt")
export class FixtureBasePathNotFoundPage extends Page {
    override head() {
        return {
            title: "404 | Fixture Base Path",
        };
    }

    override render() {
        const locale = this.route.locale ?? "en";
        const isPortuguese = locale === "pt";

        return (
            <section>
                <h1>
                    {isPortuguese
                        ? "Essa rota nao existe na fixture."
                        : "That route does not exist in the fixture."}
                </h1>
                <p>
                    {isPortuguese
                        ? "Nenhuma pagina corresponde a esse caminho."
                        : "No page matched this path."}
                </p>
                <nav>
                    <a
                        className="locale-chip"
                        data-locale="en"
                        href={buildLocaleHref({ route: this.route, nextLocale: "en" })}
                    >
                        English
                    </a>
                    <a
                        className="locale-chip"
                        data-locale="pt"
                        href={buildLocaleHref({ route: this.route, nextLocale: "pt" })}
                    >
                        Portugues
                    </a>
                </nav>
            </section>
        );
    }
}
