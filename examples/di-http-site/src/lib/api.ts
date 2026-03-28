import { HttpClient } from "mainz/http";
import { createMockFetch, delayWithSignal, httpError, jsonResponse } from "mainz/http/testing";
import {
    getStoryBySlug,
    listFeaturedStories,
    listRelatedStories,
    type StoryDetail,
    type StorySummary,
} from "./story-data.ts";

export abstract class StoriesApi {

    abstract listFeatured(options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]>;
    abstract getBySlug(slug: string, options?: { signal?: AbortSignal }): Promise<StoryDetail>;
    abstract listRelated(slug: string, options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]>;
}

export class HttpStoriesApi extends StoriesApi {

    constructor(private readonly http: HttpClient) {
        super();
    }

    override async listFeatured(options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]> {
        return await this.http.get("/stories/featured", {
            signal: options?.signal,
        }).json<readonly StorySummary[]>();
    }

    override async getBySlug(slug: string, options?: { signal?: AbortSignal }): Promise<StoryDetail> {
        return await this.http.get(`/stories/${slug}`, {
            signal: options?.signal,
        }).json<StoryDetail>();
    }

    override async listRelated(slug: string, options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]> {
        return await this.http.get(`/stories/${slug}/related`, {
            signal: options?.signal,
        }).json<readonly StorySummary[]>();
    }
}

export class MockStoriesApi extends StoriesApi {

    override async listFeatured(options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]> {
        return await delayWithSignal(
            listFeaturedStories().map((story) => ({
                ...story,
                eyebrow: `${story.eyebrow} mock`,
            })),
            options?.signal,
            80,
        );
    }

    override async getBySlug(slug: string, options?: { signal?: AbortSignal }): Promise<StoryDetail> {
        const story = getStoryBySlug(slug);

        if (!story) {
            throw new Error(`Story "${slug}" was not found.`);
        }

        return await delayWithSignal(
            {
                ...story,
                title: `[mock] ${story.title}`,
                summary:
                    `${story.summary} This result came from the swapped service implementation.`,
            },
            options?.signal,
            60,
        );
    }

    override async listRelated(slug: string, options?: { signal?: AbortSignal }): Promise<readonly StorySummary[]> {
        return await delayWithSignal(
            listRelatedStories(slug).map((story) => ({
                ...story,
                summary: `Mock service: ${story.summary}`,
            })),
            options?.signal,
            50,
        );
    }
}

export function createDiHttpExampleFetch(args: { latencyMs?: number } = {}): typeof fetch {
    const latencyMs = Math.max(0, args.latencyMs ?? 280);
    const relatedLatencyMs = Math.max(latencyMs + 1600, 1800);

    return createMockFetch((routes) => {
        routes.get("/stories/featured", async ({ signal }) => {
            await delayWithSignal(undefined, signal, latencyMs);
            return jsonResponse(listFeaturedStories());
        });

        routes.get("/stories/:slug", async ({ params, signal }) => {
            await delayWithSignal(undefined, signal, latencyMs);
            const story = getStoryBySlug(params.slug);
            return story
                ? jsonResponse(story)
                : httpError(404, { message: "Not found" });
        });

        routes.get("/stories/:slug/related", async ({ params, signal }) => {
            await delayWithSignal(undefined, signal, relatedLatencyMs);
            return jsonResponse(listRelatedStories(params.slug));
        });
    });
}
