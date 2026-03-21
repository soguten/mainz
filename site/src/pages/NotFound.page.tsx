import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { buildSiteLocaleHref, getLocale } from "../i18n/index.ts";
import { LanguageSwitcher } from "../components/LanguageSwitcher.tsx";
import { pageStyles } from "../styles/pageStyles.ts";

@CustomElement("x-mainz-not-found-page")
@Route("/404")
@RenderMode("ssg")
@Locales("en", "pt")
export class NotFoundPage extends Page {
    static override styles = pageStyles;

    static override page = {
        notFound: true,
        head: {
            title: "404 | Mainz",
            meta: [
                {
                    name: "description",
                    content:
                        "Mainz page not found experience for static and enhanced MPA navigation.",
                },
            ],
        },
    };

    override render() {
        const locale = getLocale();
        const isPortuguese = locale === "pt";
        const homeHref = buildSiteLocaleHref(locale, {
            pathname: "/",
            search: "",
            hash: "",
        });

        return (
            <div className="page-shell">
                <header className="top-nav panel">
                    <a className="brand" href={homeHref}>mainz</a>
                    <div className="top-nav-actions">
                        <LanguageSwitcher />
                    </div>
                </header>

                <section className="panel">
                    <p className="eyebrow">
                        {isPortuguese ? "pagina nao encontrada" : "page not found"}
                    </p>
                    <h1>
                        {isPortuguese
                            ? "Essa rota nao existe no Mainz."
                            : "That route does not exist in Mainz."}
                    </h1>
                    <p className="lead">
                        {isPortuguese
                            ? "A pagina que voce tentou abrir nao foi encontrada. Voce pode voltar para a trilha principal e continuar explorando o framework."
                            : "The page you tried to open could not be found. You can head back to the main journey and keep exploring the framework."}
                    </p>

                    <div className="hero-cta-row">
                        <a className="button button-primary" href={homeHref}>
                            {isPortuguese ? "Voltar para o inicio" : "Back to the homepage"}
                        </a>
                        <a
                            className="button button-ghost"
                            href="https://github.com/soguten/mainz"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {isPortuguese ? "Ver repositorio" : "Open repository"}
                        </a>
                    </div>
                </section>
            </div>
        );
    }
}
