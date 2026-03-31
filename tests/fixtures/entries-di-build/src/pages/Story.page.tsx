import { CustomElement, Page, type PageEntriesContext, RenderMode, Route } from "mainz";
import { inject } from "mainz/di";
import { StoryEntriesService } from "../services/story-services.ts";

type EntriesDiStoryPageProps = {
    route?: {
        locale?: string;
        params?: {
            slug?: string;
        };
    };
};

@CustomElement("x-entries-di-story-page")
@Route("/stories/:slug")
@RenderMode("ssg")
export class EntriesDiStoryPage extends Page<EntriesDiStoryPageProps> {
    
    static readonly storyEntries = inject(StoryEntriesService);

    static entries({ locale }: PageEntriesContext) {
        return this.storyEntries.resolve(locale);
    }

    override render() {
        return (
            <main>
                <h1>Entries DI Build</h1>
                <p data-slug>{this.props.route?.params?.slug ?? "missing"}</p>
                <p data-locale>{this.props.route?.locale ?? "none"}</p>
            </main>
        );
    }
}
