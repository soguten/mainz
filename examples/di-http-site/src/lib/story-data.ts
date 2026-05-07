export interface StorySummary {
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  readingTime: string;
}

export interface StoryDetail extends StorySummary {
  body: readonly string[];
  tags: readonly string[];
  relatedSlugs: readonly string[];
}

export const demoStories: readonly StoryDetail[] = [
  {
    slug: "dependency-map",
    title: "Keep Infrastructure Out Of Props",
    summary:
      "Register cross-cutting services once, then inject them where owners actually need them.",
    eyebrow: "DI basics",
    readingTime: "4 min",
    body: [
      "Mainz keeps route params and semantic input explicit. DI only enters when the dependency is infrastructure, not ownership data.",
      "That split matters because page and component contracts stay readable while service plumbing becomes much lighter.",
    ],
    tags: ["services", "props", "ownership"],
    relatedSlugs: ["abort-friendly-loading", "mock-replacements"],
  },
  {
    slug: "abort-friendly-loading",
    title: "Forward AbortSignal Through The API Layer",
    summary:
      "Page.load() and Component.load() still own cancellation, even when the transport lives behind a service token.",
    eyebrow: "Async ownership",
    readingTime: "5 min",
    body: [
      "The owner still decides when async work starts and stops. DI should not hide cancellation.",
      "Forwarding signal through the API service keeps stale requests from leaking across route or component changes.",
    ],
    tags: ["abort", "load", "http"],
    relatedSlugs: ["dependency-map", "mock-replacements"],
  },
  {
    slug: "mock-replacements",
    title: "Swap The Service, Keep The Contract",
    summary:
      "Tests and examples can replace the registered implementation without changing any page or component API.",
    eyebrow: "Testing ergonomics",
    readingTime: "3 min",
    body: [
      "The page still asks for StoriesApi. The component still asks for StoriesApi. Only startup registration changes.",
      "That gives you fake replacement without pushing HTTP clients or adapters into props.",
    ],
    tags: ["testing", "fakes", "registration"],
    relatedSlugs: ["dependency-map", "abort-friendly-loading"],
  },
];

export function listFeaturedStories(): readonly StorySummary[] {
  return demoStories.map(toSummary);
}

export function getStoryBySlug(slug: string): StoryDetail | undefined {
  return demoStories.find((story) => story.slug === slug);
}

export function listRelatedStories(slug: string): readonly StorySummary[] {
  const story = getStoryBySlug(slug);
  if (!story) {
    return [];
  }

  return story.relatedSlugs
    .map((relatedSlug) => getStoryBySlug(relatedSlug))
    .filter((entry): entry is StoryDetail => !!entry)
    .map(toSummary);
}

function toSummary(story: StoryDetail): StorySummary {
  return {
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    eyebrow: story.eyebrow,
    readingTime: story.readingTime,
  };
}
