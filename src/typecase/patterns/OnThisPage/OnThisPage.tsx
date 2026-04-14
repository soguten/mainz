import { Component } from "../../../components/index.ts";
import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

export interface OnThisPageItem {
    href?: string;
    id?: string;
    items?: readonly OnThisPageItem[];
    label: string;
}

export interface OnThisPageProps {
    className?: string;
    items: readonly OnThisPageItem[];
    maxHeight?: string;
    style?: string;
    title?: string;
    [key: string]: unknown;
}

interface OnThisPageState {
    activeHref: string | null;
}

function normalizeHref(item: OnThisPageItem): string | null {
    if (typeof item.href === "string" && item.href.length > 0) {
        return item.href;
    }

    if (typeof item.id === "string" && item.id.length > 0) {
        return `#${item.id}`;
    }

    return null;
}

function flattenHrefs(items: readonly OnThisPageItem[]): string[] {
    const hrefs: string[] = [];

    for (const item of items) {
        const href = normalizeHref(item);

        if (href) {
            hrefs.push(href);
        }

        if (item.items?.length) {
            hrefs.push(...flattenHrefs(item.items));
        }
    }

    return hrefs;
}

function findFirstHref(items: readonly OnThisPageItem[]): string | null {
    for (const item of items) {
        const href = normalizeHref(item);

        if (href) {
            return href;
        }

        if (item.items?.length) {
            const nestedHref = findFirstHref(item.items);

            if (nestedHref) {
                return nestedHref;
            }
        }
    }

    return null;
}

function getCurrentHash(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return window.location.hash.length > 0 ? window.location.hash : null;
}

export class OnThisPage extends Component<OnThisPageProps, OnThisPageState> {
    protected override initState(): OnThisPageState {
        return {
            activeHref: this.resolveActiveHref(),
        };
    }

    override onMount(): void {
        if (typeof window === "undefined") {
            return;
        }

        this.registerDOMEvent(window, "hashchange", this.handleHashChange);
    }

    private resolveActiveHref(): string | null {
        const currentHash = getCurrentHash();
        const hrefs = flattenHrefs(this.props.items);

        if (currentHash && hrefs.includes(currentHash)) {
            return currentHash;
        }

        return findFirstHref(this.props.items);
    }

    private handleHashChange = (): void => {
        this.setState({
            activeHref: this.resolveActiveHref(),
        });
    };

    private handleItemClick = (href: string | null): void => {
        if (!href) {
            return;
        }

        this.setState({
            activeHref: href,
        });
    };

    private renderItems(items: readonly OnThisPageItem[], depth = 0): unknown {
        return (
            <ul className="tc-on-this-page-list" data-depth={String(depth)}>
                {items.map((item) => {
                    const href = normalizeHref(item);
                    const active = href != null && href === this.state.activeHref;

                    return (
                        <li className="tc-on-this-page-item" data-active={active ? "true" : "false"}>
                            {href
                                ? (
                                    <a
                                        aria-current={active ? "location" : undefined}
                                        className="tc-on-this-page-link"
                                        href={href}
                                        onClick={() => this.handleItemClick(href)}
                                    >
                                        {item.label}
                                    </a>
                                )
                                : <span className="tc-on-this-page-link">{item.label}</span>}

                            {item.items?.length
                                ? this.renderItems(item.items, depth + 1)
                                : null}
                        </li>
                    );
                })}
            </ul>
        );
    }

    override render(): HTMLElement | DocumentFragment {
        const {
            className,
            items,
            maxHeight,
            style,
            title,
            ...rest
        } = this.props;

        return (
            <nav
                {...rest}
                aria-label={title ?? "On this page"}
                className={joinClassNames("tc-on-this-page", className)}
                style={mergeStyleAttributes(
                    toStyleAttribute({
                        "--tc-on-this-page-max-height": maxHeight ?? "none",
                    }),
                    style,
                )}
            >
                <div className="tc-on-this-page-heading">
                    {title ?? "On this page"}
                </div>
                {this.renderItems(items)}
            </nav>
        );
    }
}
