import { CustomElement, Page, RenderMode, Route } from "mainz";
import { buildLocaleHref, type FixtureRouteProps } from "./shared.ts";

@CustomElement("x-mainz-fixture-base-path-home-page")
@Route("/")
@RenderMode("ssg")
export class FixtureBasePathHomePage extends Page<FixtureRouteProps> {
    static override page = {
        locales: ["en", "pt"],
        head: {
            title: "Fixture Base Path",
        },
    };

    override render() {
        const locale = this.props.route?.locale ?? "en";
        const isPortuguese = locale === "pt";

        return (
            <section>
                <h1>{isPortuguese ? "Inicio da fixture" : "Fixture home"}</h1>
                <p>
                    {isPortuguese
                        ? "Contrato de base path em portugues"
                        : "Base path contract in English"}
                </p>
                <nav>
                    <a
                        className="locale-chip"
                        data-locale="en"
                        href={buildLocaleHref({ route: this.props.route, nextLocale: "en" })}
                    >
                        English
                    </a>
                    <a
                        className="locale-chip"
                        data-locale="pt"
                        href={buildLocaleHref({ route: this.props.route, nextLocale: "pt" })}
                    >
                        Portugues
                    </a>
                </nav>
            </section>
        );
    }
}
