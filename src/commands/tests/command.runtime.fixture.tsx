import { Component, defineApp, defineCommand } from "mainz";
import { singleton } from "mainz/di";

export const commandLog: string[] = [];
export let leftButton: HTMLButtonElement | undefined;
export let rightButton: HTMLButtonElement | undefined;
export let guardedButton: HTMLButtonElement | undefined;
let guardedShortcutReady = false;

export function resetCommandFixtures(): void {
    commandLog.length = 0;
    leftButton = undefined;
    rightButton = undefined;
    guardedButton = undefined;
    guardedShortcutReady = false;
}

class LeftRoot extends Component {
    override render() {
        return (
            <button ref={(element: Element) => leftButton = element as HTMLButtonElement}>
                Left
            </button>
        );
    }
}

class RightRoot extends Component {
    override render() {
        return (
            <button ref={(element: Element) => rightButton = element as HTMLButtonElement}>
                Right
            </button>
        );
    }
}

class StableRoot extends Component {
    override render() {
        return <button data-testid="stable-root">Stable</button>;
    }
}

class StableCommandController {
    open(payload = ""): void {
        commandLog.push(`stable:${payload}`);
    }
}

class GuardedRoot extends Component {
    override render() {
        return (
            <>
                <button ref={(element: Element) => guardedButton = element as HTMLButtonElement}>
                    Guarded
                </button>
                <button
                    data-testid="enable-guard"
                    onClick={() => {
                        guardedShortcutReady = true;
                    }}
                >
                    Enable
                </button>
            </>
        );
    }
}

class DuplicateRoot extends Component {
    override render() {
        return <button data-testid="duplicate-root">Duplicate</button>;
    }
}

export const LeftCommandApp = defineApp({
    id: "left-app",
    root: LeftRoot,
    commands: [
        defineCommand({
            id: "docs.search.open",
            shortcuts: ["Mod+K"],
            execute: () => {
                commandLog.push("left");
            },
        }),
    ],
});

export const RightCommandApp = defineApp({
    id: "right-app",
    root: RightRoot,
    commands: [
        defineCommand({
            id: "docs.search.open",
            shortcuts: ["Mod+K"],
            execute: () => {
                commandLog.push("right");
            },
        }),
    ],
});

export const StableCommandApp = defineApp({
    id: "stable-app",
    root: StableRoot,
    services: [singleton(StableCommandController)],
    commands: [
        defineCommand<string>({
            id: "stable.search.open",
            title: "Open stable search",
            description: "Open the stable command search flow.",
            shortcuts: ["Mod+K"],
            execute: ({ payload, services }) => {
                services.get(StableCommandController).open(payload ?? "");
            },
        }),
        defineCommand({
            id: "stable.selection.bold",
            shortcuts: ["Mod+B"],
            when: ({ payload }) => payload === "selected",
            execute: ({ payload }) => {
                commandLog.push(`bold:${String(payload)}`);
                return true;
            },
        }),
    ],
});

export const GuardedCommandApp = defineApp({
    id: "guarded-app",
    root: GuardedRoot,
    commands: [
        defineCommand({
            id: "guarded.search",
            shortcuts: ["Mod+K"],
            when: () => guardedShortcutReady,
            execute: () => {
                commandLog.push("guarded");
            },
        }),
    ],
});

export const DuplicateCommandApp = defineApp({
    id: "duplicate-app",
    root: DuplicateRoot,
    commands: [
        defineCommand({
            id: "duplicate.command",
            execute: () => true,
        }),
        defineCommand({
            id: "duplicate.command",
            execute: () => true,
        }),
    ],
});
