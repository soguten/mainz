export const docsStyles = `
:host {
  --docs-bg: #f3eee6;
  --docs-panel: #fffaf2;
  --docs-panel-strong: #fffefb;
  --docs-panel-muted: #ede3d5;
  --docs-border: rgba(94, 67, 35, 0.16);
  --docs-text: #221d17;
  --docs-muted: #695f54;
  --docs-accent: #d2693c;
  --docs-accent-strong: #a84c26;
  --docs-accent-soft: rgba(210, 105, 60, 0.12);
  --docs-code-bg: #182131;
  --docs-code-panel: #253249;
  --docs-code-text: #e9eef9;
  --docs-shadow: 0 18px 48px rgba(60, 42, 21, 0.08);
  display: block;
  color: var(--docs-text);
}

:host([data-theme="dark"]),
:host-context(html[data-theme="dark"]) {
  --docs-bg: #191b1f;
  --docs-panel: #171c23;
  --docs-panel-strong: #1d232c;
  --docs-panel-muted: #202733;
  --docs-border: rgba(255, 255, 255, 0.08);
  --docs-text: #f4efe8;
  --docs-muted: #b8aea1;
  --docs-accent: #ff9a62;
  --docs-accent-strong: #ffd0af;
  --docs-accent-soft: rgba(255, 154, 98, 0.12);
  --docs-code-bg: #10151d;
  --docs-code-panel: #1d2737;
  --docs-code-text: #edf3ff;
  --docs-shadow: 0 20px 56px rgba(0, 0, 0, 0.24);
}

.docs-app {
  min-height: 100vh;
  background: var(--docs-bg);
}

.docs-frame {
  max-width: 1380px;
  margin: 0 auto;
  padding: 0 28px 72px;
}

.docs-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 0 18px;
  border-bottom: 1px solid var(--docs-border);
  background: var(--docs-bg);
}

.docs-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
}

.docs-brand-mark {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--docs-accent), #efbc79);
  color: #1d140d;
  font: 700 1rem "Aptos Display", "Trebuchet MS", sans-serif;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.docs-brand-copy {
  display: grid;
  gap: 2px;
}

.docs-brand-label {
  font: 700 1rem "Aptos Display", "Trebuchet MS", sans-serif;
  letter-spacing: 0.01em;
}

.docs-brand-meta {
  color: var(--docs-muted);
  font: 500 0.78rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-topbar-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.docs-top-links {
  display: flex;
  align-items: center;
  gap: 18px;
}

.docs-top-links a {
  color: var(--docs-muted);
  text-decoration: none;
  font: 700 0.94rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-top-links a:hover {
  color: var(--docs-text);
}

.docs-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 34px;
  margin-top: 24px;
}

.docs-grid.has-rail {
  grid-template-columns: 280px minmax(0, 1fr) 220px;
}

.docs-sidebar {
  position: sticky;
  top: 24px;
  align-self: start;
  max-height: calc(100vh - 48px);
  padding: 24px 20px 28px 0;
  overflow: auto;
  border-right: 1px solid var(--docs-border);
}

.docs-sidebar-title {
  margin: 0 0 12px;
  color: var(--docs-muted);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font: 700 0.74rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-nav-sections {
  display: grid;
  gap: 16px;
}

.docs-recent-pages {
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding: 16px 14px;
  border: 1px solid var(--docs-border);
  border-radius: 18px;
  background: var(--docs-panel-strong);
  box-shadow: var(--docs-shadow);
}

.docs-recent-pages-placeholder {
  opacity: 0.94;
}

.docs-recent-pages-empty {
  margin: 0;
  color: var(--docs-muted);
  font: 500 0.92rem/1.6 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-nav-link-recent {
  padding: 10px 12px;
  border-radius: 14px;
}

.docs-nav-section {
  display: grid;
  gap: 10px;
}

.docs-nav-section-title {
  margin: 0;
  color: var(--docs-text);
  font: 800 0.96rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.docs-nav-subgroup {
  display: grid;
  gap: 8px;
}

.docs-nav-subgroup-title {
  margin: 4px 0 0;
  padding-left: 14px;
  color: var(--docs-muted);
  font: 700 0.8rem "Aptos", "Segoe UI Variable Text", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.docs-nav {
  display: grid;
  gap: 8px;
}

.docs-nav-link {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  text-decoration: none;
  color: inherit;
  transition: background-color 120ms ease, transform 120ms ease;
}

.docs-nav-link:hover {
  background: var(--docs-accent-soft);
  transform: translateX(2px);
}

.docs-nav-link.active {
  background: var(--docs-accent-soft);
  outline: 1px solid rgba(210, 105, 60, 0.22);
}

.docs-nav-link-root {
  margin-bottom: 4px;
}

.docs-nav-nested {
  padding-left: 10px;
}

.docs-nav-link-nested {
  position: relative;
  padding-left: 18px;
}

.docs-nav-link-nested.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 999px;
  background: var(--docs-accent);
}

.docs-nav-category {
  color: var(--docs-muted);
  font: 600 0.72rem "Aptos", "Segoe UI Variable Text", sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.docs-nav-title {
  font: 700 0.96rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-article {
  min-width: 0;
}

.docs-rail {
  position: sticky;
  top: 24px;
  align-self: start;
}

.docs-on-this-page {
  display: grid;
  gap: 14px;
  padding: 18px 16px;
  border: 1px solid var(--docs-border);
  border-radius: 20px;
  background: var(--docs-panel-strong);
  box-shadow: var(--docs-shadow);
}

.docs-on-this-page-kicker {
  margin: 0;
  color: var(--docs-muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font: 700 0.72rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-on-this-page-placeholder {
  margin: 0;
  color: var(--docs-muted);
  font: 500 0.92rem/1.6 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-on-this-page-nav {
  display: grid;
  gap: 8px;
}

.docs-on-this-page-link {
  color: var(--docs-text);
  text-decoration: none;
  font: 700 0.9rem/1.45 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-on-this-page-link.nested {
  padding-left: 12px;
  color: var(--docs-muted);
  font-weight: 600;
}

.docs-on-this-page-link:hover {
  color: var(--docs-accent-strong);
}

.docs-hero {
  padding: 30px 0 8px;
}

.docs-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--docs-accent-soft);
  color: var(--docs-accent-strong);
  font: 700 0.78rem "Aptos", "Segoe UI Variable Text", sans-serif;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.docs-title {
  margin: 14px 0 10px;
  font: 800 clamp(2rem, 4vw, 3.5rem) "Aptos Display", "Trebuchet MS", sans-serif;
  line-height: 0.98;
}

.docs-summary {
  max-width: 62ch;
  margin: 0;
  color: var(--docs-muted);
  font: 500 1.02rem/1.75 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-content {
  padding: 8px 0 34px;
}

.docs-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.docs-card {
  padding: 18px;
  border: 1px solid var(--docs-border);
  border-radius: 22px;
  background: var(--docs-panel-strong);
  text-decoration: none;
  color: inherit;
  box-shadow: var(--docs-shadow);
}

.docs-card h3 {
  margin: 0 0 8px;
  font: 700 1.1rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.docs-card p {
  margin: 0;
  color: var(--docs-muted);
  font: 500 0.96rem/1.6 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-section {
  padding: 26px 0;
  border-top: 1px solid var(--docs-border);
}

.docs-section:first-of-type {
  border-top: none;
}

.docs-section h2 {
  margin: 0 0 12px;
  font: 800 1.52rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.docs-section-heading {
  margin: 28px 0 14px;
  padding-top: 8px;
  border-top: 1px solid var(--docs-border);
  font: 800 1.7rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.docs-section-heading:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.docs-subheading {
  margin: 24px 0 12px;
  font: 800 1.16rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.docs-section p {
  margin: 0 0 14px;
  color: var(--docs-muted);
  font: 500 1rem/1.75 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-content p {
  margin: 0 0 14px;
  color: var(--docs-muted);
  font: 500 1rem/1.75 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-note {
  margin-top: 16px;
  padding: 16px 18px;
  border-left: 4px solid var(--docs-accent);
  border-radius: 16px;
  background: var(--docs-panel-strong);
  color: var(--docs-text);
  font: 600 0.95rem/1.65 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-code {
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 24px;
  background: var(--docs-code-bg);
  color: var(--docs-code-text);
  box-shadow: var(--docs-shadow);
}

:host([data-theme="dark"]) .docs-code,
:host-context(html[data-theme="dark"]) .docs-code {
  border-color: rgba(255, 255, 255, 0.1);
}

.docs-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--docs-code-panel);
  color: #f4f8ff;
  font: 600 0.8rem "Aptos", "Segoe UI Variable Text", sans-serif;
  opacity: 1;
}

.docs-code-header-copy {
  display: flex;
  align-items: center;
  gap: 10px;
}

.docs-code-label {
  color: #ffffff;
  font-weight: 800;
}

.docs-code-language {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #d6e6ff;
  opacity: 1;
}

.docs-copy-button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  padding: 8px 12px;
  font: 700 0.8rem "Aptos", "Segoe UI Variable Text", sans-serif;
  cursor: pointer;
  opacity: 1;
}

.docs-copy-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.docs-code-body {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.01), transparent 14%);
}

.docs-code pre {
  margin: 0;
  padding: 18px;
  overflow-x: auto;
  font: 500 0.9rem/1.7 "Cascadia Code", "Consolas", monospace;
  opacity: 1;
}

.docs-code code.hljs {
  display: block;
  background: transparent;
  color: var(--docs-code-text);
  opacity: 1;
}

.docs-code .hljs-keyword,
.docs-code .hljs-selector-tag,
.docs-code .hljs-title.function_ {
  color: #ff8b8b;
}

.docs-code .hljs-string,
.docs-code .hljs-attr {
  color: #96d0ff;
}

.docs-code .hljs-number,
.docs-code .hljs-literal {
  color: #f2c572;
}

.docs-code .hljs-comment {
  color: #7e8aa3;
}

.docs-code .hljs-type,
.docs-code .hljs-title.class_ {
  color: #8be9c1;
}

.docs-code .hljs-variable,
.docs-code .hljs-property,
.docs-code .hljs-params {
  color: #f5f8ff;
}

.docs-code code,
.docs-code span {
  opacity: 1;
}

.docs-empty {
  padding: 20px;
  border: 1px dashed var(--docs-border);
  border-radius: 18px;
  color: var(--docs-muted);
  background: var(--docs-panel-strong);
  font: 500 0.98rem/1.7 "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-inline-code {
  padding: 2px 7px;
  border-radius: 8px;
  background: var(--docs-panel-muted);
  color: var(--docs-text);
  font: 600 0.92em "Cascadia Code", "Consolas", monospace;
}

.docs-inline-link {
  color: var(--docs-accent-strong);
  text-decoration: none;
  font-weight: 700;
}

.docs-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 36px;
}

.docs-pager-link {
  display: grid;
  gap: 6px;
  padding: 18px 22px;
  border: 1px solid var(--docs-border);
  border-radius: 18px;
  background: var(--docs-panel-strong);
  color: inherit;
  text-decoration: none;
  box-shadow: var(--docs-shadow);
}

.docs-pager-kicker {
  color: var(--docs-muted);
  font: 600 0.88rem "Aptos", "Segoe UI Variable Text", sans-serif;
}

.docs-pager-link strong {
  color: var(--docs-accent-strong);
  font: 800 1.05rem "Aptos Display", "Trebuchet MS", sans-serif;
}

.theme-toggle {
  border: 1px solid var(--docs-border);
  border-radius: 999px;
  background: var(--docs-panel);
  color: var(--docs-text);
  padding: 10px 14px;
  font: 700 0.88rem "Aptos", "Segoe UI Variable Text", sans-serif;
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--docs-accent-soft);
}

@media (max-width: 1100px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }

  .docs-grid.has-rail {
    grid-template-columns: 1fr;
  }

  .docs-sidebar {
    position: static;
    max-height: none;
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid var(--docs-border);
  }

  .docs-overview-grid {
    grid-template-columns: 1fr;
  }

  .docs-rail {
    position: static;
  }

  .docs-pager {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .docs-frame {
    padding: 0 16px 48px;
  }

  .docs-topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .docs-topbar-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .docs-top-links {
    flex-wrap: wrap;
    gap: 12px;
  }
}
`;
