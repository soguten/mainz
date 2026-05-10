import {
  Authorize,
  CustomElement,
  Locales,
  Page,
  RenderMode,
  Route,
} from "mainz";

@CustomElement("x-mainz-routed-authorization-member-dashboard-page")
@Authorize()
@Route("/dashboard")
@RenderMode("csr")
@Locales("en", "pt")
export class MemberDashboardPage extends Page {
  override head() {
    const locale = this.route.locale ?? "en";
    return {
      title: locale === "pt" ? "Painel do membro" : "Member dashboard",
    };
  }

  override render() {
    const locale = this.route.locale ?? "en";
    const isPortuguese = locale === "pt";

    return (
      <main data-app-surface="routed-authorization-app">
        <header>
          <p>{isPortuguese ? "Portal de acesso" : "Access portal"}</p>
          <h1>{isPortuguese ? "Painel do membro" : "Member dashboard"}</h1>
        </header>
        <section data-page="dashboard">
          {isPortuguese ? "Painel protegido" : "Protected dashboard"}
        </section>
      </main>
    );
  }
}
