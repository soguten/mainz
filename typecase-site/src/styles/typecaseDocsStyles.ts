export const typecaseDocsStyles = /* css */ `
    html,
    body {
        margin: 0;
        padding: 0;
    }

    body,
    #app {
        min-height: 100vh;
    }

    .typecase-docs-body {
        min-width: 0;
    }

    .typecase-docs-main {
        min-width: 0;
    }

    .typecase-docs-sidebar-desktop,
    .typecase-docs-sidebar-mobile {
        min-width: 0;
    }

    .typecase-docs-sidebar-desktop {
        display: none;
    }

    .typecase-docs-sidebar-mobile .tc-offcanvas {
        background: transparent;
        border: 0;
        box-shadow: none;
        width: min(100%, 18rem);
    }

    .typecase-docs-sidebar-mobile .tc-offcanvas-header {
        padding-inline: 0;
        padding-top: 0;
        border-bottom: 0;
    }

    .typecase-docs-sidebar-mobile .tc-offcanvas-body {
        padding: 0;
    }

    .typecase-docs-sidebar-nav-title {
        display: block;
        margin-bottom: 0.625rem;
    }

    .typecase-docs-sidebar-intro {
        padding-bottom: 0.5rem;
    }

    .typecase-docs-sidebar-intro .tc-text[data-tone="muted"] {
        max-width: 22ch;
        font-size: 0.925rem;
    }

    .typecase-docs-sidebar-close {
        display: inline-flex;
    }

    .typecase-docs-sidebar-toggle {
        gap: 0.75rem;
        padding-inline: 0.875rem;
    }

    .typecase-docs-hero {
        display: grid;
        gap: 0.75rem;
    }

    .typecase-docs-section-grid {
        display: grid;
        gap: 1.5rem;
    }

    .typecase-docs-aside {
        min-width: 0;
    }

    .typecase-docs-content-flow {
        min-width: 0;
    }

    .typecase-docs-snippet code.hljs {
        display: block;
        background: transparent;
        color: var(--tc-code-text);
    }

    .typecase-docs-snippet .hljs-keyword,
    .typecase-docs-snippet .hljs-selector-tag,
    .typecase-docs-snippet .hljs-title.function_ {
        color: #c2410c;
    }

    .typecase-docs-snippet .hljs-string,
    .typecase-docs-snippet .hljs-attr {
        color: #0f766e;
    }

    .typecase-docs-snippet .hljs-number,
    .typecase-docs-snippet .hljs-literal,
    .typecase-docs-snippet .hljs-built_in {
        color: #7c3aed;
    }

    .typecase-docs-snippet .hljs-comment {
        color: #64748b;
    }

    .typecase-docs-snippet .hljs-type,
    .typecase-docs-snippet .hljs-title.class_,
    .typecase-docs-snippet .hljs-variable,
    .typecase-docs-snippet .hljs-property,
    .typecase-docs-snippet .hljs-params {
        color: #1d4ed8;
    }

    @media (min-width: 960px) {
        .typecase-docs-sidebar-desktop {
            display: block;
        }

        .typecase-docs-sidebar-close,
        .typecase-docs-sidebar-mobile {
            display: none;
        }
    }

    @media (max-width: 640px) {
    }
`;
