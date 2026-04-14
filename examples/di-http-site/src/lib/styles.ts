export const diHttpExampleStyles = `
    :host {
        --di-http-bg: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        --di-http-ink: #1f2937;
        --di-http-muted: #475569;
        --di-http-accent: #2563eb;
        --di-http-accent-soft: rgba(37, 99, 235, 0.12);
        --di-http-card: rgba(255, 255, 255, 0.94);
        --di-http-border: rgba(31, 41, 55, 0.1);
        --di-http-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
        color: var(--di-http-ink);
        display: block;
        min-height: 100vh;
        background: var(--di-http-bg);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .di-http-app {
        min-height: 100vh;
        padding: 32px 20px 56px;
        background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.1), transparent 28%),
            radial-gradient(circle at left center, rgba(148, 163, 184, 0.12), transparent 26%);
    }

    .di-http-shell {
        max-width: 1120px;
        margin: 0 auto;
        display: grid;
        gap: 24px;
    }

    .di-http-hero,
    .di-http-card,
    .di-http-panel,
    .di-http-related {
        background: var(--di-http-card);
        border: 1px solid var(--di-http-border);
        box-shadow: var(--di-http-shadow);
        border-radius: 20px;
    }

    .di-http-hero {
        padding: 28px;
        display: grid;
        gap: 18px;
    }

    .di-http-topline,
    .di-http-meta,
    .di-http-actions,
    .di-http-grid,
    .di-http-card-meta,
    .di-http-tag-row,
    .di-http-story-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
    }

    .di-http-brand,
    .di-http-link {
        color: inherit;
        text-decoration: none;
    }

    .di-http-brand {
        font-size: 0.95rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--di-http-muted);
    }

    .di-http-eyebrow {
        margin: 0;
        color: var(--di-http-accent);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.78rem;
    }

    .di-http-title {
        margin: 0;
        font-size: clamp(2.1rem, 4vw, 3.4rem);
        line-height: 1.02;
    }

    .di-http-lead,
    .di-http-copy,
    .di-http-card p,
    .di-http-panel p,
    .di-http-related p,
    .di-http-related li {
        margin: 0;
        color: var(--di-http-muted);
        line-height: 1.7;
        font-size: 1.02rem;
    }

    .di-http-chip,
    .di-http-link-chip {
        border-radius: 999px;
        padding: 10px 16px;
        border: 1px solid var(--di-http-border);
        background: rgba(255, 255, 255, 0.72);
        font-size: 0.9rem;
    }

    .di-http-chip[data-active="true"] {
        background: var(--di-http-accent-soft);
        border-color: rgba(13, 122, 116, 0.3);
        color: var(--di-http-accent);
    }

    .di-http-button[data-selected="true"] {
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .di-http-grid {
        align-items: stretch;
    }

    .di-http-card,
    .di-http-panel,
    .di-http-related {
        padding: 22px;
        display: grid;
        gap: 14px;
    }

    .di-http-card {
        flex: 1 1 280px;
        min-width: 260px;
    }

    .di-http-card h2,
    .di-http-card h3,
    .di-http-card .tc-card-title,
    .di-http-panel h2,
    .di-http-panel .tc-card-title,
    .di-http-related h2,
    .di-http-related .tc-card-title {
        margin: 0;
        font-size: 1.4rem;
    }

    .di-http-card-meta {
        justify-content: space-between;
        color: var(--di-http-muted);
        font-size: 0.88rem;
    }

    .di-http-card-link,
    .di-http-story-nav a {
        color: var(--di-http-accent);
        text-decoration: none;
        font-weight: 700;
    }

    .di-http-story-copy {
        display: grid;
        gap: 16px;
    }

    .di-http-tag {
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(31, 47, 58, 0.06);
        font-size: 0.82rem;
        color: var(--di-http-muted);
    }

    .di-http-related ul {
        margin: 0;
        padding-left: 20px;
        display: grid;
        gap: 10px;
    }

    .di-http-related a {
        color: var(--di-http-accent);
    }

    .di-http-panel--error {
        border-color: rgba(145, 48, 48, 0.18);
        background: rgba(255, 247, 247, 0.98);
    }

    .di-http-error-copy {
        color: #913030;
        font-weight: 700;
    }

    .di-http-skeleton-list {
        display: grid;
        gap: 14px;
    }

    .di-http-skeleton-card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 18px;
        background: rgba(31, 47, 58, 0.04);
        border: 1px solid rgba(31, 47, 58, 0.08);
    }

    .di-http-skeleton-line {
        display: block;
        height: 12px;
        border-radius: 999px;
        background:
            linear-gradient(
                90deg,
                rgba(31, 47, 58, 0.08) 0%,
                rgba(31, 47, 58, 0.16) 50%,
                rgba(31, 47, 58, 0.08) 100%
            );
        background-size: 200% 100%;
        animation: di-http-skeleton-wave 1.2s ease-in-out infinite;
    }

    .di-http-skeleton-line--title {
        width: 52%;
        height: 15px;
    }

    .di-http-skeleton-line--body {
        width: 100%;
    }

    .di-http-skeleton-line--body.short {
        width: 74%;
    }

    @keyframes di-http-skeleton-wave {
        0% {
            background-position: 200% 0;
        }

        100% {
            background-position: -200% 0;
        }
    }

    @media (max-width: 720px) {
        .di-http-app {
            padding: 18px 14px 36px;
        }

        .di-http-hero,
        .di-http-card,
        .di-http-panel,
        .di-http-related {
            border-radius: 18px;
        }
    }
`;
