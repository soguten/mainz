import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";

interface OnThisPageHeading {
    id: string;
    text: string;
    level: 2 | 3;
}

@CustomElement("x-mainz-docs-on-this-page")
@RenderStrategy("defer")
export class OnThisPage extends Component<NoProps, NoState, readonly OnThisPageHeading[]> {
    
    override async load(): Promise<readonly OnThisPageHeading[]> {
        return collectArticleHeadings();
    }

    override placeholder() {
        return (
            <aside class="docs-rail">
                <div class="docs-on-this-page">
                    <p class="docs-on-this-page-kicker">On this page</p>
                    <p class="docs-on-this-page-placeholder">Scanning sections...</p>
                </div>
            </aside>
        );
    }

    override render() {
        if (!this.route.params.slug) {
            return document.createDocumentFragment();
        }

        return renderOnThisPagePanel(this.data);
    }
}

function renderOnThisPagePanel(headings: readonly OnThisPageHeading[]) {
    if (headings.length === 0) {
        return document.createDocumentFragment();
    }

    return (
        <aside class="docs-rail">
            <div class="docs-on-this-page">
                <p class="docs-on-this-page-kicker">On this page</p>
                <nav class="docs-on-this-page-nav" aria-label="On this page">
                    {headings.map((heading) => (
                        <a
                            class={`docs-on-this-page-link${heading.level === 3 ? " nested" : ""}`}
                            href={`#${heading.id}`}
                        >
                            {heading.text}
                        </a>
                    ))}
                </nav>
            </div>
        </aside>
    );
}

function collectArticleHeadings(): readonly OnThisPageHeading[] {
    const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
            ".docs-article-body .docs-section-heading[id], .docs-article-body .docs-subheading[id]",
        ),
    );

    return elements.map((element) => ({
        id: element.id,
        text: element.textContent?.trim() ?? "",
        level: element.classList.contains("docs-subheading") ? 3 as const : 2 as const,
    })).filter((heading) => heading.id && heading.text);
}
