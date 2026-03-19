import { customElement, Page, route } from "mainz";

type FixtureRouteProps = {
    route?: {
        locale?: string;
    };
};

@customElement("x-mainz-fixture-head-seo-page")
@route("/")
export class FixtureHeadSeoHomePage extends Page<FixtureRouteProps> {
    static override page = {
        mode: "ssg" as const,
        locales: ["en", "pt"],
        head: {
            title: "Fixture Head SEO",
            meta: [
                {
                    name: "description",
                    content: "Minimal SEO fixture for canonical and hreflang validation.",
                },
            ],
        },
    };

    override render() {
        const locale = this.props.route?.locale ?? "en";
        const isPortuguese = locale === "pt";

        return (
            <section>
                <h1>{isPortuguese ? "SEO da fixture" : "Fixture SEO"}</h1>
                <p>
                    {isPortuguese
                        ? "Pagina minima para validar canonical e hreflang."
                        : "Minimal page to validate canonical and hreflang."}
                </p>
            </section>
        );
    }
}
