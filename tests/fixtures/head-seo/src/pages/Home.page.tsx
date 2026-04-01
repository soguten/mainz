import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-head-seo-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class FixtureHeadSeoHomePage extends Page {
    override head() {
        return {
            title: "Fixture Head SEO",
            meta: [
                {
                    name: "description",
                    content: "Minimal SEO fixture for canonical and hreflang validation.",
                },
            ],
        };
    }

    override render() {
        const locale = this.route.locale ?? "en";
        const isPortuguese = locale === "pt";

        return (
            <section>
                <h1>{isPortuguese ? "SEO da fixture" : "Fixture SEO"}</h1>
                <p>
                    {isPortuguese
                        ? "Pagina minima para validar canonical e hreflang."
                        : "Minimal page to diagnose canonical and hreflang."}
                </p>
            </section>
        );
    }
}
