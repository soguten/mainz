import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { JourneyGuidePanel } from "../components/JourneyGuidePanel.tsx";

@CustomElement("x-mainz-routed-app-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class RoutedAppHomePage extends Page {
  override head() {
    return {
      title: "Mainz",
    };
  }

  override render() {
    const locale = (this.route.locale ?? "en") as "en" | "pt";
    const isPortuguese = locale === "pt";

    return (
      <main data-app-surface="routed-app">
        <header>
          <p>{isPortuguese ? "Atlas de rotas" : "Route atlas"}</p>
          <h1>{isPortuguese ? "Central de jornadas" : "Journey hub"}</h1>
          <p>
            {isPortuguese
              ? "Aplicativo fake para validar navegacao localizada, head e 404."
              : "Fake app for validating localized navigation, head, and 404 behavior."}
          </p>
        </header>

        <section aria-label={isPortuguese ? "Guia principal" : "Primary guide"}>
          <JourneyGuidePanel locale={locale} />
        </section>
      </main>
    );
  }
}
