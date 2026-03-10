export const pageStyles = /* css */`
    :root {
        --paper: #f4f1ea;
        --paper-strong: #ece6d8;
        --ink: #141414;
        --ink-soft: #3a3a3a;
        --line: #1f1f1f;
        --line-soft: #7f7f7f;
        --surface: #faf8f2;
        --radius: 8px;
        --space: 1.3rem;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        color: var(--ink);
        font-family: "Libre Baskerville", Georgia, serif;
        background:
            repeating-linear-gradient(
                0deg,
                rgba(0, 0, 0, 0.018) 0,
                rgba(0, 0, 0, 0.018) 1px,
                transparent 1px,
                transparent 30px
            ),
            var(--paper);
    }

    #app {
        min-height: 100vh;
    }

    .page-shell {
        width: min(1080px, calc(100% - 1.4rem));
        margin: 0 auto;
        padding: 1rem 0 3rem;
        display: grid;
        gap: 1rem;
    }

    .page-shell > * {
        animation: press-reveal 320ms ease both;
    }

    .page-shell > *:nth-child(2) { animation-delay: 40ms; }
    .page-shell > *:nth-child(3) { animation-delay: 80ms; }
    .page-shell > *:nth-child(4) { animation-delay: 120ms; }
    .page-shell > *:nth-child(5) { animation-delay: 160ms; }
    .page-shell > *:nth-child(6) { animation-delay: 200ms; }

    @keyframes press-reveal {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .panel {
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: var(--radius);
        padding: var(--space);
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.08);
    }

    .top-nav {
        position: relative;
        padding: 0.8rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        transition: transform 0.24s ease, opacity 0.24s ease;
    }

    .top-nav.floating {
        position: sticky;
        top: 0.5rem;
        z-index: 20;
        backdrop-filter: blur(4px);
        background: rgba(250, 248, 242, 0.92);
    }

    .brand {
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.75rem;
        font-weight: 700;
        text-decoration: none;
        color: var(--ink);
        letter-spacing: 0.03em;
        text-transform: lowercase;
    }

    .top-links {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .top-links a {
        text-decoration: none;
        color: var(--ink);
        border: 1px solid var(--line-soft);
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
        font-size: 0.83rem;
        background: #ffffff;
    }

    .hero h1 {
        margin: 0.2rem 0 0.7rem;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: clamp(2rem, 4.6vw, 3.2rem);
        line-height: 1.1;
        max-width: 19ch;
        text-wrap: balance;
    }

    .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 700;
        font-size: 0.72rem;
        color: var(--ink-soft);
    }

    .lead {
        margin: 0;
        max-width: 66ch;
        color: var(--ink-soft);
        line-height: 1.5;
    }

    .hero-cta-row {
        margin-top: 1rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
    }

    .button {
        border: 1.4px solid var(--line);
        border-radius: 6px;
        padding: 0.52rem 0.85rem;
        text-decoration: none;
        font-family: "Libre Baskerville", Georgia, serif;
        font-weight: 700;
        font-size: 0.86rem;
        cursor: pointer;
        transition: transform 0.15s ease;
    }

    .button:hover {
        transform: translateY(-1px);
    }

    .button-primary {
        background: var(--ink);
        color: var(--paper);
    }

    .button-ghost {
        background: #ffffff;
        color: var(--ink);
    }

    .section-head h2,
    .chapter-title,
    .concept-section h2,
    .tutorial-section h2,
    .checkpoint h2,
    .next-steps h2,
    .sandbox h2 {
        margin: 0.35rem 0 0.65rem;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: clamp(1.5rem, 3.6vw, 2.1rem);
        line-height: 1.12;
    }

    .section-head p,
    .chapter-description,
    .step-description,
    .step-goal,
    .concept-card p,
    .next-card p,
    .sandbox p {
        color: var(--ink-soft);
        line-height: 1.5;
    }

    .chapter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .progress-chip {
        border: 1px solid var(--line);
        padding: 0.25rem 0.55rem;
        border-radius: 4px;
        background: #fff;
        font-size: 0.82rem;
        font-weight: 700;
    }

    .chapter-row {
        margin-top: 0.8rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .chapter-button {
        border: 1px solid var(--line-soft);
        border-radius: 4px;
        padding: 0.35rem 0.6rem;
        background: #fff;
        color: var(--ink-soft);
        font-family: "Libre Baskerville", Georgia, serif;
        font-size: 0.84rem;
        cursor: pointer;
    }

    .chapter-button.active {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--paper);
    }

    .chapter-description {
        margin: 0.8rem 0 0;
        max-width: 64ch;
    }

    .journey-code {
        margin-top: 0.8rem;
    }

    .concept-grid,
    .next-grid {
        margin-top: 0.9rem;
        display: grid;
        gap: 0.8rem;
    }

    .concept-grid,
    .next-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .concept-card,
    .sandbox-card,
    .next-card {
        border: 1px solid var(--line-soft);
        border-radius: 6px;
        background: #fff;
        padding: 0.9rem;
    }

    .concept-tag {
        display: inline-flex;
        border: 1px solid var(--line-soft);
        background: var(--paper-strong);
        border-radius: 999px;
        padding: 0.14rem 0.5rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.03em;
    }

    .concept-card h3,
    .sandbox-card h3,
    .next-card h3 {
        margin: 0.5rem 0;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.2rem;
    }

    .step-index {
        margin: 0;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--ink-soft);
        font-weight: 700;
    }

    .step-goal {
        margin-top: 0.55rem;
    }

    pre {
        margin: 0.8rem 0 0;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: #111;
        color: #eee;
        padding: 0.72rem;
        overflow-x: auto;
        font-size: 0.8rem;
        line-height: 1.44;
    }

    code {
        font-family: "IBM Plex Mono", Consolas, monospace;
    }

    .hljs {
        display: block;
        background: transparent;
        color: inherit;
        padding: 0;
    }

    .checkpoint-question {
        margin: 0.2rem 0 0.7rem;
        color: var(--ink);
        font-weight: 700;
    }

    .checkpoint-options {
        display: grid;
        gap: 0.45rem;
        margin-bottom: 0.8rem;
    }

    .checkpoint-option {
        border: 1px solid var(--line-soft);
        border-radius: 4px;
        padding: 0.5rem 0.6rem;
        background: #fff;
        text-align: left;
        font-family: "Libre Baskerville", Georgia, serif;
        color: var(--ink-soft);
        cursor: pointer;
    }

    .checkpoint-option.active {
        border-color: var(--line);
        color: var(--ink);
        background: var(--paper-strong);
    }

    .checkpoint-result {
        margin: 0.8rem 0 0;
        padding: 0.5rem 0.6rem;
        border: 1px solid var(--line-soft);
        border-radius: 4px;
        background: #fff;
    }

    .checkpoint-result.ok {
        border-color: #325b32;
        color: #325b32;
    }

    .checkpoint-result.fail {
        border-color: #7a3131;
        color: #7a3131;
    }

    .checkpoint-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .checkpoint-actions .button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .checkpoint-score {
        margin: 0.7rem 0 0;
        color: var(--ink);
        font-weight: 700;
    }

    .sandbox-title {
        margin: 0;
        font-weight: 700;
    }

    .sandbox-editor-label {
        display: inline-flex;
        margin-top: 0.3rem;
        font-size: 0.86rem;
        color: var(--ink-soft);
    }

    .sandbox-editor {
        width: 100%;
        min-height: 250px;
        resize: vertical;
        margin-top: 0.5rem;
        padding: 0.7rem;
        border: 1px solid var(--line-soft);
        border-radius: 6px;
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 0.83rem;
        line-height: 1.5;
        background: #fff;
        color: #1e1e1e;
    }

    .sandbox-actions {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
        margin-top: 0.7rem;
    }

    .back-link {
        margin-top: 0.9rem;
        display: inline-flex;
        text-decoration: none;
        color: var(--ink);
        border-bottom: 1px solid var(--line-soft);
        font-size: 0.86rem;
    }

    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.8rem;
        flex-wrap: wrap;
    }

    .footer p {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.85rem;
    }

    .source-link {
        text-decoration: none;
        color: var(--ink);
        border: 1px solid var(--line-soft);
        border-radius: 4px;
        padding: 0.35rem 0.56rem;
        background: #fff;
        font-size: 0.82rem;
        font-weight: 700;
    }

    @media (max-width: 760px) {
        .top-links {
            justify-content: flex-start;
        }

        .button {
            width: 100%;
            justify-content: center;
        }
    }
`;
