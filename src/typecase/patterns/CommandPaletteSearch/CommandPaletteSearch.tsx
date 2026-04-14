import { Component } from "../../../components/index.ts";
import { Portal } from "../../../portal/index.ts";
import { Button, Input, Shortcut, Text } from "../../primitives/index.ts";
import { CommandPalette, Stack } from "../../composites/index.ts";
import { SearchIcon } from "../../icons/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { getTypecaseRootShellProps } from "../../utils/root-shell.ts";
import {
    matchesShortcut,
    type ShortcutChord,
    type ShortcutPlatform,
} from "../../utils/shortcut.ts";

export interface CommandPaletteSearchItem {
    href: string;
    keywords?: readonly string[];
    section?: string;
    summary?: string;
    title: string;
}

export interface CommandPaletteSearchProps {
    className?: string;
    emptyLabel?: string;
    items: readonly CommandPaletteSearchItem[];
    maxResults?: number;
    placeholder?: string;
    searchLabel?: string;
    shortcut?: ShortcutChord;
    shortcutPlatform?: ShortcutPlatform;
    style?: string;
    triggerLabel?: string;
    [key: string]: unknown;
}

interface CommandPaletteSearchState {
    activeIndex: number;
    open: boolean;
    query: string;
}

let commandPaletteSearchId = 0;

export class CommandPaletteSearch extends Component<
    CommandPaletteSearchProps,
    CommandPaletteSearchState
> {
    private readonly inputId = `tc-command-palette-search-${++commandPaletteSearchId}`;
    private shouldFocusInput = false;

    protected override initState(): CommandPaletteSearchState {
        return {
            activeIndex: 0,
            open: false,
            query: "",
        };
    }

    override onMount(): void {
        this.registerDOMEvent(document, "keydown", this.handleDocumentKeyDown);
    }

    override afterRender(): void {
        this.registerDOMEvent(document, "keydown", this.handleDocumentKeyDown);

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

    private getResults(): CommandPaletteSearchItem[] {
        const maxResults = this.props.maxResults ?? 8;
        const normalizedQuery = this.state.query.trim().toLocaleLowerCase();
        const entries = normalizedQuery
            ? this.props.items.filter((item) => this.matchesQuery(item, normalizedQuery))
            : this.props.items;

        return entries.slice(0, maxResults);
    }

    private matchesQuery(item: CommandPaletteSearchItem, query: string): boolean {
        return [
            item.title,
            item.summary,
            item.section,
            item.href,
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

    private handleDocumentKeyDown = (event: Event): void => {
        if (!(event instanceof KeyboardEvent)) {
            return;
        }

        if (
            matchesShortcut(event, this.props.shortcut ?? "Mod+K", {
                platform: this.props.shortcutPlatform,
            })
        ) {
            event.preventDefault();
            this.open();
            return;
        }

        if (event.key === "Escape" && this.state.open) {
            event.preventDefault();
            this.close();
        }
    };

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
            globalThis.location.href = results[this.state.activeIndex].href;
        }
    };

    private handleResultClick = (): void => {
        this.close();
    };

    override render(): HTMLElement | DocumentFragment {
        const {
            className,
            emptyLabel = "No results found.",
            items: _items,
            maxResults: _maxResults,
            placeholder = "Search...",
            searchLabel = "Search",
            shortcut = "Mod+K",
            shortcutPlatform = "auto",
            style,
            triggerLabel = "Search...",
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
                        <Portal>
                            <div {...getTypecaseRootShellProps(this)}>
                                <CommandPalette open>
                                    <CommandPalette.Dialog
                                        label={searchLabel}
                                        onBackdropClick={this.handleBackdropClick}
                                    >
                                        <CommandPalette.Panel>
                                            <Stack gap="md">
                                                <CommandPalette.InputShell>
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
                                                </CommandPalette.InputShell>
                                                <CommandPalette.Results>
                                                    {results.length > 0
                                                        ? results.map((result, index) => (
                                                            <CommandPalette.Item
                                                                active={index ===
                                                                    this.state.activeIndex}
                                                                href={result.href}
                                                                onSelect={this.handleResultClick}
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
                                                            </CommandPalette.Item>
                                                        ))
                                                        : <Text tone="muted">{emptyLabel}</Text>}
                                                </CommandPalette.Results>
                                            </Stack>
                                        </CommandPalette.Panel>
                                    </CommandPalette.Dialog>
                                </CommandPalette>
                            </div>
                        </Portal>
                    )
                    : null}
            </div>
        );
    }
}
