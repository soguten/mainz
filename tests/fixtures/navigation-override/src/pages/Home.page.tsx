import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-navigation-override-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en")
export class FixtureNavigationOverrideHomePage extends Page {
    override head() {
        return {
            title: "Fixture Navigation Override",
        };
    }

    override render() {
        return (
            <section>
                <h1>Navigation override fixture</h1>
                <p>Profile navigation override should force plain MPA semantics.</p>
                <a href="/">Home</a>
            </section>
        );
    }
}
