import {
    listCommands,
    type ListedMainzCommand,
    runCommand,
} from "../../../commands/index.ts";
import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Palette, Stack } from "../../composites/index.ts";
import { SearchIcon } from "../../icons/index.ts";
import { Button, Input, Shortcut, Text } from "../../primitives/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";
import {
    matchesShortcut,
    type ShortcutChord,
    type ShortcutPlatform,
} from "../../utils/shortcut.ts";

interface CommandLauncherItem {
    commandId: string;
    keywords?: readonly string[];
    section?: string;
    shortcutLabel?: string;
    summary?: string;
    title: string;
}

export interface CommandLauncherProps {
    className?: string;
    emptyLabel?: string;
    maxResults?: number;
    placeholder?: string;
    searchLabel?: string;
    shortcut?: ShortcutChord;
    shortcutPlatform?: ShortcutPlatform;
    style?: string;
    triggerLabel?: string;
    [key: string]: unknown;
}

interface CommandLauncherState {
    activeIndex: number;
    open: boolean;
    query: string;
}

let commandLauncherId = 0;

export class CommandLauncher extends Component<CommandLauncherProps, CommandLauncherState> {
    private readonly inputId = `tc-command-launcher-${++commandLauncherId}`;
    private shouldFocusInput = false;

    protected override initState(): CommandLauncherState {
        return {
            activeIndex: 0,
            open: false,
            query: "",
        };
    }

    override afterRender(): void {
        if (!this.shouldFocusInput) {
            return;
        }

        this.shouldFocusInput = false;
        const input = this.ownerDocument.getElementById(this.inputId);

        if (input instanceof HTMLInputElement) {
            input.focus();
            input.select();
        }
    }

    override onMount(): void {
        this.registerDOMEvent(
            this.ownerDocument.defaultView ?? this.ownerDocument,
            "keydown",
            this.handleDocumentKeyDown,
            true,
        );
    }

    private getItems(): CommandLauncherItem[] {
        try {
            return listCommands()
                .filter((command) =>
                    typeof command.title === "string" && command.title.trim().length > 0
                )
                .map((command) => this.toItem(command));
        } catch {
            return [];
        }
    }

    private toItem(command: ListedMainzCommand): CommandLauncherItem {
        const shortcutLabel = command.shortcuts
            .find((shortcut) => shortcut.trim().length > 0);

        return {
            commandId: command.id,
            keywords: [command.id],
            section: "Commands",
            shortcutLabel,
            summary: command.description,
            title: command.title ?? command.id,
        };
    }

    private getResults(): CommandLauncherItem[] {
        const maxResults = this.props.maxResults ?? 8;
        const normalizedQuery = this.state.query.trim().toLocaleLowerCase();
        const entries = this.getItems();
        const filteredEntries = normalizedQuery
            ? entries.filter((item) => this.matchesQuery(item, normalizedQuery))
            : entries;

        return filteredEntries.slice(0, maxResults);
    }

    private matchesQuery(item: CommandLauncherItem, query: string): boolean {
        return [
            item.title,
            item.summary,
            item.section,
            item.commandId,
            item.shortcutLabel,
            ...(item.keywords ?? []),
        ].filter((value): value is string => typeof value === "string")
            .some((value) => value.toLocaleLowerCase().includes(query));
    }

    private open = (): void => {
        this.shouldFocusInput = true;
        this.setState({
            activeIndex: 0,
            open: true,
            query: this.state.query,
        });
    };

    private close = (): void => {
        this.setState({
            activeIndex: 0,
            open: false,
            query: "",
        });
    };

    private executeResult(result: CommandLauncherItem): void {
        runCommand(result.commandId);
        this.close();
    }

    private handleBackdropClick = (event: Event): void => {
        if (event.target === event.currentTarget) {
            this.close();
        }
    };

    private handleInput = (event: Event): void => {
        const target = event.currentTarget;

        if (!(target instanceof HTMLInputElement)) {
            return;
        }

        this.setState({
            activeIndex: 0,
            query: target.value,
        });
    };

