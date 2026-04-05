import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-routed-authorization-login-page")
@Route("/login")
@RenderMode("csr")
@Locales("en", "pt")
export class LoginPage extends Page {
    override head() {
        const locale = this.route.locale ?? "en";
        return {
            title: locale === "pt" ? "Entrar" : "Login",
        };
    }

    override render() {
        const locale = this.route.locale ?? "en";
        const isPortuguese = locale === "pt";

        return (
            <main data-app-surface="routed-authorization-app">
                <header>
                    <p>{isPortuguese ? "Portal de acesso" : "Access portal"}</p>
                    <h1>{isPortuguese ? "Tela de entrada" : "Login screen"}</h1>
                </header>
                <section data-page="login">
                    {isPortuguese ? "Pagina de login" : "Login page"}
                </section>
            </main>
        );
    }
}
