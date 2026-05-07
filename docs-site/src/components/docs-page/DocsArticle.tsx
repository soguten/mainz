import { buildDocsHref } from "../../lib/links.ts";
import { type MarkdownBlock, parseMarkdown } from "../../lib/markdown.ts";
import { DocsCodeBlock } from "./DocsCodeBlock.tsx";
import { DocsPager } from "./DocsPager.tsx";

export interface DocsOverviewCard {
  title: string;
  description: string;
  href: string;
}

export interface DocsArticleProps {
  title: string;
  summary: string;
  statusLabel?: string;
  overviewCards?: readonly DocsOverviewCard[];
  showFirstPager?: boolean;
  markdown: string;
  currentSlug?: string;
  resolveMarkdownHref?: (href: string) => string;
}

export function DocsArticle(props: DocsArticleProps) {
  const blocks = parseMarkdown(props.markdown);

  return (
    <article class="docs-article">
      <div class="docs-hero">
        <span class="docs-kicker">{props.statusLabel ?? "Mainz"}</span>
        <h1 class="docs-title">{props.title}</h1>
        <p class="docs-summary">{props.summary}</p>
      </div>

      <div class="docs-content">
        <DocsOverviewCards cards={props.overviewCards} />
        <DocsArticleBody
          blocks={blocks}
          resolveMarkdownHref={props.resolveMarkdownHref}
        />
        <DocsPager
          currentSlug={props.currentSlug}
          fallbackToFirst={props.showFirstPager}
        />
      </div>
    </article>
  );
}

function DocsOverviewCards(props: {
  cards?: readonly DocsOverviewCard[];
}) {
  if (!props.cards?.length) {
    return null;
  }

  return (
    <div class="docs-overview-grid">
      {props.cards.map((card) => (
        <a class="docs-card" href={buildDocsHref(card.href)}>
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </a>
      ))}
    </div>
  );
}

function DocsArticleBody(props: {
  blocks: readonly MarkdownBlock[];
  resolveMarkdownHref?: (href: string) => string;
}) {
  return (
    <div class="docs-article-body">
      {props.blocks.length > 0
        ? props.blocks.map((block) => (
          <MarkdownBlockView
            block={block}
            resolveMarkdownHref={props.resolveMarkdownHref}
          />
        ))
        : <div class="docs-empty">This page is still being drafted.</div>}
    </div>
  );
}

function MarkdownBlockView(props: {
  block: MarkdownBlock;
  resolveMarkdownHref?: (href: string) => string;
}) {
  const block = props.block;

  if (block.type === "heading") {
    if (block.level === 2) {
      return <h2 id={block.id} class="docs-section-heading">{block.text}</h2>;
    }

    return <h3 id={block.id} class="docs-subheading">{block.text}</h3>;
  }

  if (block.type === "paragraph") {
    return <p>{renderInlineMarkdown(block.text, props.resolveMarkdownHref)}</p>;
  }

  if (block.type === "blockquote") {
    return (
      <div class="docs-note">
        {renderInlineMarkdown(block.text, props.resolveMarkdownHref)}
      </div>
    );
  }

  return (
    <DocsCodeBlock
      language={block.language}
      label={block.label ?? block.language}
      content={block.content}
    />
  );
}

function renderInlineMarkdown(
  text: string,
  resolveMarkdownHref?: (href: string) => string,
): Array<string | HTMLElement> {
  const parts: Array<string | HTMLElement> = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }

    if (match[1]) {
      parts.push(<code class="docs-inline-code">{match[1]}</code>);
    } else if (match[2] && match[3]) {
      const resolvedHref = resolveMarkdownHref
        ? resolveMarkdownHref(match[3])
        : match[3];
      parts.push(
        <a
          class="docs-inline-link"
          href={resolvedHref.startsWith("/")
            ? buildDocsHref(resolvedHref)
            : resolvedHref}
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      parts.push(<strong>{match[4]}</strong>);
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}