    private handleInputKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) {
            return;
        }

        const results = this.getResults();

        if (event.key === "Escape") {
            event.preventDefault();
            this.close();
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.setState({
                activeIndex: Math.min(this.state.activeIndex + 1, Math.max(results.length - 1, 0)),
            });
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.setState({
                activeIndex: Math.max(this.state.activeIndex - 1, 0),
            });
            return;
        }

        if (event.key === "Enter" && results[this.state.activeIndex]) {
            event.preventDefault();
            this.executeResult(results[this.state.activeIndex]);
        }
    };

    private handleResultClick = (result: CommandLauncherItem) => (event: Event): void => {
        event.preventDefault();
        this.executeResult(result);
    };

    private handleDocumentKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) {
            return;
        }

        const shortcut = this.props.shortcut ?? "Mod+K";
        if (this.state.open) {
            if (event.key !== "Escape") {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            this.close();
            return;
        }

        if (!shortcut || !matchesShortcut(event, shortcut)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        this.open();
    };

    override render(): HTMLElement | DocumentFragment {
        const {
            className,
            emptyLabel = "No commands found.",
            maxResults: _maxResults,
            placeholder = "Search commands...",
            searchLabel = "Commands",
            shortcut = "Mod+K",
            shortcutPlatform = "auto",
            style,
            triggerLabel = "Run command...",
            ...rest
        } = this.props;
        const results = this.getResults();

        return (
            <div
                {...rest}
                className={joinClassNames("tc-command-palette-search", className)}
                style={style}
            >
                <Button
                    aria-haspopup="dialog"
                    className="tc-command-palette-search-trigger"
                    onClick={this.open}
                    size="sm"
                    type="button"
                    variant="ghost"
                >
                    <span className="tc-command-palette-search-trigger-main">
                        <SearchIcon aria-hidden="true" size={15} />
                        <span className="tc-command-palette-search-trigger-label">
                            {triggerLabel}
                        </span>
                    </span>
                    <span className="tc-command-palette-search-trigger-shortcut">
                        <Shortcut
                            chord={shortcut}
                            className="tc-command-palette-shortcut"
                            platform={shortcutPlatform}
                            size="sm"
                        />
                    </span>
                </Button>

                {this.state.open
                    ? (
                        <>
                            <Portal>
                                <div {...getTypecaseRootShellProps(this)}>
                                    <Palette open>
                                        <Palette.Dialog
                                            label={searchLabel}
                                            onBackdropClick={this.handleBackdropClick}
                                        >
                                            <Palette.Panel>
                                                <Stack gap="md">
                                                    <Palette.InputShell>
                                                        <SearchIcon
                                                            aria-hidden="true"
                                                            className="tc-command-palette-input-icon"
                                                            size={18}
                                                        />
                                                        <Input
                                                            aria-label={searchLabel}
                                                            className="tc-command-palette-input"
                                                            id={this.inputId}
                                                            onInput={this.handleInput}
                                                            onKeyDown={this.handleInputKeyDown}
                                                            placeholder={placeholder}
                                                            size="lg"
                                                            value={this.state.query}
                                                        />
                                                    </Palette.InputShell>
                                                    <Palette.Results>
                                                        {results.length > 0
                                                            ? results.map((result, index) => (
                                                                <Palette.Item
                                                                    active={index ===
                                                                        this.state.activeIndex}
                                                                    href="#"
                                                                    onSelect={this
                                                                        .handleResultClick(result)}
                                                                >
                                                                    <span className="tc-command-palette-item-title">
                                                                        {result.title}
                                                                    </span>
                                                                    {result.summary
                                                                        ? (
                                                                            <span className="tc-command-palette-item-summary">
                                                                                {result.summary}
                                                                            </span>
                                                                        )
                                                                        : null}
                                                                    {result.section
                                                                        ? (
                                                                            <span className="tc-command-palette-item-section">
                                                                                {result.section}
                                                                            </span>
                                                                        )
                                                                        : null}
                                                                    {result.shortcutLabel
                                                                        ? (
                                                                            <span className="tc-command-palette-item-section">
                                                                                {result
                                                                                    .shortcutLabel}
                                                                            </span>
                                                                        )
                                                                        : null}
                                                                </Palette.Item>
                                                            ))
                                                            : <Text tone="muted">{emptyLabel}
                                                            </Text>}
                                                    </Palette.Results>
                                                </Stack>
                                            </Palette.Panel>
                                        </Palette.Dialog>
                                    </Palette>
                                </div>
                            </Portal>
                        </>
                    )
                    : null}
            </div>
        );
    }
}
