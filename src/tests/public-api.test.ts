/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";

Deno.test("public-api/root: should expose the ownership-based surface without legacy resource exports", async () => {
    const mainz = await import("mainz");

    assertEquals(typeof mainz.Component, "function");
    assertEquals(typeof mainz.Page, "function");
    assertEquals(typeof mainz.RenderStrategy, "function");
    assertEquals(typeof mainz.Authorize, "function");
    assertEquals(typeof mainz.AllowAnonymous, "function");
    assertEquals(typeof mainz.defineCommand, "function");
    assertEquals(typeof mainz.defineApp, "function");
    assertEquals(typeof mainz.listCommands, "function");
    assertEquals(typeof mainz.Portal, "function");
    assertEquals(typeof mainz.runCommand, "function");
    assertEquals(typeof mainz.startApp, "function");
    assertEquals(typeof mainz.startApp, "function");
    assertEquals(typeof mainz.isRouteVisible, "function");
    assertEquals(typeof mainz.filterVisibleRoutes, "function");
    assertEquals(typeof mainz.findMissingAuthorizationPolicies, "function");
    assertEquals(mainz.MAINZ_NAVIGATION_ABORT_EVENT, "mainz:navigationabort");
    assertEquals(mainz.MAINZ_LOCALE_CHANGE_EVENT, "mainz:localechange");
    assertEquals(mainz.MAINZ_NAVIGATION_START_EVENT, "mainz:navigationstart");
    assertEquals(mainz.MAINZ_NAVIGATION_ERROR_EVENT, "mainz:navigationerror");
    assertEquals(mainz.MAINZ_NAVIGATION_READY_EVENT, "mainz:navigationready");

    assertEquals("defineResource" in mainz, false);
    assertEquals("readResource" in mainz, false);
    assertEquals("ResourceAccessError" in mainz, false);
    assertEquals("ComponentResource" in mainz, false);
    assertEquals("ResourceBoundary" in mainz, false);
    assertEquals("ResourceComponent" in mainz, false);
    assertEquals("detectShortcutPlatform" in mainz, false);
    assertEquals("eventToShortcutChord" in mainz, false);
    assertEquals("formatShortcutChord" in mainz, false);
    assertEquals("matchesShortcut" in mainz, false);
    assertEquals("normalizeShortcutChord" in mainz, false);
});

Deno.test("public-api/components: should keep the main components barrel ownership-first", async () => {
    const components = await import("../components/index.ts");

    assertEquals(typeof components.Component, "function");
    assertEquals(typeof components.Page, "function");
    assertEquals(typeof components.RenderStrategy, "function");
    assertEquals(typeof components.Authorize, "function");
    assertEquals(typeof components.AllowAnonymous, "function");
    assertEquals(typeof components.ensureMainzCustomElementDefined, "function");

    assertEquals("ComponentResource" in components, false);
    assertEquals("ResourceBoundary" in components, false);
    assertEquals("ResourceComponent" in components, false);
});

Deno.test("public-api/testing: should expose lifecycle helpers through mainz/testing", async () => {
    const testing = await import("mainz/testing");

    assertEquals(typeof testing.prepareNavigationTest, "function");
    assertEquals(typeof testing.waitForNavigationAbort, "function");
    assertEquals(typeof testing.waitForNavigationStart, "function");
    assertEquals(typeof testing.waitForNavigationError, "function");
    assertEquals(typeof testing.waitForNavigationReady, "function");
});

Deno.test("public-api/di: should expose the DI surface through mainz/di", async () => {
    const di = await import("mainz/di");

    assertEquals(typeof di.inject, "function");
    assertEquals(typeof di.singleton, "function");
    assertEquals(typeof di.transient, "function");
    assertEquals(typeof di.createServiceContainer, "function");
});

Deno.test("public-api/http: should expose the HTTP surface through mainz/http", async () => {
    const http = await import("mainz/http");
    const httpTesting = await import("mainz/http/testing");

    assertEquals(typeof http.HttpClient, "function");
    assertEquals(typeof http.HttpResponseError, "function");
    assertEquals(typeof httpTesting.createMockFetch, "function");
    assertEquals(typeof httpTesting.delayWithSignal, "function");
    assertEquals(typeof httpTesting.jsonResponse, "function");
    assertEquals(typeof httpTesting.textResponse, "function");
    assertEquals(typeof httpTesting.httpError, "function");
    assertEquals(typeof httpTesting.networkError, "function");
    assertEquals(typeof httpTesting.query, "function");
    assertEquals(typeof httpTesting.requestJson, "function");
    assertEquals(typeof httpTesting.sequence, "function");
});

