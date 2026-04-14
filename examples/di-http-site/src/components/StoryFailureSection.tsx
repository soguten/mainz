import { Component, type ComponentLoadContext, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import { Card } from "mainz/typecase";
import { StoriesApi } from "../lib/api.ts";
import type { StoryDetail } from "../lib/story-data.ts";
import { StoryFailureNotice } from "./StoryFailureNotice.tsx";
import { StoryFailureSkeleton } from "./StoryFailureSkeleton.tsx";

@RenderStrategy("defer")
export class StoryFailureSection extends Component<{ slug: string }, NoState, StoryDetail> {
    private readonly api = inject(StoriesApi);

    override load(context: ComponentLoadContext) {
        return this.api.getBySlug(`${this.props.slug}-missing`, {
            signal: context.signal,
        });
    }

    override placeholder() {
        return <StoryFailureSkeleton />;
    }

    override error(error: unknown) {
        return <StoryFailureNotice error={error} />;
    }

    override render() {
        return (
            <Card className="di-http-panel" variant="subtle">
                <p className="di-http-eyebrow">Error lifecycle example</p>
                <Card.Title>{this.data.title}</Card.Title>
                <p>{this.data.summary}</p>
            </Card>
        );
    }
}
