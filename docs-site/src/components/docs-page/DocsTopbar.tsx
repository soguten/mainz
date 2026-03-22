import { buildDocsHref } from "../../lib/links.ts";
import { ThemeToggle } from "../ThemeToggle.tsx";

export function DocsTopbar() {
    return (
        <header class="docs-topbar">
            <a class="docs-brand" href={buildDocsHref("/")}>
                <span class="docs-brand-mark">Mz</span>
                <span class="docs-brand-copy">
                    <span class="docs-brand-label">Mainz Docs</span>
                    <span class="docs-brand-meta">Documentation demo for Mainz</span>
                </span>
            </a>

            <div class="docs-topbar-actions">
                <nav class="docs-top-links" aria-label="Primary">
                    <a href={buildDocsHref("/")}>Overview</a>
                    <a href={buildDocsHref("/quickstart")}>Guides</a>
                    <a href={buildDocsHref("/data-loading")}>Reference</a>
                </nav>
                <ThemeToggle />
            </div>
        </header>
    );
}
