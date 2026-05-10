import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-diagnostics-invalid-locale-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en--US")
export class DiagnosticsInvalidLocaleHomePage extends Page {
  override head() {
    return {
      title: "Invalid locale fixture",
    };
  }

  override render() {
    return <section>Invalid locale fixture</section>;
  }
}
