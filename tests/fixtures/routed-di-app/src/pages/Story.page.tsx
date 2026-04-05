import {
    CustomElement,
    Locales,
    Page,
    type PageEntriesContext,
    RenderMode,
    Route,
} from "mainz";
import { inject } from "mainz/di";
import { StorySummaryCard } from "../components/StorySummaryCard.tsx";
import { StoryCatalogService, StorySummaryService } from "../services/story-services.ts";

@CustomElement("x-mainz-routed-di-story-page")
@Route("/stories/:slug")
@RenderMode("ssg")
@Locales("en", "pt")
export class RoutedDiStoryPage extends Page {
    
    static readonly stories = inject(StoryCatalogService);

    readonly storySummary = inject(StorySummaryService);

    static entries({ locale }: PageEntriesContext) {
        return this.stories.resolve(locale);
    }

    override head() {
        const locale = (this.route.locale ?? "en") as "en" | "pt";
        return {
            title: locale === "pt" ? "Atlas DI" : "DI Atlas",
        };
    }

    override render() {
        const locale = (this.route.locale ?? "en") as "en" | "pt";
        const slug = this.route.params?.slug ?? "missing";
        const isPortuguese = locale === "pt";

        return (
            <main data-app-surface="routed-di-app">
                <header>
                    <p>{isPortuguese ? "Atlas de servicos" : "Service atlas"}</p>
                    <h1>{isPortuguese ? "Arquivo de rotas injetadas" : "Injected route archive"}</h1>
                    <p>
                        {isPortuguese
                            ? "Aplicativo fake para validar entries e render guiados por DI."
                            : "Fake app for validating DI-driven entries and render flows."}
                    </p>
                </header>

                <StorySummaryCard
                    locale={locale}
                    slug={slug}
                    summary={this.storySummary.describe(locale, slug)}
                />
            </main>
        );
    }
}
