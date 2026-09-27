import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { JourneyGuidePanel } from "../components/JourneyGuidePanel.tsx";
import { t } from "mainz/i18n";

@CustomElement("x-mainz-localized-app-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class LocalizedHomePage extends Page {
  override metadata() {
    return {
      title: "Mainz",
    };
  }

  override render() {
    return (
      <main data-app-surface="localized-app">
        <header>
          <p>{t("home.eyebrow")}</p>
          <h1>{t("home.title")}</h1>
          <p>{t("home.description")}</p>
        </header>

        <section aria-label={t("home.guide")}>
          <JourneyGuidePanel />
        </section>
      </main>
    );
  }
}
