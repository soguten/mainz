/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
    "./typecase.render.fixture.tsx"
) as typeof import("./typecase.render.fixture.tsx");

Deno.test("typecase/render: should render the light theme root and primitives", () => {
    const screen = renderMainzComponent(fixtures.TypecaseRenderFixture);

    const root = screen.getBySelector("[data-typecase-theme='light']");
    assertEquals(root.getAttribute("data-typecase-theme"), "light");
    assertStringIncludes(root.getAttribute("style") ?? "", "--tc-color-text");
    assertStringIncludes(root.getAttribute("style") ?? "", "color-scheme: light");

    const button = screen.getBySelector("[data-testid='primary-action']");
    assertStringIncludes(button.getAttribute("class") ?? "", "tc-button");
    assertEquals(button.getAttribute("data-variant"), "primary");
    assertStringIncludes(
        screen.getBySelector("[data-testid='screen']").getAttribute("class") ?? "",
        "tc-screen",
    );
    assertEquals(
        screen.getBySelector("[data-testid='responsive-navbar-start']").getAttribute(
            "data-responsive-child-below",
        ),
        "md",
    );

    const input = screen.getBySelector("[data-testid='typecase-input']");
    assertStringIncludes(input.getAttribute("class") ?? "", "tc-input");

    screen.cleanup();
});

