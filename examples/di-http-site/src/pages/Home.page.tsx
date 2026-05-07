import { type PageLoadContext, Route } from "mainz";
import { inject } from "mainz/di";
import { DiHttpFrame } from "../components/DiHttpFrame.tsx";
import { StoriesApi } from "../lib/api.ts";
import { DiHttpExamplePage } from "../lib/DiHttpExamplePage.ts";
import type { StorySummary } from "../lib/story-data.ts";
import { Card } from "mainz/typecase";

interface HomePageData {
  featured: readonly StorySummary[];
}

@Route("/")
export class HomePage extends DiHttpExamplePage<HomePageData> {
  private readonly api = inject(StoriesApi);

  override async load(context: PageLoadContext) {
    return {
      featured: await this.api.listFeatured({
        signal: context.signal,
      }),
    };
  }

  override head() {
    return {
      title: "Mainz DI + HTTP Example",
    };
  }

  override render() {
    const featured = this.props.data?.featured ?? [];

    return (
      <DiHttpFrame
        eyebrow="Infrastructure stays injectable"
        title="Register once, resolve with inject(Token)"
        lead="The page owns featured-story loading, the related rail owns its own async work, and both consume the same startup-registered service token."
      >
        <Card className="di-http-panel" variant="subtle">
          <p className="di-http-eyebrow">Page-level injection</p>
          <Card.Title>Featured stories</Card.Title>
          <p>
            This route calls <span className="di-http-link">Page.load()</span>
            {" "}
            and reaches the demo API through a resolved{" "}
            <span className="di-http-link">StoriesApi</span>.
          </p>
        </Card>

        <section className="di-http-grid">
          {featured.map((story) => (
            <Card key={story.slug} className="di-http-card">
              <div className="di-http-card-meta">
                <span>{story.eyebrow}</span>
                <span>{story.readingTime}</span>
              </div>
              <Card.Title>{story.title}</Card.Title>
              <p>{story.summary}</p>
              <a className="di-http-card-link" href={`/stories/${story.slug}`}>
                Open story
              </a>
            </Card>
          ))}
        </section>
      </DiHttpFrame>
    );
  }
}
