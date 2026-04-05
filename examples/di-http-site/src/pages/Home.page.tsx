import { type PageLoadContext, Route } from "mainz";
import { inject } from "mainz/di";
import { DiHttpFrame } from "../components/DiHttpFrame.tsx";
import { StoriesApi } from "../lib/api.ts";
import { DiHttpExamplePage } from "../lib/DiHttpExamplePage.ts";
import type { StorySummary } from "../lib/story-data.ts";

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
                <section className="di-http-panel">
                    <p className="di-http-eyebrow">Page-level injection</p>
                    <h2>Featured stories</h2>
                    <p>
                        This route calls <span className="di-http-link">Page.load()</span>{" "}
                        and reaches the demo API through a resolved{" "}
                        <span className="di-http-link">StoriesApi</span>.
                    </p>
                </section>

                <section className="di-http-grid">
                    {featured.map((story) => (
                        <article key={story.slug} className="di-http-card">
                            <div className="di-http-card-meta">
                                <span>{story.eyebrow}</span>
                                <span>{story.readingTime}</span>
                            </div>
                            <h3>{story.title}</h3>
                            <p>{story.summary}</p>
                            <a className="di-http-card-link" href={`/stories/${story.slug}`}>
                                Open story
                            </a>
                        </article>
                    ))}
                </section>
            </DiHttpFrame>
        );
    }
}
