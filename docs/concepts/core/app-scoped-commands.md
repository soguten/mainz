---
title: App-Scoped Commands
summary: Register semantic commands on a Mainz app, dispatch them by app, and reuse the same action from keyboard, buttons, menus, or other runtime flows.
---

## Commands are app-scoped semantic actions

Mainz commands model actions first and keyboard shortcuts second.

Use them when the same semantic action should be reachable from more than one place:

- a keyboard shortcut
- a button
- a menu item
- a launcher-style UI
- another runtime flow

Commands belong to one started Mainz app, not to the shared browser document.

That gives Mainz a predictable default on pages with more than one app:

- each app keeps its own command registry
- shortcut dispatch stays inside the current app
- duplicate command ids are diagnosed per app

## Commands are registered on the app

Register commands with `defineCommand(...)` and attach them through `defineApp({ commands: [...] })`:

```ts title="app.ts"
import { defineApp, defineCommand } from "mainz";
import { singleton } from "mainz/di";
import { DocsSearchController } from "./DocsSearchController.ts";

class DocsSearchController {
    show(initialQuery = "") {
        console.log("open search", initialQuery);
    }
}

export const openDocsSearchCommand = defineCommand({
    id: "docs.search.open",
    title: "Search documentation",
    shortcuts: ["Mod+K"],
    execute: ({ payload, services }) => {
        const initialQuery = typeof payload === "object" &&
                payload !== null &&
                "initialQuery" in payload &&
                typeof payload.initialQuery === "string"
            ? payload.initialQuery
            : "";

        services.get(DocsSearchController).show(initialQuery);
    },
});

export const app = defineApp({
    id: "docs-site",
    services: [singleton(DocsSearchController)],
    commands: [openDocsSearchCommand],
});
```

When a command benefits from typed input, give `defineCommand(...)` a payload type:

```ts
type OpenDocsSearchPayload = {
    initialQuery?: string;
};

export const openDocsSearchCommand = defineCommand<OpenDocsSearchPayload>({
    id: "docs.search.open",
    title: "Search documentation",
    shortcuts: ["Mod+K"],
    execute: ({ payload, services }) => {
        services.get(DocsSearchController).show(payload?.initialQuery ?? "");
    },
});
```

This is the recommended shape when:

- the action is app-wide
- keyboard and non-keyboard paths should reuse the same semantic command
- a stable controller or coordinator owns the real behavior

For the controller/coordinator side of that pattern, see [Controllers And Coordinators](./controllers-and-coordinators.md).

The `services` value in command execution context is the app DI container, so command functions can
call `services.get(...)` directly. Use `inject(...)` in Mainz classes; use `services.get(...)` in
command functions.

## `when(...)` gates eligibility and `execute(...)` performs the action

Commands can declare an optional `when(context)` predicate.

If `when(...)` is omitted, Mainz treats it as `true`.

Use it to keep execution eligibility separate from the action body:

```ts
export const toggleBoldCommand = defineCommand({
    id: "editor.selection.bold",
    title: "Bold",
    shortcuts: ["Mod+B"],
    when: () => hasSelection(),
    execute: () => {
        toggleBoldOnSelection();
        return true;
    },
});
```

This keeps the contract simple:

- `shortcuts` describes how keyboard dispatch reaches the command
- `when(context)` decides whether the command is eligible right now
- `execute(context)` performs the action

If `when(context)` returns `false`, Mainz does not execute the command and `runCommand(...)` returns `false`.

## `runCommand(...)` reuses the same action from other event sources

`runCommand(...)` lets other UI or runtime paths trigger the same command:

```tsx title="DocsToolbar.tsx"
import { Button, runCommand } from "mainz";

<Button
    onClick={(event) =>
        runCommand("docs.search.open", {
            triggerEvent: event,
            payload: {
                initialQuery: "routing",
            },
        })}
>
    Search docs
</Button>;
```

Callers can also opt into the same payload type when they want stronger authoring help:

```ts
runCommand<OpenDocsSearchPayload>("docs.search.open", {
    payload: {
        initialQuery: "routing",
    },
});
```

This avoids duplicating the action in both the button and the keyboard path.

## Detached execution can pass `appId`

`runCommand(...)` resolves the current app implicitly when it can:

- from `appId`, when provided explicitly
- from `triggerEvent`, when the event target belongs to an app
- from the current active element, when focus lives inside an app
- from the document, only when exactly one app is active

For detached flows such as `setTimeout(...)`, pass the app id explicitly:

```ts
setTimeout(() => {
    runCommand("docs.search.open", {
        appId: "docs-site",
        payload: {
            initialQuery: "authorization",
        },
    });
}, 0);
```

If Mainz cannot resolve exactly one app, or cannot find the command id in that app, `runCommand(...)` throws.

If the command is found but `when(context)` returns `false`, `runCommand(...)` returns `false`.

## Shortcut bindings are simple chord strings

Commands do not need a shortcut.

When you do provide one, Mainz uses the same semantic chord vocabulary already shared with Typecase:

- `Mod+K`
- `Shift+Mod+P`
- `Alt+ArrowDown`

Shortcut bindings are plain strings. Eligibility belongs to `when(context)`, not to the shortcut shape.

Mainz root does not expose a public shortcut helper surface. When UI needs shortcut rendering or
shortcut-focused utilities, that public surface lives in Typecase.

## Commands stay inside one app boundary

The registry is app-scoped by default.

That means:

- command ids are unique per app
- diagnostics can report duplicate stable ids in one app definition
- two different apps can use the same command id or shortcut without sharing dispatch

Mainz keeps the browser document as the physical source of keyboard events, but command routing and
resolution happen inside the current app boundary.
