export const pageStyles = /* css */ `
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
        min-width: 0;
    }

    .panel {
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: var(--radius);
        padding: var(--space);
        box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.08);
    }

    .top-nav {
        padding: 0.8rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .top-nav-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        flex-wrap: wrap;
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

    .locale-switcher {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.22rem 0.28rem 0.22rem 0.6rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 241, 234, 0.88)),
            #fff;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }

    .locale-switcher-label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-soft);
    }

    .locale-switcher-list {
        display: inline-flex;
        gap: 0.28rem;
        padding: 0.1rem;
        border-radius: 999px;
        background: rgba(20, 20, 20, 0.06);
    }

    .locale-chip {
        min-width: 2.8rem;
        text-align: center;
        text-decoration: none;
        color: var(--ink);
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        background: transparent;
        transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
    }

    .locale-chip:hover {
        transform: translateY(-1px);
        background: rgba(20, 20, 20, 0.08);
    }

    .locale-chip.active {
        background: var(--ink);
        color: var(--paper);
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) inset;
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
        max-width: 100%;
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

    .sandbox-editor-shell {
        margin-top: 0.5rem;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 36%),
            #10141c;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .sandbox-editor-gutter {
        padding: 0.85rem 0.65rem;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.18);
        color: #7f8795;
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 0.83rem;
        line-height: 1.5;
        text-align: right;
        user-select: none;
        overflow: hidden;
    }

    .sandbox-editor-line {
        display: block;
        min-width: 2ch;
    }

    .sandbox-editor-stack {
        display: grid;
        min-height: 250px;
    }

    .sandbox-editor-stack > * {
        grid-area: 1 / 1;
    }

    .sandbox-editor-preview,
    .sandbox-editor {
        min-height: 250px;
        margin: 0;
        padding: 0.85rem 1rem;
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 0.83rem;
        line-height: 1.5;
        letter-spacing: normal;
        tab-size: 4;
        white-space: pre;
        font-variant-ligatures: none;
        font-feature-settings: "liga" 0, "calt" 0;
    }

    .sandbox-editor-preview {
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #d7dde8;
        overflow: hidden;
        pointer-events: none;
    }

    .sandbox-editor-preview .hljs {
        min-height: 100%;
    }

    .sandbox-editor-preview code.hljs {
        display: block;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: visible;
    }

    .sandbox-editor-preview code,
    .sandbox-editor-preview .hljs,
    .sandbox-editor-preview .hljs * {
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        font-weight: 400;
        font-style: normal;
        font-variant-ligatures: none;
        font-feature-settings: "liga" 0, "calt" 0;
    }

    .sandbox-editor {
        width: 100%;
        resize: vertical;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: transparent;
        caret-color: #f6ead0;
        overflow: auto;
        outline: none;
    }

    .sandbox-editor::selection {
        background: rgba(255, 255, 255, 0.18);
    }

    .sandbox-editor:focus {
        box-shadow: inset 0 0 0 1px rgba(246, 234, 208, 0.35);
    }

    .sandbox-editor::-webkit-scrollbar,
    .sandbox-editor-preview::-webkit-scrollbar,
    .sandbox-editor-gutter::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    .sandbox-editor::-webkit-scrollbar-thumb,
    .sandbox-editor-preview::-webkit-scrollbar-thumb,
    .sandbox-editor-gutter::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.18);
        border-radius: 999px;
    }

    .sandbox-editor::-webkit-scrollbar-track,
    .sandbox-editor-preview::-webkit-scrollbar-track,
    .sandbox-editor-gutter::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.04);
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
        .page-shell {
            width: min(1080px, calc(100% - 1rem));
        }

        .top-nav,
        .chapter-header {
            align-items: flex-start;
        }

        .top-nav {
            padding: 0.9rem;
            flex-direction: column;
        }

        .top-links {
            width: 100%;
            justify-content: flex-start;
        }

        .top-nav-actions {
            width: 100%;
            justify-content: flex-start;
        }

        .top-links a {
            flex: 1 1 calc(50% - 0.45rem);
            text-align: center;
        }

        .locale-switcher {
            width: 100%;
            justify-content: space-between;
        }

        .chapter-row {
            display: grid;
            grid-template-columns: 1fr;
        }

        .chapter-button {
            width: 100%;
        }

        pre {
            font-size: 0.75rem;
        }

        .button {
            width: 100%;
            justify-content: center;
        }
    }
`;
