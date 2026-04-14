import { joinClassNames } from "../../utils/class-name.ts";

export type TabsVariant = "line" | "pills";
export type TabsSize = "sm" | "md";

export interface TabsProps {
    children?: unknown;
    className?: string;
    size?: TabsSize;
    variant?: TabsVariant;
    [key: string]: unknown;
}

export interface TabsListProps {
    children?: unknown;
    className?: string;
    label?: string;
    [key: string]: unknown;
}

export interface TabsTabProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    controls?: string;
    disabled?: boolean;
    href?: string;
    onSelect?: (event: Event) => void;
    type?: "button" | "submit" | "reset";
    [key: string]: unknown;
}

export interface TabsPanelProps {
    active?: boolean;
    children?: unknown;
    className?: string;
    labelledBy?: string;
    [key: string]: unknown;
}

function TabsRoot(props: TabsProps) {
    const {
        children,
        className,
        size = "md",
        variant = "line",
        ...rest
    } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-tabs", className)}
            data-size={size}
            data-variant={variant}
        >
            {children}
        </div>
    );
}

function TabsList(props: TabsListProps) {
    const {
        children,
        className,
        label = "Tabs",
        ...rest
    } = props;

    return (
        <div
            {...rest}
            aria-label={label}
            className={joinClassNames("tc-tabs-list", className)}
            role="tablist"
        >
            {children}
        </div>
    );
}

function TabsTab(props: TabsTabProps) {
    const {
        active = false,
        children,
        className,
        controls,
        disabled = false,
        href,
        onSelect,
        type = "button",
        ...rest
    } = props;

    const commonProps = {
        ...rest,
        "aria-controls": controls,
        "aria-disabled": disabled ? "true" : undefined,
        "aria-selected": active ? "true" : "false",
        className: joinClassNames("tc-tabs-tab", className),
        "data-active": active ? "true" : "false",
        role: "tab",
        tabIndex: active && !disabled ? 0 : -1,
    };

    if (href) {
        return (
            <a {...commonProps} href={disabled ? undefined : href} onClick={onSelect}>
                {children}
            </a>
        );
    }

    return (
        <button
            {...commonProps}
            disabled={disabled}
            onClick={onSelect}
            type={type}
        >
            {children}
        </button>
    );
}

function TabsPanel(props: TabsPanelProps) {
    const {
        active = true,
        children,
        className,
        labelledBy,
        ...rest
    } = props;

    return (
        <div
            {...rest}
            aria-labelledby={labelledBy}
            className={joinClassNames("tc-tabs-panel", className)}
            hidden={!active}
            role="tabpanel"
        >
            {children}
        </div>
    );
}

export const Tabs = Object.assign(TabsRoot, {
    List: TabsList,
    Panel: TabsPanel,
    Tab: TabsTab,
});
