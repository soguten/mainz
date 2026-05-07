import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { TutorialPage } from "../components/TutorialPage.tsx";

@CustomElement("x-mainz-core-contracts-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class CoreContractsHomePage extends Page {
  override head() {
    return {
      title: "Mainz",
    };
  }

  override render() {
    const locale = (this.route.locale ?? "en") as "en" | "pt";
    return <TutorialPage locale={locale} />;
  }
}
