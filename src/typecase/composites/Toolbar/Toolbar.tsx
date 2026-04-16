import { joinClassNames } from "../../utils/class-name.ts";

type ToolbarSectionProps = {
    children?: unknown;
    className?: string;
    style?: string;
    [key: string]: unknown;
};

export type ToolbarSize = "sm" | "md";

export interface ToolbarProps extends ToolbarSectionProps {
    open?: boolean;
    size?: ToolbarSize;
}

export interface ToolbarButtonProps extends ToolbarSectionProps {
    active?: boolean;
    onSelect?: (event: Event) => void;
}

function ToolbarRoot(props: ToolbarProps) {
    const { children, className, open = true, size = "md", style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-toolbar", className)}
            data-open={open ? "true" : "false"}
            data-size={size}
            role="toolbar"
            style={style}
        >
            {children}
        </div>
    );
}

function ToolbarGroup(props: ToolbarSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <div
            {...rest}
            className={joinClassNames("tc-toolbar-group", className)}
            role="group"
            style={style}
        >
            {children}
        </div>
    );
}

function ToolbarSeparator(props: ToolbarSectionProps) {
    const { children, className, style, ...rest } = props;

    return (
        <span
            {...rest}
            aria-hidden="true"
            className={joinClassNames("tc-toolbar-separator", className)}
            style={style}
        >
            {children}
        </span>
    );
}

function ToolbarButton(props: ToolbarButtonProps) {
    const {
        active = false,
        children,
        className,
        onSelect,
        style,
        ...rest
    } = props;

    return (
        <button
            {...rest}
            aria-pressed={active ? "true" : "false"}
            className={joinClassNames("tc-toolbar-button", className)}
            data-active={active ? "true" : "false"}
            onClick={onSelect}
            style={style}
            type="button"
        >
            {children}
        </button>
    );
}

export const Toolbar = Object.assign(ToolbarRoot, {
    Button: ToolbarButton,
    Group: ToolbarGroup,
    Separator: ToolbarSeparator,
});
