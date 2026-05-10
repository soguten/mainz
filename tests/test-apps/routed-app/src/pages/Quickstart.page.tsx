import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-routed-app-quickstart-page")
@Route("/quickstart")
@RenderMode("csr")
@Locales("en", "pt")
export class RoutedAppQuickstartPage extends Page {
  override head() {
    return {
      title: "Quickstart | Mainz",
    };
  }

  override render() {
    const locale = (this.route.locale ?? "en") as "en" | "pt";
    const isPortuguese = locale === "pt";

    return (
      <main data-app-surface="routed-app-quickstart">
        <header>
          <p>{isPortuguese ? "Laboratorio CSR" : "CSR lab"}</p>
          <h1>{isPortuguese ? "Passo rapido" : "Quickstart step"}</h1>
          <p>
            {isPortuguese
              ? "Rota client-first para validar cenarios CSR reais."
              : "Client-first route for validating real CSR scenarios."}
          </p>
        </header>

        <nav>
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
