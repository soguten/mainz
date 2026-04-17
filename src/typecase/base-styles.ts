export const TYPECASE_BASE_STYLES = /*css*/ `
    .typecase-root,
    .typecase-root * {
        box-sizing: border-box;
    }

    .typecase-root {
        --tc-root-color-text: var(--tc-color-text);
        --tc-root-color-text-muted: var(--tc-color-text-muted);
        --tc-root-color-link: var(--tc-color-link);
        --tc-root-color-link-hover: var(--tc-color-link-hover);
        --tc-root-color-surface: var(--tc-color-surface);
        --tc-root-color-surface-subtle: var(--tc-color-surface-subtle);
        --tc-root-color-border: var(--tc-color-border);
        --tc-root-button-primary-bg: var(--tc-button-primary-bg);
        --tc-root-button-primary-text: var(--tc-button-primary-text);
        --tc-root-button-ghost-text: var(--tc-button-ghost-text);
        --tc-root-button-ghost-bg-hover: var(--tc-button-ghost-bg-hover);
        color: var(--tc-color-text);
        font-family: var(--tc-font-family);
        font-size: var(--tc-font-size-md);
        line-height: var(--tc-line-height-md);
        background: var(--tc-root-bg, transparent);
    }

    .typecase-root a {
        color: var(--tc-color-link);
        text-decoration: none;
    }

    .typecase-root a:hover {
        text-decoration: underline;
    }

    .typecase-root :where(button, input, textarea, select) {
        font: inherit;
    }

    .typecase-root .tc-text {
        color: var(--tc-color-text);
        margin: 0;
    }

    .typecase-root .tc-text[data-tone="muted"] {
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-text[data-weight="medium"] {
        font-weight: 500;
    }

    .typecase-root .tc-text[data-weight="semibold"] {
        font-weight: 600;
    }

    .typecase-root .tc-label,
    .typecase-root .tc-field-label {
        display: inline-flex;
        align-items: center;
        gap: var(--tc-space-1);
        width: fit-content;
        color: var(--tc-color-text);
        font-size: var(--tc-font-size-sm);
        font-weight: 650;
        line-height: 1.35;
    }

    .typecase-root .tc-label[data-required="true"]::after,
    .typecase-root .tc-field-label[data-required="true"]::after {
        content: "*";
        color: var(--tc-input-border-invalid);
        font-weight: 700;
    }

    .typecase-root .tc-title {
        margin: 0;
        color: var(--tc-title-color, var(--tc-color-text));
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-weight: var(--tc-title-weight, 600);
        letter-spacing: var(--tc-title-letter-spacing, -0.03em);
        line-height: var(--tc-title-line-height, 1.04);
        text-wrap: balance;
    }

    .typecase-root .tc-title[data-size="sm"] {
        font-size: var(--tc-title-size-sm);
    }

    .typecase-root .tc-title[data-size="md"] {
        font-size: var(--tc-title-size-md);
    }

    .typecase-root .tc-title[data-size="lg"] {
        font-size: var(--tc-title-size-lg);
    }

    .typecase-root .tc-title[data-size="xl"] {
        font-size: var(--tc-title-size-xl);
    }

    .typecase-root .tc-title[data-size="hero"] {
        font-size: var(--tc-title-size-hero);
    }

    .typecase-root .tc-anchor {
        display: inline-flex;
        align-items: center;
        gap: var(--tc-space-2);
        color: var(--tc-color-link);
        font-weight: 500;
        text-decoration: none;
        transition: color 120ms ease;
    }

    .typecase-root .tc-anchor:hover {
        color: var(--tc-color-link-hover, var(--tc-color-link));
        text-decoration: none;
    }

    .typecase-root .tc-anchor[data-tone="muted"] {
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-divider {
        width: 100%;
        margin: 0;
        border: 0;
        border-top: 1px solid var(--tc-divider-color, var(--tc-color-border));
    }

    .typecase-root .tc-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--tc-space-2);
        min-height: var(--tc-control-height-md);
        padding: 0 var(--tc-space-4);
        border: 1px solid transparent;
        border-radius: var(--tc-radius-md);
        background: var(--tc-button-primary-bg);
        color: var(--tc-button-primary-text);
        cursor: pointer;
        font-weight: 600;
        line-height: 1;
        text-decoration: none;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease,
            box-shadow 120ms ease, transform 120ms ease;
    }

    .typecase-root .tc-button:hover {
        background: var(--tc-button-primary-bg-hover);
    }

    .typecase-root .tc-button:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-button:disabled {
        opacity: 0.58;
        cursor: not-allowed;
    }

    .typecase-root .tc-button[data-size="sm"] {
        min-height: var(--tc-control-height-sm);
        padding: 0 var(--tc-space-3);
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-button[data-size="lg"] {
        min-height: var(--tc-control-height-lg);
        padding: 0 var(--tc-space-5);
        font-size: var(--tc-font-size-lg);
    }

    .typecase-root .tc-theme-switch {
        display: inline-flex;
    }

    .typecase-root .tc-theme-switch-trigger {
        gap: 0.375rem;
        min-width: 2.375rem;
        padding: 0 0.625rem;
        color: currentColor;
    }

    .typecase-root .tc-theme-switch-trigger-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
    }

    .typecase-root .tc-dropdown {
        position: relative;
        display: inline-flex;
    }

    .typecase-root .tc-dropdown-trigger {
        display: inline-flex;
    }

    .typecase-root .tc-dropdown-menu {
        --tc-dropdown-menu-bg: var(--tc-root-color-surface);
        --tc-dropdown-menu-border: var(--tc-root-color-border);
        --tc-dropdown-menu-text: var(--tc-root-color-text);
        --tc-dropdown-menu-hover-bg: var(--tc-root-color-surface-subtle);
        --tc-dropdown-menu-active-bg: var(--tc-root-button-primary-bg);
        --tc-dropdown-menu-active-text: var(--tc-root-button-primary-text);
        position: absolute;
        top: calc(100% + 0.5rem);
        z-index: var(--tc-dropdown-menu-z-index, 10);
        display: grid;
        gap: 0.25rem;
        min-width: max(12rem, var(--tc-dropdown-menu-min-width, 12rem));
        max-height: var(--tc-dropdown-menu-max-height, none);
        overflow-y: auto;
        padding: 0.375rem;
        border: 1px solid var(--tc-dropdown-menu-border);
        border-radius: calc(var(--tc-radius-md) + 0.125rem);
        background: var(--tc-dropdown-menu-bg);
        color: var(--tc-dropdown-menu-text);
        box-shadow: var(--tc-shadow-sm);
    }

    .typecase-root .tc-dropdown[data-align="start"] > .tc-dropdown-menu,
    .typecase-root .tc-dropdown[data-align="start"] > .tc-dropdown-menu-content {
        left: 0;
    }

    .typecase-root .tc-dropdown[data-align="end"] > .tc-dropdown-menu,
    .typecase-root .tc-dropdown[data-align="end"] > .tc-dropdown-menu-content {
        right: 0;
    }

    .typecase-root .tc-dropdown[data-open="false"] > .tc-dropdown-menu,
    .typecase-root .tc-dropdown[data-open="false"] > .tc-dropdown-menu-content {
        display: none;
    }

    .typecase-root .tc-dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        min-height: var(--tc-control-height-sm);
        padding: 0.625rem 0.75rem;
        border: 0;
        border-radius: calc(var(--tc-radius-md) - 0.125rem);
        background: transparent;
        color: var(--tc-dropdown-menu-text);
        cursor: pointer;
        font: inherit;
        text-align: left;
        transition: background-color 120ms ease, color 120ms ease;
    }

    .typecase-root .tc-dropdown-menu-item-content {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
    }

    .typecase-root .tc-dropdown-menu-item-trailing {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        margin-left: auto;
    }

    .typecase-root .tc-dropdown-menu-item-shortcut {
        color: currentColor;
        --tc-kbd-bg: color-mix(in srgb, currentColor 12%, transparent);
        --tc-kbd-border: color-mix(in srgb, currentColor 24%, transparent);
        --tc-kbd-text: currentColor;
    }

    .typecase-root .tc-dropdown-item:hover {
        background: var(--tc-dropdown-menu-hover-bg);
    }

    .typecase-root .tc-dropdown-item[data-active="true"] {
        background: var(--tc-dropdown-menu-active-bg);
        color: var(--tc-dropdown-menu-active-text);
        font-weight: 600;
    }

    .typecase-root .tc-dropdown-menu-portal {
        position: fixed;
        z-index: var(--tc-dropdown-menu-z-index, 40);
    }

    .typecase-root .tc-dropdown-menu-portal > .tc-dropdown-menu,
    .typecase-root .tc-dropdown-menu-portal > .tc-dropdown-menu-content {
        position: static;
    }

    .typecase-root .tc-popover {
        position: relative;
        display: inline-flex;
    }

    .typecase-root .tc-popover-anchor,
    .typecase-root .tc-popover-trigger-anchor,
    .typecase-root .tc-popover-trigger-anchor-slot {
        display: inline-flex;
    }

    .typecase-root .tc-popover-content {
        --tc-popover-bg: var(--tc-root-color-surface);
        --tc-popover-border: var(--tc-root-color-border);
        --tc-popover-text: var(--tc-root-color-text);
        position: absolute;
        z-index: var(--tc-popover-z-index, 30);
        width: max-content;
        max-width: min(var(--tc-popover-max-width, 20rem), calc(100vw - 2rem));
        padding: var(--tc-space-4);
        border: 1px solid var(--tc-popover-border);
        border-radius: var(--tc-radius-md);
        background: var(--tc-popover-bg);
        color: var(--tc-popover-text);
        box-shadow: var(--tc-shadow-sm);
    }

    .typecase-root .tc-popover[data-open="false"] > .tc-popover-content {
        display: none;
    }

    .typecase-root .tc-popover[data-placement="bottom"] > .tc-popover-content {
        top: calc(100% + 0.5rem);
    }

    .typecase-root .tc-popover[data-placement="top"] > .tc-popover-content {
        bottom: calc(100% + 0.5rem);
    }

    .typecase-root .tc-popover[data-placement="left"] > .tc-popover-content {
        right: calc(100% + 0.5rem);
    }

    .typecase-root .tc-popover[data-placement="right"] > .tc-popover-content {
        left: calc(100% + 0.5rem);
    }

    .typecase-root .tc-popover[data-placement="bottom"][data-align="start"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="top"][data-align="start"] > .tc-popover-content {
        left: 0;
    }

    .typecase-root .tc-popover[data-placement="bottom"][data-align="end"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="top"][data-align="end"] > .tc-popover-content {
        right: 0;
    }

    .typecase-root .tc-popover[data-placement="bottom"][data-align="center"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="top"][data-align="center"] > .tc-popover-content {
        left: 50%;
        transform: translateX(-50%);
    }

    .typecase-root .tc-popover[data-placement="left"][data-align="start"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="right"][data-align="start"] > .tc-popover-content {
        top: 0;
    }

    .typecase-root .tc-popover[data-placement="left"][data-align="end"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="right"][data-align="end"] > .tc-popover-content {
        bottom: 0;
    }

    .typecase-root .tc-popover[data-placement="left"][data-align="center"] > .tc-popover-content,
    .typecase-root .tc-popover[data-placement="right"][data-align="center"] > .tc-popover-content {
        top: 50%;
        transform: translateY(-50%);
    }

    .typecase-root .tc-popover-trigger-portal {
        position: fixed;
        z-index: var(--tc-popover-z-index, 45);
    }

    .typecase-root .tc-popover-trigger-portal > .tc-popover-content {
        position: static;
    }

    .typecase-root .tc-tooltip-root,
    .typecase-root .tc-tooltip-anchor {
        display: inline-flex;
    }

    .typecase-root .tc-tooltip-portal {
        position: fixed;
        z-index: var(--tc-tooltip-z-index, 46);
        pointer-events: none;
    }

    .typecase-root .tc-tooltip-content.tc-popover-content {
        --tc-popover-bg: var(--tc-tooltip-bg, var(--tc-root-color-text));
        --tc-popover-border: var(--tc-tooltip-border, transparent);
        --tc-popover-text: var(--tc-tooltip-text, var(--tc-root-color-surface));
        max-width: min(var(--tc-popover-max-width, 18rem), calc(100vw - 2rem));
        padding: 0.45rem 0.625rem;
        border-radius: calc(var(--tc-radius-md) - 0.125rem);
        font-size: var(--tc-font-size-sm);
        font-weight: 500;
        line-height: 1.35;
        box-shadow: var(--tc-tooltip-shadow, var(--tc-shadow-sm));
    }

    .typecase-root .tc-dialog {
        position: fixed;
        inset: 0;
        z-index: var(--tc-dialog-z-index, 55);
        display: grid;
        place-items: center;
        padding: var(--tc-dialog-padding, var(--tc-space-4));
    }

    .typecase-root .tc-dialog[data-open="false"] {
        display: none;
    }

    .typecase-root .tc-dialog-backdrop {
        position: fixed;
        inset: 0;
        border: 0;
        padding: 0;
        background: var(--tc-dialog-backdrop, rgba(15, 23, 42, 0.42));
    }

    .typecase-root .tc-dialog-panel {
        position: relative;
        z-index: 1;
        display: grid;
        width: min(var(--tc-dialog-width, 34rem), 100%);
        max-height: min(var(--tc-dialog-max-height, calc(100vh - 2rem)), 100%);
        overflow: auto;
        border: 1px solid var(--tc-dialog-border, var(--tc-root-color-border));
        border-radius: var(--tc-dialog-radius, var(--tc-radius-lg));
        background: var(--tc-dialog-bg, var(--tc-root-color-surface));
        color: var(--tc-dialog-text, var(--tc-root-color-text));
        box-shadow: var(--tc-dialog-shadow, 0 1.25rem 4rem rgba(15, 23, 42, 0.22));
    }

    .typecase-root .tc-dialog-panel:focus {
        outline: none;
    }

    .typecase-root .tc-dialog-header,
    .typecase-root .tc-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tc-space-3);
        padding: var(--tc-space-4);
    }

    .typecase-root .tc-dialog-header {
        border-bottom: 1px solid var(--tc-dialog-border, var(--tc-root-color-border));
    }

    .typecase-root .tc-dialog-footer {
        border-top: 1px solid var(--tc-dialog-border, var(--tc-root-color-border));
        justify-content: flex-end;
    }

    .typecase-root .tc-dialog-title {
        margin: 0;
        color: var(--tc-dialog-text, var(--tc-root-color-text));
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-sm);
        font-weight: var(--tc-title-weight, 600);
        line-height: 1.2;
    }

    .typecase-root .tc-dialog-body {
        display: grid;
        gap: var(--tc-space-4);
        padding: var(--tc-space-4);
    }

    .typecase-root .tc-modal {
        display: inline-flex;
    }

    .typecase-root .tc-modal-trigger {
        display: inline-flex;
    }

    .typecase-root .tc-modal-portal .tc-dialog {
        z-index: var(--tc-modal-z-index, 55);
    }

    .typecase-root .tc-drawer {
        display: inline-flex;
    }


    .typecase-root .tc-drawer-trigger {
        display: inline-flex;
    }

    .typecase-root .tc-drawer-portal .tc-offcanvas-backdrop {
        z-index: var(--tc-drawer-backdrop-z-index, 50);
    }

    .typecase-root .tc-drawer-portal .tc-offcanvas {
        z-index: var(--tc-drawer-z-index, 51);
    }

    .typecase-root .tc-command-palette-search {
        display: inline-flex;
    }

    .typecase-root .tc-command-palette-search-trigger {
        min-width: min(16rem, 34vw);
        justify-content: space-between;
        gap: 0.75rem;
        color: currentColor;
    }

    .typecase-root .tc-button.tc-command-palette-search-trigger[data-affordance="prominent"] {
        background: var(--tc-button-ghost-bg-hover);
    }

    .typecase-root .tc-button.tc-command-palette-search-trigger[data-affordance="prominent"]:hover {
        background: color-mix(in srgb, var(--tc-button-ghost-bg-hover) 88%, currentColor);
    }

    .typecase-root .tc-command-palette-search-trigger-main {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        flex: 1 1 auto;
    }

    .typecase-root .tc-command-palette-search-trigger-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .typecase-root .tc-command-palette-search-trigger-shortcut {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
    }

    .typecase-root .tc-command-palette-shortcut {
        display: inline-flex;
        align-items: center;
        color: currentColor;
        --tc-kbd-bg: color-mix(in srgb, currentColor 12%, transparent);
        --tc-kbd-border: color-mix(in srgb, currentColor 24%, transparent);
        --tc-kbd-text: currentColor;
    }

    .typecase-root .tc-command-palette-backdrop {
        position: fixed;
        inset: 0;
        z-index: var(--tc-command-palette-z-index, 60);
        display: grid;
        place-items: start center;
        padding: var(--tc-command-palette-offset, 6.5rem) var(--tc-space-4) var(--tc-space-4);
        background: var(--tc-command-palette-backdrop, rgba(15, 23, 42, 0.32));
    }

    .typecase-root .tc-command-palette-panel {
        width: min(var(--tc-command-palette-width, 42rem), 100%);
        padding: var(--tc-space-3);
        border: 1px solid var(--tc-root-color-border);
        border-radius: var(--tc-command-palette-radius, 1rem);
        background: var(--tc-root-color-surface);
        color: var(--tc-root-color-text);
        box-shadow: var(--tc-command-palette-shadow, 0 1.25rem 4rem rgba(15, 23, 42, 0.22));
    }

    .typecase-root .tc-command-palette-input-shell {
        position: relative;
    }

    .typecase-root .tc-command-palette-input-icon {
        position: absolute;
        left: var(--tc-space-4);
        top: 50%;
        z-index: 1;
        color: var(--tc-root-color-text-muted);
        pointer-events: none;
        transform: translateY(-50%);
    }

    .typecase-root .tc-input.tc-command-palette-input {
        padding-left: 3.25rem;
    }

    .typecase-root .tc-command-palette-results {
        display: grid;
        gap: 0.375rem;
        max-height: min(28rem, calc(100vh - 13rem));
        overflow-y: auto;
    }

    .typecase-root .tc-anchor.tc-command-palette-item {
        display: grid;
        grid-template-columns: 1fr;
        align-items: stretch;
        justify-content: stretch;
        gap: 0.25rem;
        padding: 0.75rem 0.875rem;
        border-radius: var(--tc-radius-md);
        color: var(--tc-root-color-text);
        text-decoration: none;
    }

    .typecase-root .tc-anchor.tc-command-palette-item:hover,
    .typecase-root .tc-anchor.tc-command-palette-item[data-active="true"] {
        color: var(--tc-root-color-text);
        background: var(--tc-root-color-surface-subtle);
        text-decoration: none;
    }

    .typecase-root .tc-command-palette-item-title {
        display: block;
        color: var(--tc-root-color-text);
        font-weight: 650;
    }

    .typecase-root .tc-command-palette-item-summary {
        display: block;
        color: var(--tc-root-color-text-muted);
        font-size: 0.9rem;
        line-height: 1.45;
    }

    .typecase-root .tc-command-palette-item-section {
        display: block;
        color: var(--tc-root-color-text-muted);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .typecase-root .tc-button[data-variant="secondary"] {
        background: var(--tc-button-secondary-bg);
        border-color: var(--tc-button-secondary-border);
        color: var(--tc-button-secondary-text);
    }

    .typecase-root .tc-button[data-variant="secondary"]:hover {
        background: var(--tc-button-secondary-bg-hover);
    }

    .typecase-root .tc-button[data-variant="ghost"] {
        background: transparent;
        color: var(--tc-button-ghost-text);
    }

    .typecase-root .tc-button[data-variant="ghost"]:hover {
        background: var(--tc-button-ghost-bg-hover);
    }

    .typecase-root .tc-button[data-variant="danger"] {
        background: var(--tc-button-danger-bg);
        color: var(--tc-button-danger-text);
    }

    .typecase-root .tc-button[data-variant="danger"]:hover {
        background: var(--tc-button-danger-bg-hover);
    }

    .typecase-root .tc-badge {
        --tc-badge-accent: var(--tc-color-text-muted);
        --tc-badge-solid-text: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        width: fit-content;
        min-height: 1.375rem;
        padding: 0.125rem 0.5rem;
        border: 1px solid color-mix(in srgb, var(--tc-badge-accent) 28%, transparent);
        border-radius: var(--tc-badge-radius, 999px);
        background: color-mix(in srgb, var(--tc-badge-accent) 11%, transparent);
        color: var(--tc-badge-accent);
        font-size: var(--tc-font-size-sm);
        font-weight: 650;
        line-height: 1;
        letter-spacing: 0.01em;
        white-space: nowrap;
    }

    .typecase-root .tc-badge[data-size="sm"] {
        min-height: 1.125rem;
        padding: 0.0625rem 0.375rem;
        font-size: 0.6875rem;
    }

    .typecase-root .tc-badge[data-tone="primary"] {
        --tc-badge-accent: var(--tc-button-primary-bg);
        --tc-badge-solid-text: var(--tc-button-primary-text);
    }

    .typecase-root .tc-badge[data-tone="info"] {
        --tc-badge-accent: var(--tc-badge-info, #2563eb);
    }

    .typecase-root .tc-badge[data-tone="success"] {
        --tc-badge-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-badge[data-tone="warning"] {
        --tc-badge-accent: var(--tc-badge-warning, #b45309);
    }

    .typecase-root .tc-badge[data-tone="danger"] {
        --tc-badge-accent: var(--tc-button-danger-bg);
        --tc-badge-solid-text: var(--tc-button-danger-text);
    }

    .typecase-root .tc-badge[data-variant="solid"] {
        border-color: transparent;
        background: var(--tc-badge-accent);
        color: var(--tc-badge-solid-text);
    }

    .typecase-root .tc-badge[data-variant="outline"] {
        background: transparent;
    }

    .typecase-root .tc-status-dot {
        --tc-status-dot-accent: var(--tc-color-text-muted);
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
        width: var(--tc-status-dot-size, 0.625rem);
        height: var(--tc-status-dot-size, 0.625rem);
        border-radius: 999px;
        background: var(--tc-status-dot-accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc-status-dot-accent) 18%, transparent);
        vertical-align: middle;
    }

    .typecase-root .tc-status-dot[data-size="sm"] {
        --tc-status-dot-size: 0.5rem;
    }

    .typecase-root .tc-status-dot[data-tone="info"] {
        --tc-status-dot-accent: var(--tc-badge-info, #2563eb);
    }

    .typecase-root .tc-status-dot[data-tone="success"] {
        --tc-status-dot-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-status-dot[data-tone="warning"] {
        --tc-status-dot-accent: var(--tc-badge-warning, #b45309);
    }

    .typecase-root .tc-status-dot[data-tone="danger"] {
        --tc-status-dot-accent: var(--tc-button-danger-bg);
    }

    .typecase-root .tc-status-dot[data-pulse="true"]::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: var(--tc-status-dot-accent);
        opacity: 0.34;
        animation: tc-status-dot-pulse 1.4s ease-out infinite;
    }

    .typecase-root .tc-kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.5em;
        min-height: 1.45em;
        padding: 0.125rem 0.375rem;
        border: 1px solid var(--tc-kbd-border, var(--tc-color-border));
        border-radius: calc(var(--tc-radius-sm) + 0.125rem);
        background: var(--tc-kbd-bg, var(--tc-color-surface-subtle));
        color: var(--tc-kbd-text, var(--tc-color-text));
        box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--tc-color-text) 18%, transparent);
        font-family: var(--tc-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
        font-size: 0.82em;
        font-weight: 650;
        line-height: 1;
        white-space: nowrap;
    }

    .typecase-root .tc-kbd[data-size="sm"] {
        min-height: 1.3em;
        padding: 0.0625rem 0.3125rem;
        font-size: 0.75em;
    }

    .typecase-root .tc-shortcut {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-wrap: wrap;
    }

    .typecase-root .tc-shortcut[data-size="sm"] {
        gap: 0.1875rem;
    }

    .typecase-root .tc-spinner {
        display: inline-block;
        width: var(--tc-spinner-size, 1.25rem);
        height: var(--tc-spinner-size, 1.25rem);
        border: var(--tc-spinner-stroke, 2px) solid
            color-mix(in srgb, currentColor 24%, transparent);
        border-top-color: currentColor;
        border-radius: 999px;
        color: var(--tc-spinner-color, var(--tc-color-text-muted));
        vertical-align: text-bottom;
        animation: tc-spinner-rotate 720ms linear infinite;
    }

    .typecase-root .tc-spinner[data-size="sm"] {
        --tc-spinner-size: 1rem;
        --tc-spinner-stroke: 2px;
    }

    .typecase-root .tc-spinner[data-size="lg"] {
        --tc-spinner-size: 1.75rem;
        --tc-spinner-stroke: 3px;
    }

    .typecase-root .tc-skeleton {
        display: block;
        width: var(--tc-skeleton-width, 100%);
        height: var(--tc-skeleton-height, 1rem);
        border-radius: var(--tc-skeleton-radius, var(--tc-radius-sm));
        background:
            linear-gradient(
                90deg,
                transparent,
                color-mix(in srgb, var(--tc-color-surface) 72%, transparent),
                transparent
            ),
            var(--tc-skeleton-bg, var(--tc-color-surface-subtle));
        background-size: 200% 100%, 100% 100%;
        color: transparent;
        overflow: hidden;
    }

    .typecase-root .tc-skeleton[data-animated="true"] {
        animation: tc-skeleton-shimmer 1.4s ease-in-out infinite;
    }

    .typecase-root .tc-skeleton[data-animated="false"] {
        background-image: none;
    }

    .typecase-root .tc-skeleton[data-variant="text"] {
        width: var(--tc-skeleton-width, 12rem);
        height: var(--tc-skeleton-height, 0.875rem);
        border-radius: 999px;
    }

    .typecase-root .tc-skeleton[data-variant="block"] {
        min-height: var(--tc-skeleton-height, 4rem);
    }

    .typecase-root .tc-skeleton[data-variant="circle"] {
        width: var(--tc-skeleton-width, 2.5rem);
        height: var(--tc-skeleton-height, var(--tc-skeleton-width, 2.5rem));
        border-radius: 999px;
    }

    .typecase-root .tc-progress {
        --tc-progress-accent: var(--tc-button-primary-bg);
        position: relative;
        display: block;
        width: 100%;
        height: var(--tc-progress-height, 0.625rem);
        overflow: hidden;
        border-radius: var(--tc-progress-radius, 999px);
        background: var(--tc-progress-bg, var(--tc-color-surface-subtle));
    }

    .typecase-root .tc-progress[data-size="sm"] {
        --tc-progress-height: 0.375rem;
    }

    .typecase-root .tc-progress[data-tone="success"] {
        --tc-progress-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-progress[data-tone="warning"] {
        --tc-progress-accent: var(--tc-badge-warning, #b45309);
    }

    .typecase-root .tc-progress[data-tone="danger"] {
        --tc-progress-accent: var(--tc-button-danger-bg);
    }

    .typecase-root .tc-progress-bar {
        display: block;
        width: var(--tc-progress-value, 0%);
        height: 100%;
        border-radius: inherit;
        background: var(--tc-progress-accent);
        transition: width 180ms ease;
    }

    .typecase-root .tc-progress[data-indeterminate="true"] .tc-progress-bar {
        position: absolute;
        width: 42%;
        animation: tc-progress-indeterminate 1.2s ease-in-out infinite;
    }

    .typecase-root .tc-image {
        display: block;
        width: var(--tc-image-width, 100%);
        height: var(--tc-image-height, auto);
        aspect-ratio: var(--tc-image-aspect-ratio, auto);
        object-fit: var(--tc-image-fit, cover);
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-image[data-fit="contain"] {
        --tc-image-fit: contain;
    }

    .typecase-root .tc-image[data-fit="fill"] {
        --tc-image-fit: fill;
    }

    .typecase-root .tc-image[data-fit="none"] {
        --tc-image-fit: none;
    }

    .typecase-root .tc-image[data-fit="scale-down"] {
        --tc-image-fit: scale-down;
    }

    .typecase-root .tc-image[data-radius="none"] {
        border-radius: 0;
    }

    .typecase-root .tc-image[data-radius="sm"] {
        border-radius: var(--tc-radius-sm);
    }

    .typecase-root .tc-image[data-radius="md"] {
        border-radius: var(--tc-radius-md);
    }

    .typecase-root .tc-image[data-radius="lg"] {
        border-radius: var(--tc-radius-lg);
    }

    .typecase-root .tc-image[data-radius="full"] {
        border-radius: 999px;
    }

    .typecase-root .tc-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: var(--tc-avatar-size, 2.25rem);
        height: var(--tc-avatar-size, 2.25rem);
        overflow: hidden;
        border: 1px solid var(--tc-avatar-border, var(--tc-color-border));
        border-radius: 999px;
        background: var(--tc-avatar-bg, var(--tc-color-surface-subtle));
        color: var(--tc-avatar-text, var(--tc-color-text));
        font-size: var(--tc-avatar-font-size, var(--tc-font-size-sm));
        font-weight: 700;
        line-height: 1;
        text-transform: uppercase;
    }

    .typecase-root .tc-avatar[data-size="sm"] {
        --tc-avatar-size: 1.875rem;
        --tc-avatar-font-size: 0.75rem;
    }

    .typecase-root .tc-avatar[data-size="lg"] {
        --tc-avatar-size: 3rem;
        --tc-avatar-font-size: var(--tc-font-size-md);
    }

    .typecase-root .tc-avatar-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .typecase-root .tc-avatar-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transform: translateY(var(--tc-avatar-fallback-offset-y, -0.03em));
    }

    .typecase-root .tc-input,
    .typecase-root .tc-select,
    .typecase-root .tc-textarea {
        width: 100%;
        min-height: var(--tc-control-height-md);
        padding: 0 var(--tc-space-4);
        border: 1px solid var(--tc-input-border);
        border-radius: var(--tc-radius-md);
        background: var(--tc-input-bg);
        color: var(--tc-color-text);
        transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
    }

    .typecase-root .tc-textarea {
        min-height: 7rem;
        padding-block: 0.75rem;
        line-height: 1.5;
        resize: vertical;
    }

    .typecase-root .tc-textarea[data-resize="none"] {
        resize: none;
    }

    .typecase-root .tc-textarea[data-resize="horizontal"] {
        resize: horizontal;
    }

    .typecase-root .tc-textarea[data-resize="both"] {
        resize: both;
    }

    .typecase-root .tc-select {
        padding-right: 2.75rem;
        appearance: none;
        background:
            linear-gradient(45deg, transparent 50%, var(--tc-color-text-muted) 50%)
                calc(100% - 1.1rem) 50% / 0.35rem 0.35rem no-repeat,
            linear-gradient(135deg, var(--tc-color-text-muted) 50%, transparent 50%)
                calc(100% - 0.875rem) 50% / 0.35rem 0.35rem no-repeat,
            var(--tc-input-bg);
    }

    .typecase-root .tc-input::placeholder,
    .typecase-root .tc-textarea::placeholder {
        color: var(--tc-color-text-subtle);
    }

    .typecase-root .tc-input:focus,
    .typecase-root .tc-select:focus,
    .typecase-root .tc-textarea:focus {
        outline: none;
        border-color: var(--tc-input-border-focus);
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-input:disabled,
    .typecase-root .tc-input:read-only,
    .typecase-root .tc-select:disabled,
    .typecase-root .tc-textarea:disabled,
    .typecase-root .tc-textarea:read-only {
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-input[data-invalid="true"],
    .typecase-root .tc-input[aria-invalid="true"],
    .typecase-root .tc-select[data-invalid="true"],
    .typecase-root .tc-select[aria-invalid="true"],
    .typecase-root .tc-textarea[data-invalid="true"],
    .typecase-root .tc-textarea[aria-invalid="true"] {
        border-color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-input[data-size="sm"],
    .typecase-root .tc-select[data-size="sm"] {
        min-height: var(--tc-control-height-sm);
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-input[data-size="lg"],
    .typecase-root .tc-select[data-size="lg"] {
        min-height: var(--tc-control-height-lg);
        font-size: var(--tc-font-size-lg);
    }

    .typecase-root .tc-textarea[data-size="sm"] {
        min-height: 5rem;
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-textarea[data-size="lg"] {
        min-height: 9rem;
        font-size: var(--tc-font-size-lg);
    }

    .typecase-root .tc-choice {
        display: inline-grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
        gap: var(--tc-space-2);
        width: fit-content;
        color: var(--tc-color-text);
        cursor: pointer;
        font-size: var(--tc-font-size-md);
        line-height: 1.45;
    }

    .typecase-root .tc-choice-input {
        width: 1.125rem;
        height: 1.125rem;
        margin: 0.15rem 0 0;
        accent-color: var(--tc-button-primary-bg);
        cursor: inherit;
    }

    .typecase-root .tc-choice[data-size="sm"] {
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-choice[data-size="sm"] .tc-choice-input {
        width: 1rem;
        height: 1rem;
    }

    .typecase-root .tc-choice:has(.tc-choice-input:disabled) {
        opacity: 0.58;
        cursor: not-allowed;
    }

    .typecase-root .tc-choice-input:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-choice[data-invalid="true"] .tc-choice-label {
        color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-switch {
        --tc-switch-track-bg: color-mix(in srgb, var(--tc-color-text-muted) 24%, transparent);
        --tc-switch-track-bg-checked: var(--tc-button-primary-bg);
        --tc-switch-track-border: color-mix(in srgb, var(--tc-color-text-muted) 28%, transparent);
        --tc-switch-track-border-checked: var(--tc-button-primary-bg);
        --tc-switch-thumb-bg: var(--tc-color-surface);
        --tc-switch-thumb-size: 1rem;
        --tc-switch-track-width: 2.25rem;
        --tc-switch-track-height: 1.375rem;
        display: inline-grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.75rem;
        width: fit-content;
        color: var(--tc-color-text);
        cursor: pointer;
        font-size: var(--tc-font-size-md);
        line-height: 1.45;
    }

    .typecase-root .tc-switch[data-size="sm"] {
        --tc-switch-thumb-size: 0.875rem;
        --tc-switch-track-width: 2rem;
        --tc-switch-track-height: 1.25rem;
        gap: 0.625rem;
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-switch-input {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
    }

    .typecase-root .tc-switch-control {
        position: relative;
        display: inline-flex;
        align-items: center;
        width: var(--tc-switch-track-width);
        height: var(--tc-switch-track-height);
        padding: 0.125rem;
        border: 1px solid var(--tc-switch-track-border);
        border-radius: 999px;
        background: var(--tc-switch-track-bg);
        transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }

    .typecase-root .tc-switch-thumb {
        display: block;
        width: var(--tc-switch-thumb-size);
        height: var(--tc-switch-thumb-size);
        border-radius: 999px;
        background: var(--tc-switch-thumb-bg);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
        transition: transform 120ms ease;
    }

    .typecase-root .tc-switch-input:checked + .tc-switch-control {
        border-color: var(--tc-switch-track-border-checked);
        background: var(--tc-switch-track-bg-checked);
    }

    .typecase-root .tc-switch-input:checked + .tc-switch-control .tc-switch-thumb {
        transform: translateX(calc(var(--tc-switch-track-width) - var(--tc-switch-thumb-size) - 0.5rem));
    }

    .typecase-root .tc-switch-input:focus-visible + .tc-switch-control {
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-switch:has(.tc-switch-input:disabled) {
        opacity: 0.58;
        cursor: not-allowed;
    }

    .typecase-root .tc-switch[data-invalid="true"] .tc-switch-control {
        border-color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-switch[data-invalid="true"] .tc-switch-label {
        color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-switch-label {
        min-width: 0;
    }

    .typecase-root .tc-field {
        display: grid;
        gap: var(--tc-field-gap, 0.5rem);
        width: 100%;
    }

    .typecase-root .tc-field[data-invalid="true"] .tc-field-label {
        color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-field-control {
        display: grid;
        gap: var(--tc-space-2);
    }

    .typecase-root .tc-field-hint,
    .typecase-root .tc-field-error,
    .typecase-root .tc-fieldset-hint,
    .typecase-root .tc-fieldset-error {
        margin: 0;
        font-size: var(--tc-font-size-sm);
        line-height: 1.45;
    }

    .typecase-root .tc-field-hint,
    .typecase-root .tc-fieldset-hint {
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-field-error,
    .typecase-root .tc-fieldset-error {
        color: var(--tc-input-border-invalid);
        font-weight: 600;
    }

    .typecase-root .tc-fieldset {
        display: grid;
        gap: var(--tc-fieldset-gap, 0.75rem);
        min-width: 0;
        margin: 0;
        padding: var(--tc-fieldset-padding, 0);
        border: 0;
    }

    .typecase-root .tc-fieldset[data-invalid="true"] .tc-fieldset-legend {
        color: var(--tc-input-border-invalid);
    }

    .typecase-root .tc-fieldset-legend {
        padding: 0;
        color: var(--tc-color-text);
        font-weight: 700;
        line-height: 1.35;
    }

    .typecase-root .tc-fieldset-body {
        display: grid;
        gap: var(--tc-fieldset-body-gap, 0.625rem);
    }

    .typecase-root .tc-card {
        display: grid;
        gap: var(--tc-space-4);
        padding: var(--tc-space-5);
        border: 1px solid var(--tc-card-border);
        border-radius: var(--tc-radius-lg);
        background: var(--tc-card-bg);
        box-shadow: var(--tc-shadow-sm);
    }

    .typecase-root .tc-card[data-variant="subtle"] {
        background: var(--tc-card-subtle-bg);
    }

    .typecase-root .tc-card-header,
    .typecase-root .tc-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tc-space-3);
        flex-wrap: wrap;
    }

    .typecase-root .tc-card-title {
        margin: 0;
        color: var(--tc-color-text);
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-md);
        font-weight: var(--tc-title-weight, 600);
        line-height: 1.1;
    }

    .typecase-root .tc-card-body {
        display: grid;
        gap: var(--tc-space-3);
    }

    .typecase-root .tc-link-box {
        position: relative;
        display: grid;
        gap: var(--tc-link-box-gap, var(--tc-space-3));
        padding: var(--tc-link-box-padding, var(--tc-space-5));
        border: 1px solid var(--tc-link-box-border, var(--tc-card-border));
        border-radius: var(--tc-link-box-radius, var(--tc-radius-lg));
        background: var(--tc-link-box-bg, var(--tc-card-bg));
        color: var(--tc-color-text);
        box-shadow: var(--tc-link-box-shadow, var(--tc-shadow-sm));
        transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease,
            transform 120ms ease;
    }

    .typecase-root .tc-link-box[data-variant="subtle"] {
        --tc-link-box-bg: var(--tc-card-subtle-bg);
    }

    .typecase-root .tc-link-box[data-variant="ghost"] {
        --tc-link-box-bg: transparent;
        --tc-link-box-border: transparent;
        --tc-link-box-shadow: none;
    }

    .typecase-root .tc-link-box:has(.tc-link-box-link:hover) {
        border-color: var(--tc-link-box-border-hover, var(--tc-color-link));
        box-shadow: var(--tc-shadow-sm);
        transform: translateY(-1px);
    }

    .typecase-root .tc-link-box-link {
        color: var(--tc-color-text);
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-sm);
        font-weight: var(--tc-title-weight, 600);
        line-height: 1.2;
        text-decoration: none;
    }

    .typecase-root .tc-link-box-link::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
    }

    .typecase-root .tc-link-box-link:hover {
        color: var(--tc-color-link-hover, var(--tc-color-link));
        text-decoration: none;
    }

    .typecase-root .tc-link-box-link:focus-visible {
        outline: none;
    }

    .typecase-root .tc-link-box:has(.tc-link-box-link:focus-visible) {
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-link-box :where(a, button, input, select, textarea):not(.tc-link-box-link) {
        position: relative;
        z-index: 1;
    }

    .typecase-root .tc-link-box-body {
        display: grid;
        gap: var(--tc-space-2);
        color: var(--tc-color-text-muted);
        line-height: 1.55;
    }

    .typecase-root .tc-link-box-body > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-link-box-meta {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        flex-wrap: wrap;
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.35;
    }

    .typecase-root .tc-description-list {
        display: grid;
        gap: var(--tc-description-list-gap, var(--tc-space-3));
        margin: 0;
    }

    .typecase-root .tc-description-list-item {
        display: grid;
        gap: var(--tc-description-list-item-gap, var(--tc-space-1));
    }

    .typecase-root .tc-description-list[data-layout="inline"] .tc-description-list-item {
        grid-template-columns: minmax(8rem, 0.45fr) minmax(0, 1fr);
        gap: var(--tc-space-4);
    }

    .typecase-root .tc-description-list[data-variant="bordered"] .tc-description-list-item {
        padding-block: var(--tc-space-3);
        border-bottom: 1px solid var(--tc-color-border);
    }

    .typecase-root .tc-description-list[data-variant="bordered"] .tc-description-list-item:first-child {
        border-top: 1px solid var(--tc-color-border);
    }

    .typecase-root .tc-description-list-term {
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        font-weight: 650;
        line-height: 1.35;
    }

    .typecase-root .tc-description-list-details {
        margin: 0;
        color: var(--tc-color-text);
        line-height: 1.55;
    }

    .typecase-root .tc-description-list-details > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-stat {
        display: grid;
        justify-items: var(--tc-stat-justify-items, start);
        gap: var(--tc-stat-gap, var(--tc-space-1));
        padding: var(--tc-stat-padding, 0);
        border-radius: var(--tc-stat-radius, var(--tc-radius-lg));
        color: var(--tc-color-text);
        text-align: var(--tc-stat-text-align, left);
    }

    .typecase-root .tc-stat[data-align="center"] {
        --tc-stat-justify-items: center;
        --tc-stat-text-align: center;
    }

    .typecase-root .tc-stat[data-align="end"] {
        --tc-stat-justify-items: end;
        --tc-stat-text-align: right;
    }

    .typecase-root .tc-stat[data-variant="subtle"] {
        --tc-stat-padding: var(--tc-space-4);
        border: 1px solid var(--tc-color-border);
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-stat-label,
    .typecase-root .tc-stat-help-text {
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.35;
    }

    .typecase-root .tc-stat-label {
        font-weight: 650;
    }

    .typecase-root .tc-stat-value {
        display: block;
        color: var(--tc-color-text);
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-lg);
        font-weight: var(--tc-title-weight, 600);
        letter-spacing: var(--tc-title-letter-spacing, -0.03em);
        line-height: 1;
    }

    .typecase-root .tc-steps {
        display: grid;
        gap: var(--tc-steps-gap, 0);
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .typecase-root .tc-steps[data-orientation="horizontal"] {
        grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    }

    .typecase-root .tc-step {
        --tc-step-accent: var(--tc-color-border);
        position: relative;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--tc-space-3);
        padding-bottom: var(--tc-step-gap, var(--tc-space-5));
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-step:last-child {
        padding-bottom: 0;
    }

    .typecase-root .tc-step::after {
        content: "";
        position: absolute;
        left: calc(var(--tc-step-indicator-size, 1.75rem) / 2);
        top: calc(var(--tc-step-indicator-size, 1.75rem) + 0.25rem);
        bottom: 0.25rem;
        width: 1px;
        background: var(--tc-color-border);
        transform: translateX(-50%);
    }

    .typecase-root .tc-step:last-child::after,
    .typecase-root .tc-steps[data-orientation="horizontal"] .tc-step::after {
        display: none;
    }

    .typecase-root .tc-step[data-status="complete"] {
        --tc-step-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-step[data-status="current"] {
        --tc-step-accent: var(--tc-button-primary-bg);
    }

    .typecase-root .tc-step-indicator {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--tc-step-indicator-size, 1.75rem);
        height: var(--tc-step-indicator-size, 1.75rem);
        border: 1px solid var(--tc-step-accent);
        border-radius: 999px;
        background: var(--tc-color-surface);
        color: var(--tc-step-accent);
        font-size: var(--tc-font-size-sm);
        font-weight: 700;
        line-height: 1;
    }

    .typecase-root .tc-step[data-status="complete"] .tc-step-indicator,
    .typecase-root .tc-step[data-status="current"] .tc-step-indicator {
        background: var(--tc-step-accent);
        color: var(--tc-button-primary-text);
    }

    .typecase-root .tc-step-content {
        display: grid;
        gap: var(--tc-space-1);
        padding-top: 0.125rem;
    }

    .typecase-root .tc-step-title {
        color: var(--tc-color-text);
        font-weight: 700;
        line-height: 1.35;
    }

    .typecase-root .tc-step-description {
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.45;
    }

    .typecase-root .tc-steps[data-orientation="horizontal"] .tc-step {
        grid-template-columns: minmax(0, 1fr);
        justify-items: start;
        padding-bottom: 0;
    }

    .typecase-root .tc-callout {
        --tc-callout-accent: var(--tc-color-text-muted);
        --tc-callout-bg: color-mix(in srgb, var(--tc-callout-accent) 9%, transparent);
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--tc-space-2) var(--tc-space-3);
        padding: var(--tc-callout-padding, var(--tc-space-4));
        border: 1px solid color-mix(in srgb, var(--tc-callout-accent) 26%, transparent);
        border-left-width: var(--tc-callout-accent-width, 0.25rem);
        border-radius: var(--tc-callout-radius, var(--tc-radius-md));
        background: var(--tc-callout-bg);
        color: var(--tc-color-text);
    }

    .typecase-root .tc-callout:has(> .tc-callout-icon) {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .typecase-root .tc-callout[data-variant="outline"] {
        --tc-callout-bg: transparent;
    }

    .typecase-root .tc-callout[data-tone="info"] {
        --tc-callout-accent: var(--tc-callout-info, #2563eb);
    }

    .typecase-root .tc-callout[data-tone="success"] {
        --tc-callout-accent: var(--tc-callout-success, #15803d);
    }

    .typecase-root .tc-callout[data-tone="warning"] {
        --tc-callout-accent: var(--tc-callout-warning, #b45309);
    }

    .typecase-root .tc-callout[data-tone="danger"] {
        --tc-callout-accent: var(--tc-button-danger-bg);
    }

    .typecase-root .tc-callout-icon {
        grid-row: 1 / span 3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        min-height: 1.5rem;
        color: var(--tc-callout-accent);
    }

    .typecase-root .tc-callout-title {
        display: block;
        margin: 0;
        color: var(--tc-color-text);
        font-weight: 700;
        line-height: 1.35;
    }

    .typecase-root .tc-callout-body {
        display: grid;
        gap: var(--tc-space-2);
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-callout-body > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-callout-actions {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        flex-wrap: wrap;
        padding-top: var(--tc-space-1);
    }

    .typecase-root .tc-alert {
        --tc-alert-accent: var(--tc-color-text-muted);
        --tc-alert-bg: color-mix(in srgb, var(--tc-alert-accent) 10%, transparent);
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--tc-space-2) var(--tc-space-3);
        padding: var(--tc-alert-padding, var(--tc-space-4));
        border: 1px solid color-mix(in srgb, var(--tc-alert-accent) 28%, transparent);
        border-radius: var(--tc-alert-radius, var(--tc-radius-md));
        background: var(--tc-alert-bg);
        color: var(--tc-color-text);
    }

    .typecase-root .tc-alert:has(> .tc-alert-icon) {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .typecase-root .tc-alert[data-variant="outline"] {
        --tc-alert-bg: transparent;
    }

    .typecase-root .tc-alert[data-tone="info"] {
        --tc-alert-accent: var(--tc-badge-info, #2563eb);
    }

    .typecase-root .tc-alert[data-tone="success"] {
        --tc-alert-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-alert[data-tone="warning"] {
        --tc-alert-accent: var(--tc-badge-warning, #b45309);
    }

    .typecase-root .tc-alert[data-tone="danger"] {
        --tc-alert-accent: var(--tc-button-danger-bg);
    }

    .typecase-root .tc-alert-icon {
        grid-row: 1 / span 3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        min-height: 1.25rem;
        color: var(--tc-alert-accent);
    }

    .typecase-root .tc-alert-title {
        display: block;
        margin: 0;
        color: var(--tc-color-text);
        font-weight: 700;
        line-height: 1.35;
    }

    .typecase-root .tc-alert-body {
        display: grid;
        gap: var(--tc-space-2);
        color: var(--tc-color-text-muted);
        line-height: 1.5;
    }

    .typecase-root .tc-alert-body > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-alert-actions {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        flex-wrap: wrap;
        padding-top: var(--tc-space-1);
    }

    .typecase-root .tc-toast {
        --tc-toast-accent: var(--tc-color-text-muted);
        --tc-toast-bg: color-mix(in srgb, var(--tc-toast-accent) 10%, var(--tc-color-surface));
        --tc-toast-border: color-mix(in srgb, var(--tc-toast-accent) 24%, transparent);
        --tc-toast-text: var(--tc-color-text);
        display: grid;
        gap: var(--tc-space-2);
        padding: var(--tc-space-4);
        border: 1px solid var(--tc-toast-border);
        border-radius: var(--tc-radius-md);
        background: var(--tc-toast-bg);
        color: var(--tc-toast-text);
        box-shadow: var(--tc-shadow-sm);
    }

    .typecase-root .tc-toast[data-tone="info"] {
        --tc-toast-accent: var(--tc-badge-info, #2563eb);
    }

    .typecase-root .tc-toast[data-tone="success"] {
        --tc-toast-accent: var(--tc-badge-success, #15803d);
    }

    .typecase-root .tc-toast[data-tone="warning"] {
        --tc-toast-accent: var(--tc-badge-warning, #b45309);
    }

    .typecase-root .tc-toast[data-tone="danger"] {
        --tc-toast-accent: var(--tc-button-danger-bg);
    }

    .typecase-root .tc-toast[data-variant="outline"] {
        --tc-toast-bg: transparent;
        --tc-toast-border: color-mix(in srgb, var(--tc-toast-accent) 32%, transparent);
        box-shadow: none;
    }

    .typecase-root .tc-toast[data-variant="solid"] {
        --tc-toast-bg: var(--tc-toast-accent);
        --tc-toast-border: var(--tc-toast-accent);
        --tc-toast-text: var(--tc-color-surface);
    }

    .typecase-root .tc-toast-title {
        display: block;
        margin: 0;
        color: inherit;
        font-weight: 700;
        line-height: 1.35;
    }

    .typecase-root .tc-toast-body {
        display: grid;
        gap: var(--tc-space-2);
        color: inherit;
    }

    .typecase-root .tc-toast-body > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-toast-actions {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        flex-wrap: wrap;
        padding-top: var(--tc-space-1);
    }

    .typecase-root .tc-accordion {
        display: grid;
        gap: var(--tc-space-3);
    }

    .typecase-root .tc-accordion-item {
        border: 1px solid var(--tc-color-border);
        border-radius: var(--tc-radius-md);
        background: var(--tc-color-surface);
        overflow: clip;
    }

    .typecase-root .tc-accordion-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tc-space-3);
        padding: 0.875rem 1rem;
        cursor: pointer;
        color: var(--tc-color-text);
        font-weight: 600;
        line-height: 1.4;
        list-style: none;
    }

    .typecase-root .tc-accordion-trigger::-webkit-details-marker {
        display: none;
    }

    .typecase-root .tc-accordion-trigger:hover {
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-accordion-trigger:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--tc-button-primary-bg) 22%, transparent);
    }

    .typecase-root .tc-accordion-trigger-label {
        min-width: 0;
    }

    .typecase-root .tc-accordion-trigger-icon {
        flex: 0 0 auto;
        color: var(--tc-color-text-muted);
        transition: transform 120ms ease;
    }

    .typecase-root .tc-accordion-item[open] .tc-accordion-trigger-icon {
        transform: rotate(180deg);
    }

    .typecase-root .tc-accordion-panel {
        padding: 0 1rem 1rem;
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-figure {
        display: grid;
        gap: var(--tc-figure-gap, var(--tc-space-3));
        margin: 0;
        color: var(--tc-color-text);
    }

    .typecase-root .tc-figure[data-align="center"] {
        justify-items: center;
        text-align: center;
    }

    .typecase-root .tc-figure-caption {
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.45;
    }

    .typecase-root .tc-empty-state {
        display: grid;
        justify-items: var(--tc-empty-state-justify-items, center);
        gap: var(--tc-empty-state-gap, var(--tc-space-3));
        padding: var(--tc-empty-state-padding, var(--tc-space-6));
        border-radius: var(--tc-empty-state-radius, var(--tc-radius-lg));
        color: var(--tc-color-text);
        text-align: var(--tc-empty-state-text-align, center);
    }

    .typecase-root .tc-empty-state[data-align="start"] {
        --tc-empty-state-justify-items: start;
        --tc-empty-state-text-align: left;
    }

    .typecase-root .tc-empty-state[data-variant="subtle"] {
        border: 1px solid var(--tc-color-border);
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-empty-state-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--tc-empty-state-icon-size, 2.75rem);
        height: var(--tc-empty-state-icon-size, 2.75rem);
        border-radius: 999px;
        background: color-mix(in srgb, var(--tc-color-text-muted) 11%, transparent);
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-empty-state-title {
        margin: 0;
        color: var(--tc-color-text);
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-sm);
        font-weight: var(--tc-title-weight, 600);
        line-height: 1.15;
    }

    .typecase-root .tc-empty-state-body {
        display: grid;
        max-width: var(--tc-empty-state-body-max-width, 32rem);
        gap: var(--tc-space-2);
        color: var(--tc-color-text-muted);
        line-height: 1.55;
    }

    .typecase-root .tc-empty-state-body > :where(p, ul, ol) {
        margin: 0;
    }

    .typecase-root .tc-empty-state-actions {
        display: flex;
        align-items: center;
        justify-content: var(--tc-empty-state-actions-justify, center);
        gap: var(--tc-space-2);
        flex-wrap: wrap;
        padding-top: var(--tc-space-1);
    }

    .typecase-root .tc-empty-state[data-align="start"] .tc-empty-state-actions {
        --tc-empty-state-actions-justify: flex-start;
    }

    .typecase-root .tc-code-block {
        display: grid;
        overflow: hidden;
        border: 1px solid var(--tc-code-border);
        border-radius: var(--tc-code-radius, var(--tc-radius-md));
        background: var(--tc-code-bg);
        color: var(--tc-code-text);
    }

    .typecase-root .tc-code-block-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tc-space-3);
        min-height: 2.5rem;
        padding: 0.5rem var(--tc-space-4);
        border-bottom: 1px solid var(--tc-code-border);
        background: var(--tc-code-header-bg);
    }

    .typecase-root .tc-code-block-language {
        color: var(--tc-code-language-color, var(--tc-color-text-muted));
        font-size: var(--tc-code-language-size, 0.625rem);
        font-weight: 600;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.12em;
    }

    .typecase-root .tc-code-block-actions {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        margin-left: auto;
    }

    .typecase-root .tc-code-block-body {
        margin: 0;
        padding: var(--tc-space-5);
        overflow: auto;
        font-family: var(--tc-font-family-mono);
        font-size: var(--tc-font-size-sm);
        line-height: 1.6;
    }

    .typecase-root .tc-code-block-body code {
        display: block;
        white-space: pre-wrap;
    }

    .typecase-root .tc-toolbar {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem;
        border: 1px solid var(
            --tc-toolbar-border,
            color-mix(in srgb, var(--tc-color-border) 88%, white)
        );
        border-radius: calc(var(--tc-radius-lg) + 0.125rem);
        background: var(
            --tc-toolbar-bg,
            color-mix(in srgb, var(--tc-color-surface) 92%, white)
        );
        box-shadow: var(
            --tc-toolbar-shadow,
            0 1.25rem 2.5rem rgba(15, 23, 42, 0.12)
        );
        backdrop-filter: blur(var(--tc-toolbar-blur, 16px));
    }

    .typecase-root .tc-toolbar[data-open="false"] {
        display: none;
    }

    .typecase-root .tc-toolbar-group {
        display: inline-flex;
        align-items: center;
        gap: 0.125rem;
        min-width: 0;
    }

    .typecase-root .tc-toolbar-separator {
        width: 1px;
        align-self: stretch;
        background: var(--tc-toolbar-separator, var(--tc-color-border));
        opacity: 0.9;
    }

    .typecase-root .tc-toolbar-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        min-width: 2.25rem;
        min-height: 2.25rem;
        padding: 0 0.625rem;
        border: 0;
        border-radius: calc(var(--tc-radius-md) - 0.125rem);
        background: transparent;
        color: var(--tc-toolbar-button-text, var(--tc-color-text-muted));
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        line-height: 1;
        transition: background-color 120ms ease, color 120ms ease, box-shadow 120ms ease,
            transform 120ms ease;
    }

    .typecase-root .tc-toolbar-button:hover {
        background: var(
            --tc-toolbar-button-hover-bg,
            var(--tc-color-surface-subtle)
        );
        color: var(--tc-color-text);
    }

    .typecase-root .tc-toolbar-button:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-toolbar-button[data-active="true"] {
        background: var(
            --tc-toolbar-button-active-bg,
            var(--tc-button-primary-bg)
        );
        color: var(
            --tc-toolbar-button-active-text,
            var(--tc-button-primary-text)
        );
    }

    .typecase-root .tc-toolbar[data-size="sm"] {
        gap: 0.25rem;
        padding: 0.25rem;
        border-radius: var(--tc-radius-lg);
    }

    .typecase-root .tc-toolbar[data-size="sm"] .tc-toolbar-group {
        gap: 0.0625rem;
    }

    .typecase-root .tc-toolbar[data-size="sm"] .tc-toolbar-button {
        min-width: 1.875rem;
        min-height: 1.875rem;
        padding: 0 0.5rem;
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-quick-menu {
        display: grid;
        gap: 0.75rem;
        width: min(var(--tc-quick-menu-width, 28rem), 100%);
        padding: 0.75rem;
        border: 1px solid var(--tc-quick-menu-border, var(--tc-color-border));
        border-radius: calc(var(--tc-radius-lg) + 0.125rem);
        background: var(--tc-quick-menu-bg, var(--tc-color-surface));
        color: var(--tc-quick-menu-text, var(--tc-color-text));
        box-shadow: var(--tc-quick-menu-shadow, 0 1.25rem 3rem rgba(15, 23, 42, 0.14));
    }

    .typecase-root .tc-quick-menu-header {
        display: grid;
        gap: 0.25rem;
        padding: 0.125rem 0.125rem 0;
    }

    .typecase-root .tc-quick-menu-kicker {
        color: var(--tc-color-text-muted);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .typecase-root .tc-quick-menu-title {
        color: var(--tc-color-text);
        font-size: var(--tc-font-size-lg);
        font-weight: 650;
        line-height: 1.2;
    }

    .typecase-root .tc-quick-menu-list {
        display: grid;
        gap: 0.75rem;
    }

    .typecase-root .tc-quick-menu-group {
        display: grid;
        gap: 0.375rem;
    }

    .typecase-root .tc-quick-menu-group-label {
        padding: 0 0.5rem;
        color: var(--tc-color-text-muted);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .typecase-root .tc-quick-menu-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem;
        border: 0;
        border-radius: calc(var(--tc-radius-md) + 0.0625rem);
        background: transparent;
        color: var(--tc-color-text);
        cursor: pointer;
        font: inherit;
        text-align: left;
        transition: background-color 120ms ease, color 120ms ease, transform 120ms ease,
            box-shadow 120ms ease;
    }

    .typecase-root .tc-quick-menu-item:hover,
    .typecase-root .tc-quick-menu-item[data-active="true"] {
        background: var(--tc-quick-menu-item-hover-bg, var(--tc-color-surface-subtle));
    }

    .typecase-root .tc-quick-menu-item:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-quick-menu-item-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: calc(var(--tc-radius-md) - 0.125rem);
        background: color-mix(in srgb, var(--tc-color-surface-subtle) 72%, white);
        color: var(--tc-color-text);
        flex: 0 0 auto;
    }

    .typecase-root .tc-quick-menu-item-body {
        display: grid;
        gap: 0.125rem;
        min-width: 0;
    }

    .typecase-root .tc-quick-menu-item-title {
        color: var(--tc-color-text);
        font-weight: 650;
        line-height: 1.25;
    }

    .typecase-root .tc-quick-menu-item-description {
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.45;
    }

    .typecase-root .tc-quick-menu-item-shortcut,
    .typecase-root .tc-quick-menu-item-trailing {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
    }

    .typecase-root .tc-quick-menu-item-shortcut .tc-shortcut {
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-quick-menu-empty {
        padding: 1rem 0.5rem 0.375rem;
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        text-align: center;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] {
        gap: 0.5rem;
        width: min(var(--tc-quick-menu-width, 22rem), 100%);
        padding: 0.5rem;
        border-radius: var(--tc-radius-lg);
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-header {
        gap: 0.125rem;
        padding: 0.125rem 0.25rem 0;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-title {
        font-size: var(--tc-font-size-md);
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-list {
        gap: 0.5rem;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-group {
        gap: 0.25rem;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-group-label {
        padding: 0 0.375rem;
        font-size: 0.68rem;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item {
        gap: 0.625rem;
        padding: 0.625rem 0.75rem;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-icon {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 0.375rem;
        background: transparent;
        color: var(--tc-color-text);
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-body {
        gap: 0;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-title {
        font-size: var(--tc-font-size-md);
        font-weight: 600;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-description {
        display: none;
    }

    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-shortcut .tc-shortcut,
    .typecase-root .tc-quick-menu[data-size="sm"] .tc-quick-menu-item-trailing {
        color: color-mix(in srgb, var(--tc-color-text-muted) 92%, white);
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .typecase-root .tc-snippet-copy-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        min-width: 1.75rem;
        min-height: 1.75rem;
        gap: 0;
        padding: 0;
        line-height: 0;
        border-radius: 0.375rem;
    }

    .typecase-root .tc-snippet-copy-button > svg {
        display: block;
        width: 1rem;
        height: 1rem;
        flex: none;
    }

    .typecase-root .tc-on-this-page {
        display: grid;
        gap: var(--tc-space-3);
        min-width: 0;
        max-height: var(--tc-on-this-page-max-height, none);
        overflow: auto;
        scrollbar-gutter: stable;
    }

    .typecase-root .tc-on-this-page-heading {
        padding-bottom: var(--tc-space-3);
        border-bottom: 1px solid var(--tc-color-border);
        color: var(--tc-color-text);
        font-size: var(--tc-font-size-lg);
        font-weight: 600;
        line-height: 1.2;
    }

    .typecase-root .tc-on-this-page-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.125rem;
    }

    .typecase-root .tc-on-this-page-list[data-depth="1"] {
        padding-left: var(--tc-space-4);
    }

    .typecase-root .tc-on-this-page-list[data-depth="2"] {
        padding-left: var(--tc-space-6);
    }

    .typecase-root .tc-on-this-page-item {
        display: grid;
        gap: 0.125rem;
    }

    .typecase-root .tc-on-this-page-link {
        display: block;
        padding: 0.25rem 0;
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-md);
        font-weight: 500;
        line-height: 1.35;
        text-decoration: none;
        transition: color 120ms ease;
    }

    .typecase-root .tc-on-this-page-link:hover {
        color: var(--tc-color-text);
        text-decoration: none;
    }

    .typecase-root .tc-on-this-page-item[data-active="true"] > .tc-on-this-page-link {
        color: var(--tc-color-text);
    }

    .typecase-root .tc-container {
        width: min(100%, var(--tc-container-max-width, 72rem));
        margin-inline: auto;
        padding-inline: var(--tc-container-padding, var(--tc-space-4));
    }

    .typecase-root .tc-section {
        display: grid;
        gap: var(--tc-section-gap, var(--tc-space-6));
        min-width: 0;
    }

    .typecase-root .tc-cluster {
        display: flex;
        flex-wrap: wrap;
        align-items: var(--tc-cluster-align, center);
        justify-content: var(--tc-cluster-justify, flex-start);
        gap: var(--tc-cluster-gap, var(--tc-space-2));
    }

    .typecase-root .tc-center {
        width: min(100%, var(--tc-center-max-width, 36rem));
        margin-inline: auto;
        min-height: var(--tc-center-min-height, auto);
        text-align: var(--tc-center-text-align, inherit);
        min-width: 0;
    }

    .typecase-root .tc-center[data-axis="both"] {
        display: grid;
        place-items: center;
    }

    .typecase-root .tc-spacer {
        flex: var(--tc-spacer-grow, 1) 1 auto;
        min-width: 0;
        min-height: 0;
    }

    .typecase-root .tc-inset {
        padding:
            var(--tc-inset-padding-y, var(--tc-inset-padding, var(--tc-space-4)))
            var(--tc-inset-padding-x, var(--tc-inset-padding, var(--tc-space-4)));
        min-width: 0;
    }

    .typecase-root .tc-stack {
        display: flex;
        flex-direction: column;
        gap: var(--tc-stack-gap, var(--tc-space-4));
        align-items: var(--tc-stack-align, stretch);
        justify-content: var(--tc-stack-justify, flex-start);
    }

    .typecase-root .tc-inline {
        display: flex;
        flex-wrap: var(--tc-inline-wrap, wrap);
        gap: var(--tc-inline-gap, var(--tc-space-3));
        align-items: var(--tc-inline-align, center);
        justify-content: var(--tc-inline-justify, flex-start);
    }

    .typecase-root .tc-grid {
        display: grid;
        gap: var(--tc-grid-gap, var(--tc-space-4));
        grid-template-columns: var(--tc-grid-columns, repeat(auto-fit, minmax(16rem, 1fr)));
    }

    .typecase-root .tc-screen {
        min-height: var(--tc-screen-min-height, 100vh);
        background: var(--tc-screen-background, transparent);
        color: var(--tc-screen-color, inherit);
    }

    .typecase-root .tc-show {
        display: contents;
    }

    .typecase-root .tc-show[data-above] {
        display: none;
    }

    .typecase-root .tc-show[data-between-start][data-between-end] {
        display: none;
    }

    .typecase-root .tc-navbar-start[data-responsive-child-above],
    .typecase-root .tc-navbar-brand[data-responsive-child-above],
    .typecase-root .tc-navbar-nav[data-responsive-child-above],
    .typecase-root .tc-navbar-actions[data-responsive-child-above],
    .typecase-root .tc-navbar-start[data-responsive-child-between-start][data-responsive-child-between-end],
    .typecase-root .tc-navbar-brand[data-responsive-child-between-start][data-responsive-child-between-end],
    .typecase-root .tc-navbar-nav[data-responsive-child-between-start][data-responsive-child-between-end],
    .typecase-root .tc-navbar-actions[data-responsive-child-between-start][data-responsive-child-between-end] {
        display: none;
    }

    .typecase-root :is(
        .tc-navbar-start,
        .tc-navbar-brand,
        .tc-navbar-nav
    )[data-responsive-child-above] + :is(.tc-navbar-brand, .tc-navbar-nav),
    .typecase-root :is(
        .tc-navbar-start,
        .tc-navbar-brand,
        .tc-navbar-nav
    )[data-responsive-child-between-start][data-responsive-child-between-end]
        + :is(.tc-navbar-brand, .tc-navbar-nav) {
        margin-left: 0;
    }

    .typecase-root .tc-split {
        display: grid;
        align-items: start;
        gap: var(--tc-split-gap, var(--tc-space-6));
        grid-template-columns: var(--tc-split-columns, minmax(0, 1fr));
    }

    .typecase-root .tc-split-start,
    .typecase-root .tc-split-main,
    .typecase-root .tc-split-end {
        min-width: 0;
    }

    .typecase-root .tc-split-start[data-sticky="true"],
    .typecase-root .tc-split-end[data-sticky="true"] {
        position: sticky;
        top: var(--tc-split-sticky-top, 1rem);
        align-self: start;
    }

    .typecase-root .tc-scroll-area {
        min-width: 0;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
        height: var(--tc-scroll-area-height, auto);
        max-height: var(--tc-scroll-area-max-height, none);
    }

    @media (max-width: 767px) {
        .typecase-root .tc-command-palette-search-trigger {
            min-width: 5rem;
            padding-inline: 0.75rem;
        }

        .typecase-root .tc-command-palette-search-trigger-label {
            max-width: 4rem;
        }

        .typecase-root .tc-command-palette-shortcut {
            display: none;
        }

        .typecase-root .tc-command-palette-search-trigger-shortcut {
            display: none;
        }

        .typecase-root .tc-command-palette-backdrop {
            --tc-command-palette-offset: 5.5rem;
        }

        .typecase-root .tc-split[data-collapse-below="sm"] {
            grid-template-columns: minmax(0, 1fr);
        }

        .typecase-root .tc-split[data-collapse-below="sm"] .tc-split-start[data-sticky="true"],
        .typecase-root .tc-split[data-collapse-below="sm"] .tc-split-end[data-sticky="true"] {
            position: static;
        }
    }

    @media (min-width: 768px) {
        .typecase-root .tc-navbar-start[data-responsive-child-below="sm"],
        .typecase-root .tc-navbar-brand[data-responsive-child-below="sm"],
        .typecase-root .tc-navbar-nav[data-responsive-child-below="sm"],
        .typecase-root .tc-navbar-actions[data-responsive-child-below="sm"] {
            display: none;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        )[data-responsive-child-below="sm"] + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: 0;
        }

        .typecase-root .tc-navbar-start[data-responsive-child-above="sm"],
        .typecase-root .tc-navbar-brand[data-responsive-child-above="sm"],
        .typecase-root .tc-navbar-nav[data-responsive-child-above="sm"],
        .typecase-root .tc-navbar-actions[data-responsive-child-above="sm"],
        .typecase-root .tc-navbar-start[data-responsive-child-between-start="sm"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-brand[data-responsive-child-between-start="sm"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-nav[data-responsive-child-between-start="sm"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-actions[data-responsive-child-between-start="sm"][data-responsive-child-between-end] {
            display: flex;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        ):is(
            [data-responsive-child-above="sm"],
            [data-responsive-child-between-start="sm"][data-responsive-child-between-end]
        ) + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: var(--tc-navbar-gap, var(--tc-space-4));
        }

        .typecase-root .tc-navbar-start:is(
            [data-responsive-child-above="sm"],
            [data-responsive-child-between-start="sm"][data-responsive-child-between-end]
        ) + .tc-navbar-brand {
            margin-left: var(--tc-navbar-leading-gap, var(--tc-space-2));
        }

        .typecase-root .tc-show[data-below="sm"] {
            display: none;
        }

        .typecase-root .tc-show[data-above="sm"] {
            display: contents;
        }

        .typecase-root .tc-show[data-between-start="sm"][data-between-end] {
            display: contents;
        }
    }

    @media (max-width: 959px) {
        .typecase-root .tc-split[data-collapse-below="md"] {
            grid-template-columns: minmax(0, 1fr);
        }

        .typecase-root .tc-split[data-collapse-below="md"] .tc-split-start[data-sticky="true"],
        .typecase-root .tc-split[data-collapse-below="md"] .tc-split-end[data-sticky="true"] {
            position: static;
        }
    }

    @media (min-width: 960px) {
        .typecase-root .tc-navbar-start[data-responsive-child-below="md"],
        .typecase-root .tc-navbar-brand[data-responsive-child-below="md"],
        .typecase-root .tc-navbar-nav[data-responsive-child-below="md"],
        .typecase-root .tc-navbar-actions[data-responsive-child-below="md"],
        .typecase-root .tc-navbar-start[data-responsive-child-between-end="sm"],
        .typecase-root .tc-navbar-brand[data-responsive-child-between-end="sm"],
        .typecase-root .tc-navbar-nav[data-responsive-child-between-end="sm"],
        .typecase-root .tc-navbar-actions[data-responsive-child-between-end="sm"] {
            display: none;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        ):is(
            [data-responsive-child-below="md"],
            [data-responsive-child-between-end="sm"]
        ) + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: 0;
        }

        .typecase-root .tc-navbar-start[data-responsive-child-above="md"],
        .typecase-root .tc-navbar-brand[data-responsive-child-above="md"],
        .typecase-root .tc-navbar-nav[data-responsive-child-above="md"],
        .typecase-root .tc-navbar-actions[data-responsive-child-above="md"],
        .typecase-root .tc-navbar-start[data-responsive-child-between-start="md"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-brand[data-responsive-child-between-start="md"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-nav[data-responsive-child-between-start="md"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-actions[data-responsive-child-between-start="md"][data-responsive-child-between-end] {
            display: flex;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        ):is(
            [data-responsive-child-above="md"],
            [data-responsive-child-between-start="md"][data-responsive-child-between-end]
        ) + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: var(--tc-navbar-gap, var(--tc-space-4));
        }

        .typecase-root .tc-navbar-start:is(
            [data-responsive-child-above="md"],
            [data-responsive-child-between-start="md"][data-responsive-child-between-end]
        ) + .tc-navbar-brand {
            margin-left: var(--tc-navbar-leading-gap, var(--tc-space-2));
        }

        .typecase-root .tc-show[data-below="md"] {
            display: none;
        }

        .typecase-root .tc-show[data-above="md"] {
            display: contents;
        }

        .typecase-root .tc-show[data-between-start="md"][data-between-end] {
            display: contents;
        }

        .typecase-root .tc-show[data-between-end="sm"] {
            display: none;
        }
    }

    @media (max-width: 1199px) {
        .typecase-root .tc-split[data-collapse-below="lg"] {
            grid-template-columns: minmax(0, 1fr);
        }

        .typecase-root .tc-split[data-collapse-below="lg"] .tc-split-start[data-sticky="true"],
        .typecase-root .tc-split[data-collapse-below="lg"] .tc-split-end[data-sticky="true"] {
            position: static;
        }
    }

    @media (min-width: 1200px) {
        .typecase-root .tc-navbar-start[data-responsive-child-below="lg"],
        .typecase-root .tc-navbar-brand[data-responsive-child-below="lg"],
        .typecase-root .tc-navbar-nav[data-responsive-child-below="lg"],
        .typecase-root .tc-navbar-actions[data-responsive-child-below="lg"],
        .typecase-root .tc-navbar-start[data-responsive-child-between-end="md"],
        .typecase-root .tc-navbar-brand[data-responsive-child-between-end="md"],
        .typecase-root .tc-navbar-nav[data-responsive-child-between-end="md"],
        .typecase-root .tc-navbar-actions[data-responsive-child-between-end="md"] {
            display: none;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        ):is(
            [data-responsive-child-below="lg"],
            [data-responsive-child-between-end="md"]
        ) + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: 0;
        }

        .typecase-root .tc-navbar-start[data-responsive-child-above="lg"],
        .typecase-root .tc-navbar-brand[data-responsive-child-above="lg"],
        .typecase-root .tc-navbar-nav[data-responsive-child-above="lg"],
        .typecase-root .tc-navbar-actions[data-responsive-child-above="lg"],
        .typecase-root .tc-navbar-start[data-responsive-child-between-start="lg"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-brand[data-responsive-child-between-start="lg"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-nav[data-responsive-child-between-start="lg"][data-responsive-child-between-end],
        .typecase-root .tc-navbar-actions[data-responsive-child-between-start="lg"][data-responsive-child-between-end] {
            display: flex;
        }

        .typecase-root :is(
            .tc-navbar-start,
            .tc-navbar-brand,
            .tc-navbar-nav
        ):is(
            [data-responsive-child-above="lg"],
            [data-responsive-child-between-start="lg"][data-responsive-child-between-end]
        ) + :is(.tc-navbar-brand, .tc-navbar-nav) {
            margin-left: var(--tc-navbar-gap, var(--tc-space-4));
        }

        .typecase-root .tc-navbar-start:is(
            [data-responsive-child-above="lg"],
            [data-responsive-child-between-start="lg"][data-responsive-child-between-end]
        ) + .tc-navbar-brand {
            margin-left: var(--tc-navbar-leading-gap, var(--tc-space-2));
        }

        .typecase-root .tc-show[data-below="lg"] {
            display: none;
        }

        .typecase-root .tc-show[data-above="lg"] {
            display: contents;
        }

        .typecase-root .tc-show[data-between-end="md"] {
            display: none;
        }
    }

    .typecase-root .tc-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: var(--tc-list-gap, var(--tc-space-2));
    }

    .typecase-root .tc-list-item {
        list-style: none;
    }

    .typecase-root .tc-list-item-link,
    .typecase-root .tc-list-item-content {
        display: flex;
        align-items: center;
        gap: var(--tc-space-2);
        width: 100%;
        min-height: var(--tc-control-height-sm);
        padding: 0.625rem 0.875rem;
        border: 1px solid transparent;
        border-radius: var(--tc-radius-md);
        color: var(--tc-list-item-text, var(--tc-color-text));
        font-size: var(--tc-font-size-sm);
        font-weight: 500;
        line-height: 1.35;
        text-decoration: none;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    .typecase-root .tc-list[data-variant="nav"] .tc-list-item-link,
    .typecase-root .tc-list[data-variant="nav"] .tc-list-item-content {
        padding-inline: 0.75rem;
    }

    .typecase-root .tc-list-item-link:hover {
        background: var(--tc-list-item-bg-hover, var(--tc-color-surface-subtle));
        border-color: var(--tc-list-item-border-hover, transparent);
        text-decoration: none;
    }

    .typecase-root .tc-list-item[data-active="true"] .tc-list-item-link,
    .typecase-root .tc-list-item[data-active="true"] .tc-list-item-content {
        background: var(--tc-list-item-bg-active, var(--tc-color-surface-subtle));
        border-color: var(--tc-list-item-border-active, var(--tc-color-border));
        color: var(--tc-list-item-text-active, var(--tc-color-text));
    }

    .typecase-root .tc-breadcrumb {
        display: block;
    }

    .typecase-root .tc-breadcrumb-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0;
        margin: 0;
        padding: 0;
        list-style: none;
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        line-height: 1.35;
    }

    .typecase-root .tc-breadcrumb-item {
        display: inline-flex;
        align-items: center;
        min-width: 0;
    }

    .typecase-root .tc-breadcrumb-item + .tc-breadcrumb-item::before {
        content: "/";
        flex: 0 0 auto;
        margin-inline: 0.625rem;
        color: var(--tc-color-text-subtle);
    }

    .typecase-root .tc-breadcrumb-link,
    .typecase-root .tc-breadcrumb-current {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        color: inherit;
        font-weight: 500;
        text-decoration: none;
    }

    .typecase-root .tc-breadcrumb-link:hover {
        color: var(--tc-color-link-hover, var(--tc-color-link));
        text-decoration: none;
    }

    .typecase-root .tc-breadcrumb-item[data-active="true"] .tc-breadcrumb-current {
        color: var(--tc-color-text);
        font-weight: 650;
    }

    .typecase-root .tc-breadcrumb-list[data-variant="subtle"] {
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .typecase-root .tc-pagination {
        display: block;
    }

    .typecase-root .tc-pagination-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--tc-pagination-gap, 0.375rem);
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .typecase-root .tc-pagination-item {
        display: inline-flex;
    }

    .typecase-root .tc-pagination-control,
    .typecase-root .tc-pagination-ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--tc-pagination-control-size, var(--tc-control-height-md));
        min-height: var(--tc-pagination-control-size, var(--tc-control-height-md));
        padding: 0 var(--tc-space-3);
        border: 1px solid var(--tc-pagination-border, var(--tc-color-border));
        border-radius: var(--tc-radius-md);
        background: var(--tc-pagination-bg, var(--tc-color-surface));
        color: var(--tc-pagination-text, var(--tc-color-text));
        font: inherit;
        font-weight: 600;
        line-height: 1;
        text-decoration: none;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease,
            box-shadow 120ms ease;
    }

    .typecase-root .tc-pagination-control:hover {
        background: var(--tc-color-surface-subtle);
        text-decoration: none;
    }

    .typecase-root .tc-pagination-control:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-pagination-control[aria-disabled="true"] {
        opacity: 0.54;
        cursor: not-allowed;
    }

    .typecase-root .tc-pagination-control[data-active="true"] {
        border-color: var(--tc-button-primary-bg);
        background: var(--tc-button-primary-bg);
        color: var(--tc-button-primary-text);
    }

    .typecase-root .tc-pagination-ellipsis {
        border-color: transparent;
        background: transparent;
        color: var(--tc-color-text-muted);
    }

    .typecase-root .tc-pagination[data-size="sm"] .tc-pagination-control,
    .typecase-root .tc-pagination[data-size="sm"] .tc-pagination-ellipsis {
        --tc-pagination-control-size: var(--tc-control-height-sm);
        padding: 0 var(--tc-space-2);
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-tabs {
        display: grid;
        gap: var(--tc-space-4);
    }

    .typecase-root .tc-tabs-list {
        display: flex;
        align-items: center;
        gap: var(--tc-tabs-list-gap, 0.25rem);
        overflow-x: auto;
        scrollbar-width: thin;
    }

    .typecase-root .tc-tabs-tab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--tc-space-2);
        min-height: var(--tc-control-height-md);
        padding: 0 var(--tc-space-3);
        border: 0;
        border-radius: var(--tc-radius-md);
        background: transparent;
        color: var(--tc-color-text-muted);
        cursor: pointer;
        font: inherit;
        font-weight: 600;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        transition: background-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
    }

    .typecase-root .tc-tabs-tab:hover {
        background: var(--tc-color-surface-subtle);
        color: var(--tc-color-text);
        text-decoration: none;
    }

    .typecase-root .tc-tabs-tab:focus-visible {
        outline: none;
        box-shadow: var(--tc-focus-ring);
    }

    .typecase-root .tc-tabs-tab:disabled,
    .typecase-root .tc-tabs-tab[aria-disabled="true"] {
        opacity: 0.56;
        cursor: not-allowed;
    }

    .typecase-root .tc-tabs-tab[data-active="true"] {
        color: var(--tc-color-text);
    }

    .typecase-root .tc-tabs[data-size="sm"] .tc-tabs-tab {
        min-height: var(--tc-control-height-sm);
        padding: 0 var(--tc-space-2);
        font-size: var(--tc-font-size-sm);
    }

    .typecase-root .tc-tabs[data-variant="line"] .tc-tabs-list {
        gap: 0;
        border-bottom: 1px solid var(--tc-color-border);
    }

    .typecase-root .tc-tabs[data-variant="line"] .tc-tabs-tab {
        border-radius: 0;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
    }

    .typecase-root .tc-tabs[data-variant="line"] .tc-tabs-tab:hover {
        background: transparent;
    }

    .typecase-root .tc-tabs[data-variant="line"] .tc-tabs-tab[data-active="true"] {
        border-bottom-color: var(--tc-button-primary-bg);
    }

    .typecase-root .tc-tabs[data-variant="pills"] .tc-tabs-list {
        gap: var(--tc-space-2);
        padding: 0.25rem;
        border: 1px solid var(--tc-color-border);
        border-radius: calc(var(--tc-radius-md) + 0.25rem);
        background: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-tabs[data-variant="pills"] .tc-tabs-tab[data-active="true"] {
        background: var(--tc-color-surface);
        box-shadow: var(--tc-shadow-sm);
    }

    .typecase-root .tc-tabs-panel {
        display: grid;
        gap: var(--tc-space-3);
        color: var(--tc-color-text);
    }

    .typecase-root .tc-tabs-panel[hidden] {
        display: none;
    }

    .typecase-root .tc-navbar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        min-height: var(--tc-navbar-min-height, 4rem);
    }

    .typecase-root .tc-navbar > * + * {
        margin-left: var(--tc-navbar-gap, var(--tc-space-4));
    }

    .typecase-root .tc-navbar-start + .tc-navbar-brand {
        margin-left: var(--tc-navbar-leading-gap, var(--tc-space-2));
    }

    .typecase-root .tc-navbar-start,
    .typecase-root .tc-navbar-brand,
    .typecase-root .tc-navbar-nav,
    .typecase-root .tc-navbar-actions {
        display: flex;
        align-items: center;
        gap: var(--tc-navbar-gap, var(--tc-space-4));
        min-width: 0;
    }

    .typecase-root .tc-navbar-start,
    .typecase-root .tc-navbar-brand {
        flex: 0 0 auto;
    }

    .typecase-root .tc-navbar-nav {
        flex: 1 1 auto;
    }

    .typecase-root .tc-navbar-actions {
        flex: 0 0 auto;
        margin-left: auto;
        justify-content: flex-end;
    }

    .typecase-root .tc-topbar {
        --tc-color-text: var(--tc-topbar-text, var(--tc-root-color-text));
        --tc-color-link: var(--tc-topbar-link, var(--tc-root-color-link));
        --tc-color-link-hover: var(--tc-topbar-link-hover, var(--tc-root-color-link-hover));
        --tc-button-ghost-text: var(--tc-topbar-ghost-text, var(--tc-root-button-ghost-text));
        --tc-button-ghost-bg-hover: var(
            --tc-topbar-ghost-bg-hover,
            var(--tc-root-button-ghost-bg-hover)
        );
        border-bottom: 1px solid var(--tc-topbar-border, var(--tc-root-color-border));
        background: var(--tc-topbar-bg, var(--tc-root-color-surface));
        color: var(--tc-topbar-text, var(--tc-root-color-text));
    }

    .typecase-root .tc-topbar[data-variant="default"] {
        --tc-topbar-bg: var(--tc-topbar-default-bg, var(--tc-root-color-surface));
        --tc-topbar-border: var(--tc-topbar-default-border, var(--tc-root-color-border));
        --tc-topbar-text: var(--tc-topbar-default-text, var(--tc-root-color-text));
        --tc-topbar-link: var(--tc-topbar-default-link, var(--tc-root-color-link));
        --tc-topbar-link-hover: var(
            --tc-topbar-default-link-hover,
            var(--tc-root-color-link-hover)
        );
        --tc-topbar-ghost-text: var(
            --tc-topbar-default-ghost-text,
            var(--tc-root-button-ghost-text)
        );
        --tc-topbar-ghost-bg-hover: var(
            --tc-topbar-default-ghost-bg-hover,
            var(--tc-root-button-ghost-bg-hover)
        );
    }

    .typecase-root .tc-topbar[data-variant="subtle"] {
        --tc-topbar-bg: var(--tc-topbar-subtle-bg, var(--tc-root-color-surface-subtle));
        --tc-topbar-border: var(--tc-topbar-subtle-border, var(--tc-root-color-border));
        --tc-topbar-text: var(--tc-topbar-subtle-text, var(--tc-root-color-text));
        --tc-topbar-link: var(--tc-topbar-subtle-link, var(--tc-root-color-link));
        --tc-topbar-link-hover: var(
            --tc-topbar-subtle-link-hover,
            var(--tc-root-color-link-hover)
        );
        --tc-topbar-ghost-text: var(
            --tc-topbar-subtle-ghost-text,
            var(--tc-root-button-ghost-text)
        );
        --tc-topbar-ghost-bg-hover: var(
            --tc-topbar-subtle-ghost-bg-hover,
            var(--tc-root-button-ghost-bg-hover)
        );
    }

    .typecase-root .tc-topbar[data-variant="strong"] {
        --tc-topbar-bg: var(--tc-topbar-strong-bg, var(--tc-root-color-text));
        --tc-topbar-border: var(--tc-topbar-strong-border, var(--tc-root-color-text));
        --tc-topbar-text: var(--tc-topbar-strong-text, var(--tc-root-color-surface));
        --tc-topbar-link: var(--tc-topbar-strong-link, var(--tc-topbar-strong-text));
        --tc-topbar-link-hover: var(
            --tc-topbar-strong-link-hover,
            var(--tc-topbar-strong-link)
        );
        --tc-topbar-ghost-text: var(
            --tc-topbar-strong-ghost-text,
            var(--tc-topbar-strong-text)
        );
        --tc-topbar-ghost-bg-hover: var(
            --tc-topbar-strong-ghost-bg-hover,
            rgba(255, 255, 255, 0.14)
        );
    }

    .typecase-root .tc-topbar[data-sticky="true"] {
        position: sticky;
        top: var(--tc-topbar-top, 0);
        z-index: var(--tc-topbar-z-index, 20);
    }

    .typecase-root .tc-topbar[data-blur="true"] {
        backdrop-filter: blur(var(--tc-topbar-blur, 12px));
    }

    .typecase-root .tc-offcanvas-shell {
        position: relative;
    }

    .typecase-root .tc-offcanvas {
        display: flex;
        flex-direction: column;
        width: min(100%, var(--tc-offcanvas-width, 18rem));
        max-width: 100%;
        min-height: 100%;
        background: var(--tc-offcanvas-bg, var(--tc-color-surface));
        border: 1px solid var(--tc-offcanvas-border, var(--tc-color-border));
        box-shadow: var(--tc-offcanvas-shadow, var(--tc-shadow-sm));
    }

    .typecase-root .tc-offcanvas-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tc-space-3);
        padding: var(--tc-space-4);
        border-bottom: 1px solid var(--tc-offcanvas-border, var(--tc-color-border));
    }

    .typecase-root .tc-offcanvas-title {
        margin: 0;
        color: var(--tc-color-text);
        font-family: var(--tc-font-family-heading, var(--tc-font-family));
        font-size: var(--tc-title-size-sm);
        font-weight: var(--tc-title-weight, 600);
        line-height: 1.2;
    }

    .typecase-root .tc-offcanvas-body {
        display: grid;
        gap: var(--tc-space-4);
        padding: var(--tc-space-4);
    }

    .typecase-root .tc-offcanvas-backdrop {
        position: fixed;
        inset: 0;
        border: 0;
        padding: 0;
        background: var(--tc-offcanvas-backdrop, rgba(15, 23, 42, 0.42));
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"],
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"] {
        position: relative;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"] .tc-offcanvas {
        position: fixed;
        top: 0;
        bottom: 0;
        z-index: 40;
        overflow-y: auto;
        transition: transform 180ms ease, visibility 180ms ease;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"][data-placement="start"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"][data-placement="start"] .tc-offcanvas {
        left: 0;
        transform: translateX(-100%);
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"][data-placement="end"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"][data-placement="end"] .tc-offcanvas {
        right: 0;
        transform: translateX(100%);
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"][data-open="true"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"][data-open="true"] .tc-offcanvas {
        transform: translateX(0);
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"][data-open="true"] .tc-offcanvas-backdrop,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"][data-open="true"] .tc-offcanvas-backdrop {
        opacity: 1;
        pointer-events: auto;
        z-index: 39;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="overlay"][data-open="false"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="responsive"][data-open="false"] .tc-offcanvas {
        visibility: hidden;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="inline"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="inline"][data-open="false"] .tc-offcanvas,
    .typecase-root .tc-offcanvas-shell[data-mode="inline"][data-open="true"] .tc-offcanvas {
        position: static;
        transform: none;
        visibility: visible;
    }

    .typecase-root .tc-offcanvas-shell[data-mode="inline"] .tc-offcanvas-backdrop {
        display: none;
    }

    @media (min-width: 960px) {
        .typecase-root .tc-offcanvas-shell[data-mode="responsive"] .tc-offcanvas {
            position: static;
            transform: none;
            visibility: visible;
        }

        .typecase-root .tc-offcanvas-shell[data-mode="responsive"] .tc-offcanvas-backdrop {
            display: none;
        }
    }

    .typecase-root .tc-surface {
        padding: var(--tc-surface-padding, var(--tc-space-5));
        border: 1px solid var(--tc-surface-border, var(--tc-color-border));
        border-radius: var(--tc-surface-radius, var(--tc-radius-lg));
        background: var(--tc-surface-bg, var(--tc-color-surface));
        box-shadow: var(--tc-surface-shadow, var(--tc-shadow-sm));
    }

    .typecase-root .tc-surface[data-variant="subtle"] {
        background: var(--tc-surface-bg-subtle, var(--tc-color-surface-subtle));
    }

    .typecase-root .tc-surface[data-variant="ghost"] {
        background: transparent;
        box-shadow: none;
    }

    .typecase-root .tc-table-shell {
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--tc-table-border, var(--tc-color-border));
        border-radius: var(--tc-table-radius, var(--tc-radius-md));
        background: var(--tc-table-bg, var(--tc-color-surface));
    }

    .typecase-root .tc-table-shell[data-variant="subtle"] {
        --tc-table-bg: var(--tc-color-surface-subtle);
    }

    .typecase-root .tc-table {
        width: 100%;
        min-width: var(--tc-table-min-width, 36rem);
        border-collapse: collapse;
        color: var(--tc-color-text);
        font-size: var(--tc-font-size-sm);
        line-height: 1.45;
    }

    .typecase-root .tc-table-caption {
        padding: var(--tc-space-3) var(--tc-space-4);
        color: var(--tc-color-text-muted);
        font-size: var(--tc-font-size-sm);
        text-align: left;
    }

    .typecase-root .tc-table-header-cell,
    .typecase-root .tc-table-cell {
        padding: var(--tc-table-cell-padding-y, 0.875rem) var(--tc-table-cell-padding-x, 1rem);
        border-bottom: 1px solid var(--tc-table-border, var(--tc-color-border));
        text-align: left;
        vertical-align: middle;
    }

    .typecase-root .tc-table-shell[data-density="compact"] {
        --tc-table-cell-padding-y: 0.625rem;
        --tc-table-cell-padding-x: 0.875rem;
    }

    .typecase-root .tc-table-header-cell {
        background: var(--tc-table-head-bg, var(--tc-color-surface-subtle));
        color: var(--tc-color-text-muted);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .typecase-root .tc-table-cell {
        color: var(--tc-color-text);
    }

    .typecase-root .tc-table-cell[data-align="center"],
    .typecase-root .tc-table-header-cell[data-align="center"] {
        text-align: center;
    }

    .typecase-root .tc-table-cell[data-align="end"],
    .typecase-root .tc-table-header-cell[data-align="end"] {
        text-align: right;
    }

    .typecase-root .tc-table-body .tc-table-row:last-child .tc-table-cell,
    .typecase-root .tc-table-foot .tc-table-row:last-child .tc-table-cell {
        border-bottom: 0;
    }

    .typecase-root .tc-table-shell[data-striped="true"] .tc-table-body .tc-table-row:nth-child(even) {
        background: color-mix(in srgb, var(--tc-color-surface-subtle) 64%, transparent);
    }

    .typecase-root .tc-table-foot .tc-table-cell {
        background: var(--tc-color-surface-subtle);
        color: var(--tc-color-text-muted);
        font-weight: 600;
    }

    .typecase-root .tc-meta-table {
        display: grid;
        border-top: 1px solid var(--tc-meta-border, var(--tc-color-border));
    }

    .typecase-root .tc-meta-table-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
        gap: var(--tc-space-3);
        padding-block: var(--tc-space-3);
        border-bottom: 1px solid var(--tc-meta-border, var(--tc-color-border));
    }

    .typecase-root .tc-meta-table-label {
        color: var(--tc-meta-label-color, var(--tc-color-text-muted));
        font-size: var(--tc-font-size-sm);
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .typecase-root .tc-meta-table-value {
        color: var(--tc-meta-value-color, var(--tc-color-text));
        font-size: var(--tc-font-size-md);
    }

    @keyframes tc-spinner-rotate {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes tc-progress-indeterminate {
        0% {
            transform: translateX(-120%);
        }

        100% {
            transform: translateX(260%);
        }
    }

    @keyframes tc-status-dot-pulse {
        to {
            opacity: 0;
            transform: scale(2.5);
        }
    }

    @keyframes tc-skeleton-shimmer {
        0% {
            background-position: 200% 0, 0 0;
        }

        100% {
            background-position: -200% 0, 0 0;
        }
    }
`;