Deno.test("public-api/typecase: should expose the Typecase surface through mainz/typecase", async () => {
    const typecase = await import("mainz/typecase");

    assertEquals(typeof typecase.TypecaseRoot, "function");
    assertEquals(typeof typecase.CheckIcon, "function");
    assertEquals(typeof typecase.ChevronDownIcon, "function");
    assertEquals(typeof typecase.CircleHalfIcon, "function");
    assertEquals(typeof typecase.CopyIcon, "function");
    assertEquals(typeof typecase.Heading3Icon, "function");
    assertEquals(typeof typecase.ListIcon, "function");
    assertEquals(typeof typecase.MoonIcon, "function");
    assertEquals(typeof typecase.SearchIcon, "function");
    assertEquals(typeof typecase.SunIcon, "function");
    assertEquals(typeof typecase.Anchor, "function");
    assertEquals(typeof typecase.Avatar, "function");
    assertEquals(typeof typecase.Badge, "function");
    assertEquals(typeof typecase.Button, "function");
    assertEquals(typeof typecase.Checkbox, "function");
    assertEquals(typeof typecase.Divider, "function");
    assertEquals(typeof typecase.Image, "function");
    assertEquals(typeof typecase.Input, "function");
    assertEquals(typeof typecase.Kbd, "function");
    assertEquals(typeof typecase.Label, "function");
    assertEquals(typeof typecase.Progress, "function");
    assertEquals(typeof typecase.Radio, "function");
    assertEquals(typeof typecase.Select, "function");
    assertEquals(typeof typecase.Skeleton, "function");
    assertEquals(typeof typecase.Shortcut, "function");
    assertEquals(typeof typecase.Spinner, "function");
    assertEquals(typeof typecase.StatusDot, "function");
    assertEquals(typeof typecase.Switch, "function");
    assertEquals(typeof typecase.Text, "function");
    assertEquals(typeof typecase.Textarea, "function");
    assertEquals(typeof typecase.Title, "function");
    assertEquals(typeof typecase.Alert, "function");
    assertEquals(typeof typecase.Accordion, "function");
    assertEquals(typeof typecase.Breadcrumb, "function");
    assertEquals(typeof typecase.Card, "function");
    assertEquals(typeof typecase.Callout, "function");
    assertEquals(typeof typecase.Center, "function");
    assertEquals(typeof typecase.Cluster, "function");
    assertEquals(typeof typecase.CodeBlock, "function");
    assertEquals(typeof typecase.CommandPalette, "function");
    assertEquals(typeof typecase.Container, "function");
    assertEquals(typeof typecase.DescriptionList, "function");
    assertEquals(typeof typecase.Dialog, "function");
    assertEquals(typeof typecase.Dropdown, "function");
    assertEquals(typeof typecase.EmptyState, "function");
    assertEquals(typeof typecase.Field, "function");
    assertEquals(typeof typecase.Fieldset, "function");
    assertEquals(typeof typecase.Figure, "function");
    assertEquals(typeof typecase.Grid, "function");
    assertEquals(typeof typecase.Inset, "function");
    assertEquals(typeof typecase.Inline, "function");
    assertEquals(typeof typecase.LinkBox, "function");
    assertEquals(typeof typecase.List, "function");
    assertEquals(typeof typecase.ListItem, "function");
    assertEquals(typeof typecase.MetaTable, "function");
    assertEquals(typeof typecase.Navbar, "function");
    assertEquals(typeof typecase.Offcanvas, "function");
    assertEquals(typeof typecase.Pagination, "function");
    assertEquals(typeof typecase.Popover, "function");
    assertEquals(typeof typecase.ScrollArea, "function");
    assertEquals(typeof typecase.Screen, "function");
    assertEquals(typeof typecase.Section, "function");
    assertEquals(typeof typecase.Show, "function");
    assertEquals(typeof typecase.Spacer, "function");
    assertEquals(typeof typecase.Split, "function");
    assertEquals(typeof typecase.Stack, "function");
    assertEquals(typeof typecase.Stat, "function");
    assertEquals(typeof typecase.Steps, "function");
    assertEquals(typeof typecase.Surface, "function");
    assertEquals(typeof typecase.Tabs, "function");
    assertEquals(typeof typecase.Table, "function");
    assertEquals(typeof typecase.Toast, "function");
    assertEquals(typeof typecase.Topbar, "function");
    assertEquals(typeof typecase.CommandPaletteSearch, "function");
    assertEquals(typeof typecase.Drawer, "function");
    assertEquals(typeof typecase.DropdownMenu, "function");
    assertEquals(typeof typecase.Modal, "function");
    assertEquals(typeof typecase.OnThisPage, "function");
    assertEquals(typeof typecase.PopoverTrigger, "function");
    assertEquals(typeof typecase.Snippet, "function");
    assertEquals(typeof typecase.ThemeSwitch, "function");
    assertEquals(typeof typecase.Tooltip, "function");
    assertEquals(typeof typecase.detectShortcutPlatform, "function");
    assertEquals(typeof typecase.eventToShortcutChord, "function");
    assertEquals(typeof typecase.formatShortcutChord, "function");
    assertEquals(typeof typecase.matchesShortcut, "function");
    assertEquals(typeof typecase.normalizeShortcutChord, "function");
    assertEquals(typecase.darkTheme.name, "dark");
    assertEquals(typecase.lightTheme.name, "light");
});
