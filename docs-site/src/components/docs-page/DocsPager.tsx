import type { DocsPagerLink } from "../../lib/docs.ts";
import { buildDocsHref } from "../../lib/links.ts";

interface DocsPagerProps {
    previous?: DocsPagerLink;
    next?: DocsPagerLink;
}

export function DocsPager(props: DocsPagerProps) {
    if (!props.previous && !props.next) {
        return null;
    }

    return (
        <div class="docs-pager">
            {props.previous
                ? <DocsPagerLinkCard entry={props.previous} label="Previous page" />
                : <div />}
            {props.next ? <DocsPagerLinkCard entry={props.next} label="Next page" /> : <div />}
        </div>
    );
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
