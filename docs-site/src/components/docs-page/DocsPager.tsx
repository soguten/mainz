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
export class DocsPager extends Component<DocsPagerProps, NoState, DocsPagerModel> {
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

    override render() {
        if (!this.data.previous && !this.data.next) {
            return document.createDocumentFragment();
        }

        return (
            <div class="docs-pager">
                {this.data.previous
                    ? <DocsPagerLinkCard entry={this.data.previous} label="Previous page" />
                    : <div />}
                {this.data.next ? <DocsPagerLinkCard entry={this.data.next} label="Next page" /> : <div />}
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
