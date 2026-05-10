import {
  Authorize,
  CustomElement,
  Locales,
  Page,
  RenderMode,
  Route,
} from "mainz";

@CustomElement("x-mainz-routed-authorization-admin-vault-page")
@Authorize({ roles: ["admin"] })
@Route("/admin")
@RenderMode("csr")
@Locales("en", "pt")
export class AdminVaultPage extends Page {
  override head() {
    const locale = this.route.locale ?? "en";
    return {
      title: locale === "pt" ? "Cofre admin" : "Admin vault",
    };
  }

  override render() {
    const locale = this.route.locale ?? "en";
    const isPortuguese = locale === "pt";

    return (
      <main data-app-surface="routed-authorization-app">
        <header>
          <p>{isPortuguese ? "Portal de acesso" : "Access portal"}</p>
          <h1>{isPortuguese ? "Cofre admin" : "Admin vault"}</h1>
        </header>
        <section data-page="admin">
          {isPortuguese ? "Area admin" : "Admin area"}
        </section>
      </main>
    );
  }
}
