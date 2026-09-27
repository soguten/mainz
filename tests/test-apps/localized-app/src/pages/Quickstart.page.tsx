import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { t } from "mainz/i18n";

@CustomElement("x-mainz-localized-app-quickstart-page")
@Route("/quickstart")
@RenderMode("csr")
@Locales("en", "pt")
export class LocalizedQuickstartPage extends Page {
  override metadata() {
    return {
      title: "Quickstart | Mainz",
    };
  }

  override render() {
    return (
      <main data-app-surface="localized-app-quickstart">
        <header>
          <p>{t("quickstart.eyebrow")}</p>
          <h1>{t("quickstart.title")}</h1>
          <p>{t("quickstart.description")}</p>
        </header>

        <nav>
          <a className="route-link" href="/">{t("navigation.home")}</a>
          <a className="locale-chip" data-locale="en" href="/quickstart">
            English
          </a>
          <a className="locale-chip" data-locale="pt" href="/pt/quickstart">
            Portugues
          </a>
        </nav>
      </main>
    );
  }
}
