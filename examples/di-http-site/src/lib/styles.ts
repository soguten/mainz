export const diHttpExampleStyles = `
    :host {
        --di-http-bg: linear-gradient(180deg, #f7f3eb 0%, #f4ede2 40%, #efe5d6 100%);
        --di-http-ink: #1f2f3a;
        --di-http-muted: #5f6c75;
        --di-http-accent: #0d7a74;
        --di-http-accent-soft: rgba(13, 122, 116, 0.12);
        --di-http-card: rgba(255, 252, 247, 0.9);
        --di-http-border: rgba(31, 47, 58, 0.12);
        --di-http-shadow: 0 18px 60px rgba(57, 46, 28, 0.12);
        color: var(--di-http-ink);
        display: block;
        min-height: 100vh;
        background: var(--di-http-bg);
        font-family: Georgia, "Times New Roman", serif;
    }

    .di-http-app {
        min-height: 100vh;
        padding: 32px 20px 56px;
        background:
            radial-gradient(circle at top right, rgba(13, 122, 116, 0.16), transparent 30%),
            radial-gradient(circle at left center, rgba(191, 135, 72, 0.16), transparent 28%);
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
        border-radius: 24px;
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
        font-family: "Trebuchet MS", sans-serif;
        color: var(--di-http-muted);
    }

    .di-http-eyebrow {
        margin: 0;
        color: var(--di-http-accent);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.78rem;
        font-family: "Trebuchet MS", sans-serif;
    }

    .di-http-title {
        margin: 0;
        font-size: clamp(2.2rem, 4vw, 4.4rem);
        line-height: 0.95;
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
    .di-http-button,
    .di-http-link-chip {
        border-radius: 999px;
        padding: 10px 16px;
        border: 1px solid var(--di-http-border);
        background: rgba(255, 255, 255, 0.72);
        font-family: "Trebuchet MS", sans-serif;
        font-size: 0.9rem;
    }

    .di-http-chip[data-active="true"] {
        background: var(--di-http-accent-soft);
        border-color: rgba(13, 122, 116, 0.3);
        color: var(--di-http-accent);
    }

    .di-http-button {
        cursor: pointer;
        color: var(--di-http-ink);
    }

    .di-http-button[data-selected="true"] {
        background: var(--di-http-accent);
        color: white;
        border-color: var(--di-http-accent);
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
    .di-http-panel h2,
    .di-http-related h2 {
        margin: 0;
        font-size: 1.4rem;
    }

    .di-http-card-meta {
        justify-content: space-between;
        color: var(--di-http-muted);
        font-family: "Trebuchet MS", sans-serif;
        font-size: 0.88rem;
    }

    .di-http-card-link,
    .di-http-story-nav a {
        color: var(--di-http-accent);
        text-decoration: none;
        font-family: "Trebuchet MS", sans-serif;
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
        font-family: "Trebuchet MS", sans-serif;
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
        background:
            linear-gradient(180deg, rgba(255, 249, 247, 0.98), rgba(255, 241, 236, 0.96));
    }

    .di-http-error-copy {
        color: #913030;
        font-family: "Trebuchet MS", sans-serif;
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
