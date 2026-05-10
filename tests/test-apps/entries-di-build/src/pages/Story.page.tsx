import {
  CustomElement,
  Page,
  type PageEntriesContext,
  RenderMode,
  Route,
} from "mainz";
import { inject } from "mainz/di";
import { StoryEntriesService } from "../services/story-services.ts";

@CustomElement("x-entries-di-story-page")
@Route("/stories/:slug")
@RenderMode("ssg")
export class EntriesDiStoryPage extends Page {
  static readonly storyEntries = inject(StoryEntriesService);

  static entries({ locale }: PageEntriesContext) {
    return this.storyEntries.resolve(locale);
  }

  override render() {
    return (
      <main>
        <h1>Entries DI Build</h1>
        <p data-slug>{this.route.params?.slug ?? "missing"}</p>
        <p data-locale>{this.route.locale ?? "none"}</p>
      </main>
    );
  }
}
