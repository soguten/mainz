import { Component, CustomElement, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import type { DocsPagerLink } from "../../services/DocsService.ts";
import { buildDocsHref } from "../../lib/links.ts";
import { DocsService } from "../../services/DocsService.ts";

interface DocsPagerProps {
  currentSlug?: string;
  fallbackToFirst?: boolean;
  previous?: DocsPagerLink;
  next?: DocsPagerLink;
}

interface DocsPagerModel {
  previous?: DocsPagerLink;
  next?: DocsPagerLink;
}

@CustomElement("x-mainz-docs-pager")
@RenderStrategy("blocking")
export class DocsPager
  extends Component<DocsPagerProps, NoState, DocsPagerModel> {
  readonly docs = inject(DocsService);

  override load(): DocsPagerModel {
    if (this.props.previous || this.props.next) {
      return {
        previous: this.props.previous,
        next: this.props.next,
      };
    }

    if (this.props.currentSlug) {
      return this.docs.getPagerBySlug(this.props.currentSlug);
    }

    if (this.props.fallbackToFirst) {
      return this.docs.getPagerBySlug();
    }

    return {};
  }

  override render(data: DocsPagerModel) {
    if (!data.previous && !data.next) {
      return document.createDocumentFragment();
    }

    return (
      <div class="docs-pager">
        {data.previous
          ? <DocsPagerLinkCard entry={data.previous} label="Previous page" />
          : <div />}
        {data.next
          ? <DocsPagerLinkCard entry={data.next} label="Next page" />
          : <div />}
      </div>
    );
  }
}

function DocsPagerLinkCard(props: {
  entry: DocsPagerLink;
  label: string;
}) {
  return (
    <a class="docs-pager-link" href={buildDocsHref(`/${props.entry.slug}`)}>
      <span class="docs-pager-kicker">{props.label}</span>
      <strong>{props.entry.title}</strong>
    </a>
  );
}
