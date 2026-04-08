import { Component, CustomElement, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";
import type { DocsNavSection } from "../../services/DocsService.ts";
import { buildDocsHref } from "../../lib/links.ts";
import { DocsService } from "../../services/DocsService.ts";
import { RecentlyViewedDocs } from "../RecentlyViewedDocs.tsx";

interface DocsSidebarProps {
    activeSlug?: string;
}

@CustomElement("x-mainz-docs-sidebar")
@RenderStrategy("blocking")
export class DocsSidebar extends Component<DocsSidebarProps, NoState, readonly DocsNavSection[]> {
    readonly docs = inject(DocsService);

    override load(): readonly DocsNavSection[] {
        return this.docs.listNavSections();
    }

    override render(data: readonly DocsNavSection[]) {
        return (
            <aside class="docs-sidebar">
                <p class="docs-sidebar-title">Documentation</p>
                <div class="docs-nav-sections">
                    <DocsNavLink
                        href="/"
                        title="Overview"
                        active={!this.props.activeSlug}
                        variant="root"
                    />

                    {data.map((section) => (
                        <DocsNavSectionView section={section} activeSlug={this.props.activeSlug} />
                    ))}

                    {this.props.activeSlug ? <RecentlyViewedDocs /> : null}
                </div>
            </aside>
        );
    }
}

function DocsNavSectionView(props: {
    section: DocsNavSection;
    activeSlug?: string;
}) {
    return (
        <section class="docs-nav-section">
            <h2 class="docs-nav-section-title">{props.section.title}</h2>

            {props.section.items.length > 0
                ? (
                    <nav class="docs-nav">
                        {props.section.items.map((item) => (
                            <DocsNavLink
                                href={`/${item.slug}`}
                                title={item.title}
                                active={item.slug === props.activeSlug}
                            />
                        ))}
                    </nav>
                )
                : null}

            {props.section.groups?.map((group) => (
                <div class="docs-nav-subgroup">
                    <p class="docs-nav-subgroup-title">{group.title}</p>
                    <nav class="docs-nav docs-nav-nested">
                        {group.items.map((item) => (
                            <DocsNavLink
                                href={`/${item.slug}`}
                                title={item.title}
                                active={item.slug === props.activeSlug}
                                variant="nested"
                            />
                        ))}
                    </nav>
                </div>
            ))}
        </section>
    );
}

function DocsNavLink(props: {
    href: string;
    title: string;
    active: boolean;
    variant?: "default" | "nested" | "root";
}) {
    const variantClass = props.variant === "nested"
        ? " docs-nav-link-nested"
        : props.variant === "root"
        ? " docs-nav-link-root"
        : "";

    return (
        <a
            class={`docs-nav-link${variantClass}${props.active ? " active" : ""}`}
            href={buildDocsHref(props.href)}
            aria-current={props.active ? "page" : undefined}
        >
            <span class="docs-nav-title">{props.title}</span>
        </a>
    );
}
