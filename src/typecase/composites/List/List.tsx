import { joinClassNames } from "../../utils/class-name.ts";
import { mergeStyleAttributes, toStyleAttribute } from "../../utils/theme-style.ts";

type ListTag = "ul" | "ol";
type ListGap = "sm" | "md" | "lg" | string;
type ListVariant = "default" | "nav";
type ListItemTag = "li" | "div";

const gapMap: Record<string, string> = {
    "sm": "0.375rem",
    "md": "0.5rem",
    "lg": "0.75rem",
};

export interface ListProps {
    as?: ListTag;
    children?: unknown;
    className?: string;
    gap?: ListGap;
    style?: string;
    variant?: ListVariant;
    [key: string]: unknown;
}

export interface ListItemProps {
    active?: boolean;
    as?: ListItemTag;
    children?: unknown;
    className?: string;
    href?: string;
    style?: string;
    [key: string]: unknown;
}

export function List(props: ListProps) {
    const {
        as = "ul",
        children,
        className,
        gap = "md",
        style,
        variant = "default",
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-list", className)}
            data-variant={variant}
            style={mergeStyleAttributes(
                toStyleAttribute({
                    "--tc-list-gap": gapMap[gap] ?? gap,
                }),
                style,
            )}
        >
            {children}
        </Tag>
    );
}

export function ListItem(props: ListItemProps) {
    const {
        active = false,
        as = "li",
        children,
        className,
        href,
        style,
        ...rest
    } = props;

    const Tag = as;

    return (
        <Tag
            {...rest}
            className={joinClassNames("tc-list-item", className)}
            data-active={active ? "true" : "false"}
            style={style}
        >
            {href
                ? (
                    <a
                        aria-current={active ? "page" : undefined}
                        className="tc-list-item-link"
                        href={href}
                    >
                        {children}
                    </a>
                )
                : <div className="tc-list-item-content">{children}</div>}
        </Tag>
    );
}

List.Item = ListItem;
