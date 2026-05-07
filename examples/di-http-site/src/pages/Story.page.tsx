import { type PageLoadContext, Route } from "mainz";
import { inject } from "mainz/di";
import { DiHttpFrame } from "../components/DiHttpFrame.tsx";
import { RelatedStoriesSection } from "../components/RelatedStoriesSection.tsx";
import { StoryFailureSection } from "../components/StoryFailureSection.tsx";
import { StoriesApi } from "../lib/api.ts";
import { DiHttpExamplePage } from "../lib/DiHttpExamplePage.ts";
import type { StoryDetail } from "../lib/story-data.ts";
import { Card } from "mainz/typecase";

interface StoryPageData {
  story: StoryDetail;
}

@Route("/stories/:slug")
export class StoryPage extends DiHttpExamplePage<StoryPageData> {
  private readonly api = inject(StoriesApi);

  override async load(context: PageLoadContext) {
    return {
      story: await this.api.getBySlug(context.params.slug, {
        signal: context.signal,
      }),
    };
  }

  override render() {
    const story = this.props.data?.story;

    if (!story) {
      return <div></div>;
    }

    return (
      <DiHttpFrame
        eyebrow={story.eyebrow}
        title={story.title}
        lead={story.summary}
      >
        <Card className="di-http-panel">
          <div className="di-http-card-meta">
            <span>{story.readingTime}</span>
            <span>{story.slug}</span>
          </div>

          <div className="di-http-story-copy">
            {story.body.map((paragraph, index) => <p key={index}>{paragraph}
            </p>)}
          </div>

          <div className="di-http-tag-row">
            {story.tags.map((tag) => (
              <span key={tag} className="di-http-tag">{tag}</span>
            ))}
          </div>

          <div className="di-http-story-nav">
            <a href="/">Back to featured stories</a>
          </div>
        </Card>

        <RelatedStoriesSection slug={story.slug} />
        <StoryFailureSection slug={story.slug} />
      </DiHttpFrame>
    );
  }
}
