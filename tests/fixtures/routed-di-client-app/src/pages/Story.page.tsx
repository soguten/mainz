import { CustomElement, Page, RenderMode, Route } from "mainz";
import { inject } from "mainz/di";
import { ClientStoryCard } from "../components/ClientStoryCard.tsx";
import {
    ClientRouteBoardService,
    ClientStorySummaryService,
} from "../services/client-story-services.ts";

@CustomElement("x-mainz-routed-di-client-story-page")
@Route("/stories/:slug")
@RenderMode("csr")
export class RoutedDiClientStoryPage extends Page {
    
    readonly board = inject(ClientRouteBoardService);
    readonly summaries = inject(ClientStorySummaryService);

    override head() {
        return {
            title: this.board.title(),
        };
    }

    override render() {
        const slug = this.route.params?.slug ?? "missing";

        return (
            <main data-app-surface="routed-di-client-app">
                <header>
                    <p>Client dispatch board</p>
                    <h1>DI-driven client routes</h1>
                    <p>Fake app for validating DI on client-rendered routes.</p>
                </header>

                <ClientStoryCard
                    slug={slug}
                    summary={this.summaries.describe(slug)}
                />
            </main>
        );
    }
}
