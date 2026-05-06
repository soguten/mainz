import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { MainzTutorialPage } from "../components/MainzTutorialPage.tsx";

@CustomElement("x-mainz-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class HomePage extends Page {
  override head() {
    return {
      title: "Mainz",
      meta: [
        {
          name: "description",
          content:
            "Mainz tutorial experience with component-first UI and page-first routing.",
        },
      ],
    };
  }

  override render() {
    return <MainzTutorialPage />;
  }
}
