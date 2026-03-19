import { CustomElement, Page, Route } from "mainz";

@CustomElement("x-mainz-fixture-navigation-override-home-page")
@Route("/")
export class FixtureNavigationOverrideHomePage extends Page {
    static override page = {
        mode: "ssg" as const,
        locales: ["en"],
        head: {
            title: "Fixture Navigation Override",
        },
    };

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
