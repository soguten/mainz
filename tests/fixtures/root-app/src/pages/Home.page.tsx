import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { HydrationTestComponent } from "../components/HydrationTestComponent.tsx";

@CustomElement("x-mainz-root-app-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class RootAppHomePage extends Page {
    
    override head() {
        return {
            title: "Mainz",
        };
    }

    override render() {
        const locale = (this.route.locale ?? "en") as "en" | "pt";
        const isPortuguese = locale === "pt";

        return (
            <main data-app-surface="root-app">
                <header>
                    <p>{isPortuguese ? "Laboratorio Raiz" : "Root Lab"}</p>
                    <h1>{isPortuguese ? "Painel de continuidade" : "Continuity dashboard"}</h1>
                    <p>
                        {isPortuguese
                            ? "Aplicativo fake usado para validar shell, boot e hidratacao."
                            : "Fake app used to validate shell, boot, and hydration."}
                    </p>
                </header>

                <section aria-label={isPortuguese ? "Modulo interativo" : "Interactive module"}>
                    <HydrationTestComponent locale={locale} />
                </section>
            </main>
        );
    }
}
