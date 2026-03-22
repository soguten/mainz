export const authorizeSiteStyles = `
    :host {
        color: #1f2937;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    * {
        box-sizing: border-box;
    }

    a {
        color: inherit;
    }

    .authorize-site-app {
        min-height: 100vh;
        padding: 32px 20px 56px;
        background:
            radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 34%),
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #ecfeff 46%, #fffbeb 100%);
    }

    .authorize-site-shell {
        max-width: 1120px;
        margin: 0 auto;
        display: grid;
        gap: 24px;
    }

    .authorize-site-header {
        display: grid;
        gap: 18px;
        padding: 28px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(14px);
    }

    .authorize-site-topline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
    }

    .authorize-site-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0f766e;
        text-decoration: none;
    }

    .authorize-site-brand-mark {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background:
            linear-gradient(135deg, #0f766e 0%, #14b8a6 58%, #f59e0b 100%);
        box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.12);
    }

    .authorize-site-status {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
    }

    .authorize-site-status-copy {
        display: grid;
        gap: 2px;
        text-align: right;
    }

    .authorize-site-status-label {
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #0f766e;
    }

    .authorize-site-status-summary {
        color: #475569;
        font-size: 0.92rem;
    }

    .authorize-site-button,
    .authorize-site-link-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(15, 118, 110, 0.16);
        background: #ffffff;
        color: #0f172a;
        font: inherit;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
    }

    .authorize-site-button:hover,
    .authorize-site-link-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(15, 118, 110, 0.36);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    }

    .authorize-site-button-primary {
        border-color: transparent;
        background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
        color: #f8fafc;
    }

    .authorize-site-hero {
        display: grid;
        gap: 18px;
    }

    .authorize-site-eyebrow {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0f766e;
    }

    .authorize-site-title {
        margin: 0;
        max-width: 14ch;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: clamp(2.8rem, 5vw, 4.6rem);
        line-height: 0.96;
        color: #0f172a;
    }

    .authorize-site-lead {
        margin: 0;
        max-width: 66ch;
        font-size: 1.04rem;
        line-height: 1.7;
        color: #475569;
    }

    .authorize-site-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .authorize-site-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.08);
        color: #134e4a;
        font-size: 0.92rem;
        font-weight: 600;
    }

    .authorize-site-pill-muted {
        background: rgba(148, 163, 184, 0.12);
        color: #334155;
    }

    .authorize-site-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .authorize-site-runtime-panel {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }

    .authorize-site-runtime-card {
        display: grid;
        gap: 14px;
        padding: 20px;
        border-radius: 24px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .authorize-site-runtime-card h2 {
        margin: 0;
        font-family: "Cormorant Garamond", Georgia, serif;
        color: #0f172a;
    }

    .authorize-site-runtime-card p {
        margin: 0;
        color: #475569;
        line-height: 1.68;
    }

    .authorize-site-runtime-heading {
        display: grid;
        gap: 6px;
    }

    .authorize-site-json-block {
        overflow: auto;
        margin: 0;
        padding: 16px;
        border-radius: 18px;
        background: #0f172a;
        color: #dbeafe;
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 0.86rem;
        line-height: 1.65;
    }

    .authorize-site-check-list {
        display: grid;
        gap: 12px;
    }

    .authorize-site-check-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(248, 250, 252, 0.92);
        border: 1px solid rgba(15, 23, 42, 0.06);
    }

    .authorize-site-check-copy {
        display: grid;
        gap: 3px;
    }

    .authorize-site-check-label {
        font-weight: 700;
        color: #0f172a;
    }

    .authorize-site-check-reason {
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .authorize-site-check-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 58px;
        padding: 8px 10px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .authorize-site-check-badge[data-result="pass"] {
        background: rgba(20, 184, 166, 0.16);
        color: #0f766e;
    }

    .authorize-site-check-badge[data-result="fail"] {
        background: rgba(239, 68, 68, 0.12);
        color: #b91c1c;
    }

    .authorize-site-nav-link {
        display: grid;
        gap: 3px;
        min-width: 180px;
        padding: 14px 16px;
        border-radius: 20px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.72);
        text-decoration: none;
        transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    }

    .authorize-site-nav-link:hover {
        transform: translateY(-1px);
        border-color: rgba(15, 118, 110, 0.32);
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    }

    .authorize-site-nav-link[data-active="true"] {
        border-color: transparent;
        background: linear-gradient(135deg, rgba(15, 118, 110, 0.94), rgba(20, 184, 166, 0.94));
        color: #f8fafc;
    }

    .authorize-site-nav-title {
        font-weight: 700;
    }

    .authorize-site-nav-summary,
    .authorize-site-nav-access {
        font-size: 0.86rem;
        line-height: 1.45;
    }

    .authorize-site-body {
        display: grid;
        gap: 18px;
    }

    .authorize-site-card-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .authorize-site-card,
    .authorize-site-panel,
    .authorize-site-login-card {
        padding: 22px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
    }

    .authorize-site-card h2,
    .authorize-site-card h3,
    .authorize-site-panel h2,
    .authorize-site-panel h3,
    .authorize-site-login-card h3 {
        margin: 0 0 10px;
        font-family: "Cormorant Garamond", Georgia, serif;
        color: #0f172a;
    }

    .authorize-site-card p,
    .authorize-site-panel p,
    .authorize-site-login-card p,
    .authorize-site-owner-tools p {
        margin: 0;
        color: #475569;
        line-height: 1.68;
    }

    .authorize-site-panel {
        display: grid;
        gap: 16px;
    }

    .authorize-site-kv {
        display: grid;
        gap: 8px;
    }

    .authorize-site-kv-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: baseline;
    }

    .authorize-site-kv-label {
        min-width: 110px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #0f766e;
    }

    .authorize-site-code {
        display: inline-flex;
        padding: 4px 8px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.06);
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 0.88rem;
        color: #0f172a;
    }

    .authorize-site-note {
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid rgba(245, 158, 11, 0.2);
        background: rgba(255, 251, 235, 0.94);
        color: #92400e;
        line-height: 1.65;
    }

    .authorize-site-login-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .authorize-site-login-card {
        display: grid;
        gap: 14px;
    }

    .authorize-site-login-route {
        color: #0f766e;
        font-size: 0.9rem;
        font-weight: 700;
    }

    .authorize-site-owner-shell {
        display: grid;
        gap: 12px;
    }

    .authorize-site-owner-tools {
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: 20px;
        background: linear-gradient(160deg, #0f172a 0%, #0f766e 100%);
        color: #f8fafc;
    }

    .authorize-site-owner-tools h3,
    .authorize-site-owner-tools p {
        color: inherit;
    }

    .authorize-site-owner-tools ul {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 8px;
    }

    .authorize-site-inline-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    @media (max-width: 720px) {
        .authorize-site-app {
            padding: 18px 14px 34px;
        }

        .authorize-site-header {
            padding: 22px 18px;
        }

        .authorize-site-status-copy {
            text-align: left;
        }

        .authorize-site-topline {
            align-items: flex-start;
        }

        .authorize-site-nav-link {
            min-width: unset;
            width: 100%;
        }
    }
`;
