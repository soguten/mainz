import { Component, type ComponentLoadContext, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import { StoriesApi } from "../lib/api.ts";
import type { StorySummary } from "../lib/story-data.ts";
import { RelatedStoriesSkeleton } from "./RelatedStoriesSkeleton.tsx";

interface RelatedStoriesSectionProps {
    slug: string;
}

@RenderStrategy("defer")
export class RelatedStoriesSection extends Component<RelatedStoriesSectionProps, NoState, readonly StorySummary[]> {
    
    private readonly api = inject(StoriesApi);

    override load(context: ComponentLoadContext) {
        return this.api.listRelated(this.props.slug, {
            signal: context.signal,
        });
    }

    override placeholder() {
        return <RelatedStoriesSkeleton />;
    }

    override render() {
        
        const items = this.data ?? [];

        return (
            <section className="di-http-related">
                <p className="di-http-eyebrow">Component-level injection</p>
                <h2>Related stories</h2>
                <p>
                    This section resolves through{" "}
                    <span className="di-http-link">Component.load()</span> using the same resolved
                    {" "}
                    <span className="di-http-link">StoriesApi</span> token as the page, while a
                    defer placeholder keeps the shell responsive. The related endpoint is slowed
                    down on purpose so this loading state is easy to inspect.
                </p>
                <ul>
                    {items.map((story) => (
                        <li key={story.slug}>
                            <a href={`/stories/${story.slug}`}>{story.title}</a>
                            <div>{story.summary}</div>
                        </li>
                    ))}
                </ul>
            </section>
        );
    }
}
