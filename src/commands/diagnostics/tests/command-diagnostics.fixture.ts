import { defineApp, defineCommand } from "../../../index.ts";

export const duplicatePrimaryCommand = defineCommand({
    id: "docs.search.open",
    execute: () => true,
});

export const duplicateSecondaryCommand = defineCommand({
    id: "docs.search.open",
    execute: () => true,
});

export const uniqueCommand = defineCommand({
    id: "docs.help.open",
    execute: () => true,
});

export const duplicateCommandApp = defineApp({
    id: "docs-app",
    root: class DuplicateCommandRoot extends HTMLElement {},
    commands: [duplicatePrimaryCommand, duplicateSecondaryCommand, uniqueCommand],
});

export const uniqueCommandApp = defineApp({
    id: "guides-app",
    root: class UniqueCommandRoot extends HTMLElement {},
    commands: [uniqueCommand],
});