Deno.test("typecase/render: should render composite subcomponents and pattern behavior", async () => {
    const screen = renderMainzComponent(fixtures.TypecaseRenderFixture);

    assertEquals(screen.getBySelector(".tc-card-title").textContent, "Typecase Card");
    assertEquals(screen.getBySelector(".tc-code-block-language").textContent, "tsx");
    assertEquals(screen.getBySelector("[data-testid='copy-icon']").getAttribute("width"), "16");
    assertStringIncludes(
        screen.getBySelector("[data-testid='toolbar']").getAttribute("class") ?? "",
        "tc-toolbar",
    );
    assertEquals(
        screen.getBySelector("[data-testid='toolbar-bold']").getAttribute("data-active"),
        "true",
    );
    assertEquals(
        screen.getBySelector("[data-testid='toolbar-compact']").getAttribute("data-size"),
        "sm",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='quick-menu']").getAttribute("class") ?? "",
        "tc-quick-menu",
    );
    assertEquals(screen.getBySelector(".tc-quick-menu-title").textContent, "Quick menu");
    assertEquals(
        screen.getBySelector("[data-testid='quick-menu-item'] .tc-shortcut").getAttribute(
            "data-chord",
        ),
        "Enter",
    );
    assertEquals(
        screen.getBySelector("[data-testid='quick-menu-compact']").getAttribute("data-size"),
        "sm",
    );
    assertEquals(
        screen.getBySelector("[data-testid='quick-menu-compact-item'] .tc-quick-menu-item-title")
            .textContent,
        "Callout",
    );
    assertEquals(
        screen.getBySelector("[data-testid='heading3-icon']").getAttribute("height"),
        "20",
    );
    assertEquals(screen.getBySelector("[data-testid='sun-icon']").getAttribute("width"), "16");
    assertEquals(
        screen.getBySelector("[data-testid='chevron-down-icon']").getAttribute("height"),
        "14",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='section']").getAttribute("class") ?? "",
        "tc-section",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='cluster']").getAttribute("class") ?? "",
        "tc-cluster",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='spinner']").getAttribute("class") ?? "",
        "tc-spinner",
    );
    assertEquals(screen.getBySelector("[data-testid='spinner']").getAttribute("role"), "status");
    assertStringIncludes(
        screen.getBySelector("[data-testid='skeleton']").getAttribute("class") ?? "",
        "tc-skeleton",
    );
    assertEquals(
        screen.getBySelector("[data-testid='skeleton']").getAttribute("data-variant"),
        "text",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='progress']").getAttribute("class") ?? "",
        "tc-progress",
    );
    assertEquals(
        screen.getBySelector("[data-testid='progress']").getAttribute("aria-valuenow"),
        "64",
    );
    assertEquals(
        screen.getBySelector("[data-testid='progress-indeterminate']").getAttribute(
            "data-indeterminate",
        ),
        "true",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='kbd']").getAttribute("class") ?? "",
        "tc-kbd",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='shortcut']").getAttribute("class") ?? "",
        "tc-shortcut",
    );
    assertEquals(
        screen.getBySelector("[data-testid='shortcut']").getAttribute("data-chord"),
        "Ctrl+K",
    );
    assertEquals(
        screen.getBySelector("[data-testid='shortcut']").children[0]?.textContent,
        "Ctrl",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='image']").getAttribute("class") ?? "",
        "tc-image",
    );
    assertEquals(screen.getBySelector("[data-testid='image']").getAttribute("data-fit"), "cover");
    assertEquals(
        screen.getBySelector("[data-testid='image']").getAttribute("data-radius"),
        "md",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='avatar']").getAttribute("class") ?? "",
        "tc-avatar",
    );
    assertEquals(screen.getBySelector("[data-testid='avatar']").getAttribute("data-size"), "md");
    assertStringIncludes(
        screen.getBySelector(".tc-switch").getAttribute("class") ?? "",
        "tc-switch",
    );
    assertEquals(
        screen.getBySelector("[data-testid='switch']").getAttribute("type"),
        "checkbox",
    );
    assertEquals(
        screen.getBySelector(".tc-switch[data-size='sm']").getAttribute("data-size"),
        "sm",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='figure']").getAttribute("class") ?? "",
        "tc-figure",
    );
    assertEquals(
        screen.getBySelector(".tc-figure-caption").textContent,
        "Media with supporting caption.",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='empty-state']").getAttribute("class") ?? "",
        "tc-empty-state",
    );
    assertEquals(screen.getBySelector(".tc-empty-state-title").textContent, "No results");
    assertEquals(
        screen.getBySelector("[data-testid='badge']").getAttribute("data-tone"),
        "success",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='badge']").getAttribute("class") ?? "",
        "tc-badge",
    );
    assertEquals(
        screen.getBySelector("[data-testid='callout']").getAttribute("data-tone"),
        "info",
    );
    assertEquals(screen.getBySelector(".tc-callout-title").textContent, "Helpful context");
    assertStringIncludes(
        screen.getBySelector("[data-testid='alert']").getAttribute("class") ?? "",
        "tc-alert",
    );
    assertEquals(
        screen.getBySelector("[data-testid='alert']").getAttribute("data-tone"),
        "success",
    );
    assertEquals(screen.getBySelector("[data-testid='alert']").getAttribute("role"), "status");
    assertStringIncludes(
        screen.getBySelector("[data-testid='toast']").getAttribute("class") ?? "",
        "tc-toast",
    );
    assertEquals(screen.getBySelector("[data-testid='toast']").getAttribute("data-tone"), "info");
    assertEquals(screen.getBySelector(".tc-toast-title").textContent, "Draft saved");
    assertStringIncludes(
        screen.getBySelector("[data-testid='status-dot']").getAttribute("class") ?? "",
        "tc-status-dot",
    );
    assertEquals(
        screen.getBySelector("[data-testid='status-dot']").getAttribute("data-pulse"),
        "true",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='steps']").getAttribute("class") ?? "",
        "tc-steps",
    );
    assertEquals(
        screen.getBySelector("[data-testid='steps']").getAttribute("data-orientation"),
        "vertical",
    );
    assertEquals(
        screen.getBySelector(".tc-step[data-status='current'] .tc-step-title").textContent,
        "Preview",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='link-box']").getAttribute("class") ?? "",
        "tc-link-box",
    );
    assertEquals(
        screen.getBySelector("[data-testid='link-box']").getAttribute("data-variant"),
        "subtle",
    );
    assertEquals(
        screen.getBySelector(".tc-link-box-link").getAttribute("href"),
        "/components/card",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='description-list']").getAttribute("class") ?? "",
        "tc-description-list",
    );
    assertEquals(
        screen.getBySelector("[data-testid='description-list']").getAttribute("data-layout"),
        "inline",
    );
    assertEquals(screen.getBySelector(".tc-description-list-term").textContent, "Package");
    assertStringIncludes(
        screen.getBySelector("[data-testid='stat']").getAttribute("class") ?? "",
        "tc-stat",
    );
    assertEquals(screen.getBySelector(".tc-stat-value").textContent, "42");
    assertStringIncludes(
        screen.getBySelector("[data-testid='breadcrumb']").getAttribute("class") ?? "",
        "tc-breadcrumb",
    );
    assertEquals(
        screen.getBySelector(".tc-breadcrumb-item[data-active='true'] .tc-breadcrumb-current")
            .getAttribute("aria-current"),
        "page",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='pagination']").getAttribute("class") ?? "",
        "tc-pagination",
    );
    assertEquals(
        screen.getBySelector(".tc-pagination-control[data-active='true']").getAttribute(
            "aria-current",
        ),
        "page",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='tabs']").getAttribute("class") ?? "",
        "tc-tabs",
    );
    assertEquals(screen.getBySelector("[data-testid='tabs']").getAttribute("data-variant"), "line");
    assertEquals(
        screen.getBySelector(".tc-tabs-tab[data-active='true']").getAttribute("aria-selected"),
        "true",
    );
    assert(screen.getBySelector("#tabs-api").hasAttribute("hidden"));
    assertStringIncludes(
        screen.getBySelector("[data-testid='accordion']").getAttribute("class") ?? "",
        "tc-accordion",
    );
    assertEquals(
        screen.getBySelector(".tc-accordion-item[open] .tc-accordion-trigger-label").textContent,
        "What belongs in a primitive?",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='table']").getAttribute("class") ?? "",
        "tc-table-shell",
    );
    assertEquals(
        screen.getBySelector("[data-testid='table']").getAttribute("data-striped"),
        "true",
    );
    assertEquals(
        screen.getBySelector(".tc-table-header-cell[data-align='end']").textContent,
        "Examples",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='field']").getAttribute("class") ?? "",
        "tc-field",
    );
    assertEquals(
        screen.getBySelector("[data-testid='field']").getAttribute("data-invalid"),
        "true",
    );
    assertEquals(
        screen.getBySelector("[data-testid='textarea']").getAttribute("aria-invalid"),
        "true",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='select']").getAttribute("class") ?? "",
        "tc-select",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='checkbox']").getAttribute("class") ?? "",
        "tc-choice-input",
    );
    assertEquals(screen.getBySelector("[data-testid='checkbox']").getAttribute("type"), "checkbox");
    assertEquals(screen.getBySelector("[data-testid='radio']").getAttribute("type"), "radio");
    assertStringIncludes(
        screen.getBySelector("[data-testid='fieldset']").getAttribute("class") ?? "",
        "tc-fieldset",
    );
    assertEquals(screen.getBySelector("[data-testid='center']").getAttribute("data-axis"), "both");
    assertStringIncludes(
        screen.getBySelector("[data-testid='spacer']").getAttribute("class") ?? "",
        "tc-spacer",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='inset']").getAttribute("class") ?? "",
        "tc-inset",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='outer-theme-root']").getAttribute(
            "data-typecase-theme",
        ),
        "light",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='nested-theme-root']").getAttribute(
            "data-typecase-theme",
        ),
        "dark",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='navbar']").getAttribute("class") ?? "",
        "tc-navbar",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='topbar']").getAttribute("class") ?? "",
        "tc-topbar",
    );
    assertStringIncludes(
        screen.getBySelector(".tc-on-this-page").getAttribute("class") ?? "",
        "tc-on-this-page",
    );
    assertEquals(screen.getBySelector(".tc-on-this-page-heading").textContent, "On this page");
    assertEquals(screen.getBySelector(".tc-on-this-page-link").getAttribute("href"), "#overview");
    assertEquals(screen.getBySelector(".tc-on-this-page-list[data-depth='1']").children.length, 2);
    assertEquals(
        screen.getBySelector("[data-testid='topbar']").getAttribute("data-sticky"),
        "true",
    );
    assertEquals(
        screen.getBySelector("[data-testid='topbar']").getAttribute("data-variant"),
        "strong",
    );
    assertEquals(screen.getBySelector(".tc-offcanvas-title").textContent, "Browse components");
    assertStringIncludes(
        screen.getBySelector("[data-testid='popover']").getAttribute("class") ?? "",
        "tc-popover",
    );
    assertEquals(
        screen.getBySelector("[data-testid='popover'] .tc-popover-content").textContent?.trim(),
        "Composite popover content.",
    );
    assertEquals(
        screen.getBySelector("[data-testid='dialog'] .tc-dialog-title").textContent?.trim(),
        "Dialog title",
    );
    screen.getBySelector("[data-testid='popover-trigger-button']").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assertEquals(
        screen.host.querySelector(".tc-popover-trigger-portal .tc-popover-content")?.textContent
            ?.trim(),
        "Portaled popover content.",
    );
    screen.getBySelector(".tc-tooltip-anchor").dispatchEvent(
        new MouseEvent("mouseenter"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(
        screen.host.querySelector(".tc-tooltip-portal .tc-tooltip-content")?.textContent?.trim(),
        "Tooltip detail",
    );
    screen.getBySelector("[data-testid='modal-trigger']").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assertEquals(
        screen.host.querySelector(".tc-modal-portal .tc-dialog-title")?.textContent?.trim(),
        "Modal dialog",
    );
    screen.host.querySelector<HTMLElement>(".tc-modal-close")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assert(screen.host.querySelector(".tc-modal-portal") === null);
    screen.getBySelector("[data-testid='drawer-trigger']").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assertEquals(
        screen.host.querySelector(".tc-drawer-portal .tc-offcanvas-title")?.textContent,
        "Drawer menu",
    );
    screen.host.querySelector<HTMLElement>(".tc-drawer-close")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assert(screen.host.querySelector(".tc-drawer-portal") === null);
    assertStringIncludes(
        screen.getBySelector(".tc-navbar-start").getAttribute("class") ?? "",
        "tc-navbar-start",
    );
    assertEquals(
        screen.getBySelector("[data-testid='sidebar-list']").getAttribute("data-variant"),
        "nav",
    );
    assertEquals(
        screen.getBySelector(".tc-list-item-link").getAttribute("href"),
        "/components/button",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='show-below']").getAttribute("class") ?? "",
        "tc-show",
    );
    assertEquals(
        screen.getBySelector("[data-testid='show-above']").getAttribute("data-above"),
        "md",
    );
    assertEquals(
        screen.getBySelector("[data-testid='show-between']").getAttribute("data-between-start"),
        "sm",
    );
    assertEquals(
        screen.getBySelector("[data-testid='show-between']").getAttribute("data-between-end"),
        "md",
    );
    assertEquals(
        screen.getBySelector("[data-testid='split']").getAttribute("data-collapse-below"),
        "md",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='scroll-area']").getAttribute("class") ?? "",
        "tc-scroll-area",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='dark-root']").getAttribute(
            "data-typecase-theme",
        ),
        "dark",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='dark-root']").getAttribute(
            "data-typecase-theme-preference",
        ),
        "dark",
    );
    assertStringIncludes(
        screen.getBySelector(".tc-theme-switch").getAttribute("class") ?? "",
        "tc-theme-switch",
    );
    assertStringIncludes(
        screen.getBySelector("[data-testid='search-palette'] .tc-command-palette-search")
            .getAttribute("class") ?? "",
        "tc-command-palette-search",
    );
    assertEquals(
        screen.getBySelector("[data-testid='search-palette'] .tc-shortcut").getAttribute(
            "data-chord",
        ),
        "Ctrl+K",
    );
    assertStringIncludes(
        screen.getBySelector(
            "[data-testid='search-palette'] .tc-command-palette-search-trigger-main",
        )
            .getAttribute("class") ?? "",
        "tc-command-palette-search-trigger-main",
    );
    assertEquals(
        screen.getBySelector("[data-testid='search-palette'] .tc-command-palette-search-trigger")
            .getAttribute("data-affordance"),
        "prominent",
    );
    assertEquals(screen.getBySelector("[data-testid='command-run-count']").textContent, "0");
    assertEquals(
        screen.getBySelector("[data-testid='command-launcher'] .tc-shortcut").getAttribute(
            "data-chord",
        ),
        "Ctrl+Shift+P",
    );

    screen.getBySelector("[data-testid='dropdown-menu-trigger']").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assertEquals(
        screen.host.querySelector(".tc-dropdown-menu-item-shortcut")?.getAttribute("data-chord"),
        "Ctrl+K",
    );
    assertEquals(
        screen.host.querySelector(".tc-dropdown-menu-item-trailing .tc-shortcut")?.children[0]
            ?.textContent,
        "Ctrl",
    );
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    assert(screen.host.querySelector(".tc-dropdown-menu-portal") === null);

    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            bubbles: true,
            code: "KeyK",
            ctrlKey: true,
            key: "k",
        }),
    );
    assert(screen.host.querySelector(".tc-command-palette-backdrop") !== null);
    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            bubbles: true,
            key: "Escape",
        }),
    );
    assert(screen.host.querySelector(".tc-command-palette-backdrop") === null);

    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            bubbles: true,
            code: "KeyP",
            ctrlKey: true,
            key: "p",
            shiftKey: true,
        }),
    );
    const commandPaletteInput = screen.host.querySelector<HTMLInputElement>(
        ".tc-command-palette-input",
    );
    assert(commandPaletteInput);
    commandPaletteInput.value = "fixture";
    commandPaletteInput.dispatchEvent(new Event("input", { bubbles: true }));
    const updatedCommandPaletteInput = screen.host.querySelector<HTMLInputElement>(
        ".tc-command-palette-input",
    );
    assert(updatedCommandPaletteInput);
    updatedCommandPaletteInput.dispatchEvent(
        new KeyboardEvent("keydown", {
            bubbles: true,
            key: "Enter",
        }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(screen.getBySelector("[data-testid='command-run-count']").textContent, "1");

    const copyButton = screen.getBySelector("[data-slot='snippet-copy']");
    const iconMarkupBefore = copyButton.querySelector("svg")?.innerHTML;
    assertEquals(copyButton.textContent?.trim(), "Copy");
    assertEquals(copyButton.getAttribute("aria-label"), "Copy");

    copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const copyButtonAfter = screen.getBySelector("[data-slot='snippet-copy']");
    const iconMarkupAfter = copyButtonAfter.querySelector("svg")?.innerHTML;

    assertEquals(copyButtonAfter.getAttribute("aria-label"), "Copied");
    assertEquals(copyButtonAfter.textContent?.trim(), "Copied");
    assertEquals(iconMarkupBefore === iconMarkupAfter, false);

    await new Promise((resolve) => setTimeout(resolve, 1300));

    const copyButtonReset = screen.getBySelector("[data-slot='snippet-copy']");
    const iconMarkupReset = copyButtonReset.querySelector("svg")?.innerHTML;
    assertEquals(copyButtonReset.getAttribute("aria-label"), "Copy");
    assertEquals(copyButtonReset.textContent?.trim(), "Copy");
    assert(iconMarkupReset?.includes('fill-rule="evenodd"'));
    assert(iconMarkupBefore?.includes('fill-rule="evenodd"'));

    screen.getBySelector("[data-testid='theme-switch'] .tc-theme-switch-trigger").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    const themeSwitchOption = screen.host.querySelector<HTMLElement>(
        ".tc-dropdown-menu-portal .tc-dropdown-item[data-active='false']",
    );
    assert(themeSwitchOption);
    themeSwitchOption.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );
    assert(screen.host.querySelector(".tc-dropdown-menu-portal") === null);

    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='dark-root']").getAttribute(
            "data-typecase-theme",
        ),
        "light",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='dark-root']").getAttribute(
            "data-typecase-theme-preference",
        ),
        "light",
    );

    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='scoped-outer-root']").getAttribute(
            "data-typecase-theme",
        ),
        "dark",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='scoped-inner-root']").getAttribute(
            "data-typecase-theme",
        ),
        "dark",
    );

    screen.getBySelector("[data-testid='scoped-inner-switch'] .tc-theme-switch-trigger")
        .dispatchEvent(
            new MouseEvent("click", { bubbles: true }),
        );
    const scopedInnerSwitchOption = Array.from(
        screen.host.querySelectorAll<HTMLElement>(
            ".tc-dropdown-menu-portal .tc-dropdown-item[data-active='false']",
        ),
    ).at(-1);
    assert(scopedInnerSwitchOption);
    scopedInnerSwitchOption.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
    );

    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='scoped-inner-root']").getAttribute(
            "data-typecase-theme",
        ),
        "light",
    );
    assertEquals(
        screen.getBySelector(".typecase-root[data-testid='scoped-outer-root']").getAttribute(
            "data-typecase-theme",
        ),
        "dark",
    );

    screen.cleanup();
});

Deno.test("typecase/render: should support the dark theme and layout components", () => {
    const screen = renderMainzComponent(fixtures.TypecaseRenderFixture);

    const darkRoot = screen.getBySelector(".typecase-root[data-testid='dark-preview-root']");
    assertEquals(darkRoot.getAttribute("data-typecase-theme"), "dark");
    assertStringIncludes(darkRoot.getAttribute("style") ?? "", "--tc-card-bg: #111b2e");
    assertStringIncludes(darkRoot.getAttribute("style") ?? "", "color-scheme: dark");

    assertEquals(
        screen.getBySelector("[data-testid='dark-preview-title']").textContent,
        "Dark theme preview",
    );
    assertEquals(screen.getBySelector(".tc-meta-table-row").children.length, 2);
    assertEquals(
        screen.getBySelector("[data-testid='dark-preview-link']").getAttribute("href"),
        "/news",
    );

    screen.cleanup();
});
