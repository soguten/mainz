import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { inject } from "mainz/di";
import { DocsHomeContent } from "../components/DocsHomeContent.tsx";
import { DocsPageFrame } from "../components/docs-page/DocsPageFrame.tsx";
import { DocsSidebar } from "../components/docs-page/DocsSidebar.tsx";
import { DocsTopbar } from "../components/docs-page/DocsTopbar.tsx";
import { DocsService } from "../services/DocsService.ts";

@CustomElement("x-mainz-docs-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en")
export class HomePage extends Page {
  readonly docs = inject(DocsService);

  override head() {
    const page = this.docs.getPageById("home");
    if (!page) {
      throw new Error('Missing docs page content "home".');
    }

    return {
      title: page.pageTitle ?? page.title,
      meta: [
        {
          name: "description",
          content: page.description ?? page.summary,
        },
      ],
    };
  }

  override render() {
    return (
      <DocsPageFrame
        topbar={<DocsTopbar />}
        sidebar={<DocsSidebar activeSlug={undefined} />}
        main={<DocsHomeContent />}
      />
    );
  }
}
